# Stability Pool: Liquidations

The liquidation lifecycle is three-stage and manager-gated. The Agama-specific step is routing seized collateral through the [Settlement Vault](/docs/settlement-vault/overview) after seizure.

## End-to-end flow

The diagram below tracks every actor's state across the three phases. Read top to bottom (time advances down).

```
                ┌──────────────────────────────────────────────────┐
                │  PHASE 1   Trigger        t = 0                  │
                ├──────────────────────────────────────────────────┤
                │  Manager keeper sees Alice's HF < 1              │
                │  → initiateLiquidation()                         │
                │  → position flagged, 72h grace timer starts      │
                │                                                  │
                │  Alice can still repay in full to cure.          │
                │  (V1 has no insurance path.)                     │
                └──────────────────────────────────────────────────┘
                                      │
                                      │  72 hours pass, no cure
                                      ▼
                ┌──────────────────────────────────────────────────┐
                │  PHASE 2   Finalize       t = 72h                │
                ├──────────────────────────────────────────────────┤
                │                                                  │
                │           SP.liquidateBorrower()                 │
                │                  │                               │
                │   ┌──────────────┼──────────────────┐            │
                │   ▼              ▼                  ▼            │
                │  Lending       Stability         Settlement      │
                │  Pool          Pool              Vault           │
                │  ───────       ─────────         ──────────      │
                │  burn          burn own       ←  receive RWA     │
                │  Alice's       agTOKEN to        apply split:    │
                │  debt          pull USDr         2%  Treasury    │
                │                from LP,          3%  ReserveFund │
                │                hold RWA          95% redeem queue│
                │                in custody        0%  in-kind     │
                │                                                  │
                │  ── State after Phase 2 ────────────────────     │
                │   Alice           debt = 0,  collateral = 0      │
                │   Pure lender     unaffected, agTOKEN OK         │
                │   Staked Bob      agaSP DIPS by debt / SP_size   │
                │   Lending Pool    USDr liquidity preserved       │
                └──────────────────────────────────────────────────┘
                                      │
                                      │  off-chain redemption (~15d)
                                      │  Manager redeems queued RWA at AmFi
                                      ▼
                ┌──────────────────────────────────────────────────┐
                │  PHASE 3   Settle         t ≈ D + 15             │
                ├──────────────────────────────────────────────────┤
                │  USDr arrives at the Settlement Vault            │
                │                  │                               │
                │     SettlementVault.settleRedemption()           │
                │                  │                               │
                │   ┌──────────────┼─────────────────┐             │
                │   ▼              ▼                 ▼             │
                │  to Stability  excess →      shortfall covered   │
                │  Pool peg      ReserveFund   by ReserveFund,     │
                │  restoration                 then bad-debt       │
                │                              redistribution      │
                │                              (last resort)       │
                │                  │                               │
                │                  ▼                               │
                │   LendingPool.depositOnBehalf(SP, recovered)     │
                │                  │                               │
                │                  ▼                               │
                │   fresh agTOKEN minted to the Stability Pool     │
                │                  │                               │
                │                  ▼                               │
                │   agaSP peg RESTORED + liquidation bonus split   │
                │                                                  │
                │  ── State after Phase 3 ────────────────────     │
                │   Alice           still 0, walked away           │
                │   Pure lender     untouched throughout           │
                │   Staked Bob      principal back + bonus share   │
                │   ReserveFund     grew by burnBps + any excess   │
                └──────────────────────────────────────────────────┘
```

The three on-chain function calls behind those phases:

```
Phase 1 :  LiquidationProxy.initiateLiquidation(adapter, user, data)
Phase 2 :  Borrower repays via LendingPool.repay(...) + closeLiquidation()  (optional cure)
Phase 3 :  StabilityPool.liquidateBorrower(...)        (after 72h)
           SettlementVault.settleRedemption(batchId, usdrReceived)  (after issuer redemption)
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

    // 3. Finalize on pool: collateral transferred to SP, debt burned
    lendingPool.finalizeLiquidation(poolAdapter, user, data);
    uint256 scaledDebt = debt;

    // 4. SP makes agTOKEN whole in USDr
    //    SP burns its own agTOKEN via lendingPool.withdraw to pull USDr
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
State: Alice has 1M AMFI_SENIOR collateral (valued at 800k USDr after price drop)
       and 700k USDr debt. LTV threshold 80% → HF = 800×80% / 700 = 0.914 < 1.

t=0   : Manager keeper detects HF < 1.
        LiquidationProxy.initiateLiquidation(amfiAdapter, alice, data)
        → position.isUnderLiquidation = true, startTime = 0

t=0..72h : Grace period.
        Alice may repay 700k USDr + interest and call closeLiquidation.
        Suppose she does not.

t=72h+1: Manager → SP.liquidateBorrower(amfiAdapter, vaultAdapter, alice, data, minSharesOut)
        → SP.liquidateBorrower:
            → LendingPool.finalizeLiquidation → 1M amfiToken moved to SP, 700k debt burned
            → SP withdraws 700k via LendingPool.withdraw (agTOKEN burned → USDr pulled)
            → SP transfers 1M amfiToken to SettlementVault
        → SettlementVault.handleSeizure:
            applies LiquidationSplit 200/300/9500/0:
              20k  → Treasury (amfiToken held)
              30k  → ReserveFund
              950k → redemption queue (for off-chain AmFi redeem)
              0k   → in-kind
            creates Batch #42, snapshotBlock = current

t=72h..~15d: Manager off-chain initiates AmFi redemption for 950k amfiToken.
        USDr arrives:  950k × 0.80 × 0.995 ≈ 757k USDr
                        ─────────  ────────  ─────
                        amount     NAV per   1 − redeem fee (0.5%)
                                   token at
                                   redemption
                                   (= 0.80,  the price after the
                                    initial drop from 1.00 → 0.80)

t=15d+: Manager calls settleRedemption(batchId=42, 757k USDr)
        → toSP = min(757k, 700k pegGap) = 700k → LendingPool.deposit(700k) on SP's behalf
        → agTOKEN minted to SP → peg restored
        → excess = 57k → 100% to ReserveFund per ExcessPolicy

Outcome:
  - Alice: debt wiped, collateral gone.
  - Lenders: unaffected (agTOKEN kept whole throughout).
  - SP: back to full peg, 100k total value added to ReserveFund.
  - Protocol: 20k Treasury + 80k ReserveFund. Solvent.
```

## No-insurance design choice (V1)

V1 Agama does not offer an insurance pathway (e.g. prepaid premium to delay or survive liquidation):

- Smaller audit surface.
- Simpler liquidation logic.
- Cork Protocol (V2 feature) will provide credit insurance at a higher layer.

## Shortfall handling (if the Stability Pool is depleted)

If at `finalizeLiquidation` time the Stability Pool has insufficient `agTOKEN` to cover the debt:

1. Partial Stability Pool absorption for what it can cover.
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

    Redistribution is a **last resort**. In practice the ReserveFund should absorb almost all shortfalls; if redistribution triggers frequently, the protocol's risk parameters need recalibration.

