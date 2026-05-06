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

Rather than distributing USDr per depositor via individual claims (which would require per-deposit balance snapshots), the Settlement Vault funnels recovered USDr back into the Lending Pool, minting fresh `agTOKEN` to the Stability Pool. Every `agaSP` holder benefits proportionally **through the rising share price**: no individual claim mechanism needed. The same `depositOnBehalf` rail also distributes the liquidation bonus (the `excess` bucket): both the peg-gap repayment and the surplus land in the SP, the share price lifts, and all holders earn pro-rata to their stake.

The Reserve Fund participates in the Stability Pool as a staker like any other, earning pro-rata yields on the capital it has deposited there. There is no privileged slice routed to it from the excess.

This simplification drops an entire `ClaimSettlement` contract from V1 scope.

## Flow

```
SP.liquidateBorrower()
  │
  ├─ LendingPool.liquidate (collateral → SP, debt burned, agYLD whole)
  │
  └─ SP transfers seized RWA → SettlementVault.handleSeizure(adapter, data, seized, pegGap)
       │
       ├─ applies LiquidationSplit:
       │     T = seized × treasuryBps    / 10000   → Treasury.deposit(asset, T)
       │     R = seized × redeemBps      / 10000   → queued in Batch{id, R}
       │     K = seized × inKindBps      / 10000   → (V1 = 0) reserved for V2
       │     (V1 reserveFundBps = 0; the Reserve Fund earns via its SP stake)
       │
       ├─ emits BatchQueued(id, asset, R, block.timestamp, pegGap)
       │
       └─ pegGap saved on the batch for settlement reconciliation

(off-chain, days to weeks)

Manager completes AmFi redemption → receives USDr
Manager → SettlementVault.settleRedemption(batchId, usdrReceived)
  │
  ├─ toSP = min(usdrReceived, batch.pegGap)
  │     USDr.approve(LendingPool, toSP)
  │     LendingPool.depositOnBehalf(SP, toSP)
  │     → agTOKEN minted to SP → peg restored by `toSP`
  │
  ├─ excess = usdrReceived − toSP
  │     if excess > 0: routed per ExcessPolicy (V1: 100% → SP via depositOnBehalf)
  │     → fresh agTOKEN minted to the SP, agaSP share price lifts pro-rata
  │
  ├─ shortfall = max(0, pegGap − usdrReceived)
  │     if shortfall > 0: ReserveFund.coverShortfall(shortfall)
  │     if still insufficient: LendingPool.redistributeBadDebt(remaining)
  │
  └─ batch.status = Settled
```

## LiquidationSplit calibration

Default V1 values:

| Bucket             | V1 Default | Reasoning                                                                       |
|--------------------|-----------:|---------------------------------------------------------------------------------|
| `treasuryBps`      |  200 (2%)  | Small operational allocation.                                                   |
| `reserveFundBps`   |    0 (0%)  | No continuous funding in V1. The Reserve Fund is seeded once at testnet launch and earns pro-rata via its SP stake. |
| `redeemBps`        | 9800 (98%) | Maximize USDr recovery to restore the Stability Pool peg.                       |
| `inKindBps`        |    0 (0%)  | Retail Stability Pool depositors cannot redeem RWA tokens with the issuer; reserved for V2. |

These should be re-calibrated after the first 10 mainnet liquidations based on realized redemption fees and timing.

## Escape hatch

If Manager doesn't settle within `staleBatchPeriod` (60 days):

```solidity
function emergencyDistributeInKind(uint256 batchId) external {
    Batch storage b = batches[batchId];
    require(block.timestamp > b.queuedAt + staleBatchPeriod, "NotStale");
    require(b.status == Status.Queued, "AlreadySettled");

    // Distribute pro-rata to agaSP holders at batch.snapshotBlock
    // via agaSP's ERC20Votes-based getPastVotes mechanism.
    b.status = Status.EmergencyDistributed;
    ...
}
```

!!! warning

    Governance is actively trying to avoid triggering this path: it leaves retail Stability Pool depositors holding RWA tokens they may not be able to redeem. It exists to prevent total manager capture.

Continue to [Functions](functions.md) for the complete interface.
