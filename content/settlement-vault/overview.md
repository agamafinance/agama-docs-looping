# Settlement Vault — Overview

!!! note

    The `AgamaSettlementVault` is the Agama-specific primitive that bridges seized RWA collateral back into USDXP. It exists because Rayls has no DEX for AmFi tokens, so we cannot liquidate through an on-chain swap.

## Problem

After `SP.liquidateBorrower()`, the Stability Pool holds AmFi senior tranche tokens. Without an on-chain market:

- SP depositors cannot simply be repaid in USDXP.
- The only legitimate path from RWA → USDXP is **issuer redemption**, which is off-chain and takes D+15 (AmFi) or longer depending on the issuer.
- Distributing RWA tokens in-kind to retail SP depositors is unattractive: most cannot hold or redeem them with the issuer directly.

## Solution: auto-reconstituting Stability Pool

The Settlement Vault:

1. Takes custody of seized RWA.
2. Applies a configurable `LiquidationSplit` (treasury / reserve / redeem / in-kind).
3. Queues the `redeemBps` bucket for manager-executed off-chain redemption.
4. On redemption settlement, **automatically re-deposits the recovered USDXP into the Lending Pool on the SP's behalf** — restoring the SP's `agTOKEN` position and, therefore, the `agaSP` 1:1 peg.
5. Maintains an escape hatch (`emergencyDistributeInKind`) if the manager is inactive beyond `staleBatchPeriod` (60 days).

### Key simplification

Rather than distributing USDXP per depositor via individual claims (which would require per-deposit balance snapshots), the Settlement Vault funnels recovered USDXP back into the Lending Pool, minting fresh `agTOKEN` to the SP. Every `agaSP` holder benefits proportionally **through the restored peg** — no individual claim mechanism needed.

This simplification drops an entire `ClaimSettlement` contract from V1 scope.

## Flow

```
SP.liquidateBorrower()
  │
  ├─ LendingPool.finalizeLiquidation (collateral → SP, debt burned, agTOKEN whole)
  │
  └─ SP transfers seized RWA → SettlementVault.handleSeizure(adapter, data, seized, pegGap)
       │
       ├─ applies LiquidationSplit:
       │     T = seized × treasuryBps    / 10000   → Treasury.deposit(asset, T)
       │     B = seized × reserveFundBps / 10000   → ReserveFund.deposit(asset, B)
       │     R = seized × redeemBps      / 10000   → queued in Batch{id, R}
       │     K = seized × inKindBps      / 10000   → (V1 = 0) reserved for V2
       │
       ├─ emits BatchQueued(id, asset, R, block.timestamp, pegGap)
       │
       └─ pegGap saved on the batch for settlement reconciliation

(off-chain, days to weeks)

Manager completes AmFi redemption → receives USDXP
Manager → SettlementVault.settleRedemption(batchId, usdxpReceived)
  │
  ├─ toSP = min(usdxpReceived, batch.pegGap)
  │     USDXP.approve(LendingPool, toSP)
  │     LendingPool.depositOnBehalf(SP, toSP)
  │     → agTOKEN minted to SP → peg restored by `toSP`
  │
  ├─ excess = usdxpReceived − toSP
  │     if excess > 0: routed per ExcessPolicy (V1: 100% → ReserveFund)
  │
  ├─ shortfall = max(0, pegGap − usdxpReceived)
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
| `reserveFundBps`   |  300 (3%)  | ReserveFund buffer growth (was named `burnBps` historically — nothing is burnt).|
| `redeemBps`        | 9500 (95%) | Maximize USDXP recovery to restore SP peg.                                      |
| `inKindBps`        |    0 (0%)  | Retail SP depositors cannot redeem RWA tokens with the issuer; reserved for V2. |

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

    Governance is actively trying to avoid triggering this path — it leaves retail SP depositors holding RWA tokens they may not be able to redeem. It exists to prevent total manager capture.

Continue to [Functions](functions.md) for the complete interface.
