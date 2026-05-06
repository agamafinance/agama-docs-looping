# Settlement Vault: Overview

!!! note

    The `AgamaSettlementVault` is the Agama-specific primitive that bridges seized RWA collateral back into USDr. It exists because Rayls has no DEX for AmFi tokens, so we cannot liquidate through an on-chain swap.

## Problem

After `SP.liquidateBorrower()`, the Stability Pool holds AmFi senior tranche tokens. Without an on-chain market:

- Stability Pool depositors cannot simply be repaid in USDr.
- The only legitimate path from RWA to USDr is **issuer redemption**, which is off-chain and takes D+15 (AmFi) or longer depending on the issuer.
- Distributing RWA tokens in-kind to retail Stability Pool depositors is unattractive: most cannot hold or redeem them with the issuer directly.

## Solution: auto-reconstituting Stability Pool

The Settlement Vault:

1. Takes custody of seized RWA.
2. Applies a configurable `LiquidationSplit` (treasury / reserve / redeem / in-kind).
3. Queues the `redeemBps` bucket for manager-executed off-chain redemption.
4. On redemption settlement, **automatically re-deposits the recovered USDr into the Lending Pool on the Stability Pool's behalf**, restoring the Stability Pool's `agTOKEN` position and lifting `agaSP`'s share price by any excess pro-rata.
5. Maintains an escape hatch (`emergencyDistributeInKind`) if the manager is inactive beyond `staleBatchPeriod` (60 days).

### Key simplification

Rather than distributing USDr per depositor via individual claims (which would require per-deposit balance snapshots), the Settlement Vault funnels recovered USDr back into the Lending Pool, minting fresh `agYLD` to the Stability Pool. Every `sagYLD` holder benefits proportionally **through the rising share price**: no individual claim mechanism needed. The same `depositOnBehalf` rail also distributes the liquidation premium: both the peg-gap repayment and any surplus land in the SP, the share price lifts, and all holders earn pro-rata to their stake.

The Reserve Fund participates in the Stability Pool as a staker like any other, earning pro-rata yields on the capital it has deposited there. There is no privileged slice routed to it from the surplus.

This simplification drops an entire `ClaimSettlement` contract from V1 scope.

## Flow

The split is applied to **USDr at settlement**, not to RWA at seizure. `handleSeizure` queues the entire seized batch unchanged; `settleRedemption` decides how to split the USDr proceeds.

```
LiquidationProxy.liquidate()
  │
  ├─ LendingPool.liquidate (collateral → SP, scoped debt burned, agYLD whole)
  │
  └─ SP transfers seized RWA → SettlementVault.handleSeizure(adapter, data, seized, debt)
       │
       ├─ records Batch { id, asset, rwaAmount = seized, pegGap = debt, queuedAt }
       │     (no split here — the entire seized batch sits in the vault)
       │
       └─ emits BatchQueued(id, asset, rwaAmount, queuedAt, pegGap)

(off-chain, ~15 days)

Manager redeems the batch with the issuer → receives USDr
Manager → SettlementVault.settleRedemption(batchId, usdrReceived)
  │
  ├─ apply LiquidationSplit on the USDr proceeds:
  │     toTreasury = usdrReceived × treasuryBps / 10000   → Treasury.deposit(USDr, toTreasury)
  │     toSP       = usdrReceived − toTreasury            → LendingPool.depositOnBehalf(SP, toSP)
  │                                                          → fresh agYLD minted to the SP
  │                                                          → sagYLD share price lifts pro-rata
  │
  ├─ shortfall = max(0, batch.pegGap − usdrReceived)
  │     if shortfall > 0: bad debt is socialised via LP.redistributeBadDebt
  │                       (Liquity O(1) across active borrowers; the RF takes the
  │                        largest share of any SP dilution before that path because
  │                        it's the largest single SP staker)
  │
  ├─ leftover RWA in the vault is swept to address(0xdead)
  │     (the on-chain RWA position is closed, the issuer holds the off-chain asset)
  │
  └─ batch.status = Settled
```

## LiquidationSplit calibration

The struct has two fields in V1 — by design. There is no separate `reserveFundBps` slice (RF earns through its SP stake) and no `inKindBps` slice (in-kind exit is handled by the [emergency escape hatch](#escape-hatch), not the normal path).

```solidity
struct LiquidationSplit {
    uint16 treasuryBps;
    uint16 redeemBps;   // must satisfy treasuryBps + redeemBps == 10_000, redeemBps ≥ 5_000
}
```

| Bucket | V1 Default | Reasoning |
|---|---:|---|
| `treasuryBps` | 200 (2%) | Small operational allocation. |
| `redeemBps` | 9800 (98%) | Maximise USDr recovery to refill the Stability Pool. |

Numbers should be re-calibrated after the first 10 mainnet liquidations, based on realised redemption fees and timing.

## Escape hatch

If Manager doesn't settle within `staleBatchPeriod` (60 days):

```solidity
function emergencyDistributeInKind(uint256 batchId) external {
    Batch storage b = batches[batchId];
    require(block.timestamp > b.queuedAt + staleBatchPeriod, "NotStale");
    require(b.status == Status.Queued, "AlreadySettled");

    // Distribute pro-rata to sagYLD holders at batch.snapshotBlock
    // via sagYLD's ERC20Votes-based getPastVotes mechanism.
    b.status = Status.EmergencyDistributed;
    ...
}
```

!!! warning

    Governance is actively trying to avoid triggering this path: it leaves retail Stability Pool depositors holding RWA tokens they may not be able to redeem themselves. It exists to prevent total manager capture, not as a normal exit.

Continue to [Functions](functions.md) for the complete interface.
