# Stability Pool — Liquidations

The liquidation lifecycle is three-stage and manager-gated. Agama mirrors RAAC's structure; the key Agama-specific step is the routing through the [Settlement Vault](../../core/settlement-vault/overview.md) after seizure.

## Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│ STAGE 1 — initiateLiquidation (keeper-driven)                │
│   Pre: HF < HEALTH_FACTOR_LIQUIDATION_THRESHOLD               │
│   Effect: position.isUnderLiquidation = true                  │
│           liquidationStartTime = block.timestamp              │
│   Grace period (72h) begins.                                  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ STAGE 2 — Grace period (72h)                                 │
│   Borrower may repay fully via LendingPool.repay().           │
│   After zeroing debt, may call closeLiquidation() to clear    │
│   flags (position remains, collateral retained).              │
│   V1 has no insurance path — borrower MUST fully repay to cure.│
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ STAGE 3 — finalizeLiquidation (SP-called, post-grace)         │
│   SP.liquidateBorrower calls LendingPool.finalizeLiquidation. │
│   Effect: collateral → SP, debt → burned (user whole on debt).│
│   SP repays rToken in USDXP (its agTOKEN balance shrinks).    │
│   SP transfers seized collateral → SettlementVault.           │
└──────────────────────────────────────────────────────────────┘
```

## `liquidateBorrower` flow (detail)

```solidity
function liquidateBorrower(
    address poolAdapter,
    address vaultAdapter,
    address user,
    bytes calldata data,
    uint256 minSharesOut
) external onlyProxy onlyManager {
    // 1. Validation
    require(lendingPool.supportedAdapter(poolAdapter), "UnsupportedAdapter");
    uint256 debt = lendingPool.getPositionDebt(poolAdapter, user, data);
    require(debt > 0, "InvalidAmount");
    require(IAssetAdapter(poolAdapter).validateLiquidationData(user, data), "CollateralMismatch");

    // 2. Accrue interest
    lendingPool.updateState();

    // 3. Finalize on pool — collateral transferred to SP, debt burned
    lendingPool.finalizeLiquidation(poolAdapter, user, data);
    uint256 scaledDebt = debt;

    // 4. SP makes rToken whole in USDXP
    //    SP burns its own agTOKEN via lendingPool.withdraw to pull USDXP
    lendingPool.withdraw(scaledDebt);

    // 5. Route seized collateral to SettlementVault
    IERC20 rwa = IERC20(IAssetAdapter(poolAdapter).getAssetToken());
    uint256 seized = rwa.balanceOf(address(this)) - preBalance;
    rwa.safeTransfer(address(settlementVault), seized);
    settlementVault.handleSeizure(vaultAdapter, data, seized, scaledDebt, minSharesOut);

    emit BorrowerLiquidated(user, address(rwa), data, scaledDebt);
}
```

## Worked example

```
State: Alice has 1M AMFI_SENIOR collateral (valued at 800k USDXP after price drop)
       and 700k USDXP debt. LTV threshold 80% → HF = 800×80% / 700 = 0.914 < 1.

t=0   : Manager keeper detects HF < 1.
        LiquidationProxy.initiateLiquidation(amfiAdapter, alice, data)
        → position.isUnderLiquidation = true, startTime = 0

t=0..72h : Grace period.
        Alice may repay 700k USDXP + interest and call closeLiquidation.
        Suppose she does not.

t=72h+1: Manager → SP.liquidateBorrower(amfiAdapter, vaultAdapter, alice, data, minSharesOut)
        → SP.liquidateBorrower:
            → LendingPool.finalizeLiquidation → 1M amfiToken moved to SP, 700k debt burned
            → SP withdraws 700k via LendingPool.withdraw (agTOKEN burned → USDXP pulled)
            → SP transfers 1M amfiToken to SettlementVault
        → SettlementVault.handleSeizure:
            applies LiquidationSplit 200/300/9500/0:
              20k  → Treasury (amfiToken held)
              30k  → ReserveFund
              950k → redemption queue (for off-chain AmFi redeem)
              0k   → in-kind
            creates Batch #42, snapshotBlock = current

t=72h..~15d: Manager off-chain initiates AmFi redemption for 950k amfiToken.
        USDXP arrives (~950 × 0.80 × 0.995 ≈ 757k USDXP after price × redeem fee).

t=15d+: Manager calls settleRedemption(batchId=42, 757k USDXP)
        → toSP = min(757k, 700k pegGap) = 700k → LendingPool.deposit(700k) on SP's behalf
        → agTOKEN minted to SP → peg restored
        → excess = 57k → 100% to ReserveFund per ExcessPolicy

Outcome:
  - Alice: debt wiped, collateral gone.
  - Lenders: unaffected (rToken kept whole throughout).
  - SP: back to full peg, 100k total value added to ReserveFund.
  - Protocol: 20k Treasury + 80k ReserveFund. Solvent.
```

## No-insurance design choice (V1)

RAAC supports `borrowWithInsurance()` — borrowers can prepay a premium to delay or survive liquidation. V1 Agama explicitly drops this path:

- Smaller audit surface.
- Simpler liquidation logic.
- Cork Protocol (V2 feature) will provide credit insurance at a higher layer.

## Shortfall handling (if SP depleted)

If at `finalizeLiquidation` time the SP has insufficient `agTOKEN` to cover the debt:

1. Partial SP absorption for what it can cover.
2. Remaining `(debtLeft, collateralLeft)` routed to Bad-Debt Redistribution.

Redistribution uses the Liquity O(1) technique across remaining active borrowers, weighted by collateral:

```
L_Debt       += remainingDebt × RAY / totalActiveCollateral
L_Collateral += remainingColl × RAY / totalActiveCollateral

Per-borrower actual state:
  actualDebt  = rawDebt + rawColl × (L_Debt       − snap.L_Debt)       / RAY
  actualColl  = rawColl + rawColl × (L_Collateral − snap.L_Collateral) / RAY
```

!!! warning

    Redistribution is a **last resort**. In practice, the ReserveFund should absorb almost all shortfalls — if redistribution triggers frequently, the protocol's risk parameters need recalibration.

