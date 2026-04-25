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

## Why the 15-day window is structural

Phase 3 of the diagram has the Stability Pool holding RWA tokens for ~15 days while the Settlement Vault redeems them with the issuer. From a staked Bob's perspective, his `agaSP` is collateralized by RWA instead of `agTOKEN` during that window. This is not a workaround. It's a structural property of V1 worth understanding.

### Where the delay comes from

DeFi clears at block speed. Real-world credit instruments do not. AmFi senior tranche tokens have a primary redemption window of D+15 because the underlying receivables themselves take time to settle through the issuer. Most other RWA classes are similar (T-bills T+1, private credit T+3 to T+30, fund shares can be quarterly).

A lending venue built for crypto collateral solves the timing mismatch with on-chain liquidity: a third-party liquidator buys the seized collateral on a DEX, repays the loan, captures the bonus, all in one transaction. That option doesn't exist for AmFi on Rayls today. There is no `AMFI_SENIOR / USDr` pool, no AMM, no off-chain market maker quoting size at par. The only legitimate path from RWA back to stablecoins is **issuer redemption**, which by definition is asynchronous.

### Why V1 takes the simple path

Agama V1's design choice: rather than spinning up a separate market of bridge facilitators who front capital to collapse the redemption window, the Stability Pool itself absorbs the timing mismatch. Staked Bob is, effectively, the bridge facilitator. He carries the asset for ~15 days and earns the liquidation bonus as compensation.

| Trade-off                                              | V1 (current) | V1 with bridge market | V2 with on-chain DEX |
|--------------------------------------------------------|:------------:|:---------------------:|:--------------------:|
| Time SP capital is locked per liquidation              |  ~15 days    |   ~0 (single block)   |   ~0 (single block)  |
| Number of distinct counterparties                      |     1        |          2            |         2+           |
| External market dependency                             |    none      |    bridge facilitator |   DEX liquidity      |
| Audit surface                                          |    minimal   |       larger          |      larger          |

V1 picks the lockup over the dependency tax because it ships with one moving part instead of three.

### What protects the staker during those 15 days

1. **The RWA is yield-bearing throughout.** AmFi senior accrues ~16% APY whether it's sitting in Alice's vault or in the Settlement Vault. Economic value doesn't decay during the wait; it accrues to the eventual recipient (the Stability Pool) on settlement.
2. **The Reserve Fund covers shortfalls.** If redemption returns less USDr than the absorbed debt (price moved against the position between liquidation and settlement), the Reserve Fund covers the gap before any bad-debt redistribution.
3. **The liquidation bonus is the compensation.** When redemption returns more USDr than the absorbed debt, the surplus flows pro-rata to `agaSP` holders. That surplus is the price the protocol pays staked Bob for his 15-day exposure.
4. **The escape hatch.** If the Manager fails to settle within `staleBatchPeriod` (60 days), `agaSP` holders can claim the seized RWA in-kind via [`emergencyDistributeInKind`](/docs/settlement-vault/overview#escape-hatch). This is a last resort against manager capture, not a normal exit path.

### The V2 trajectory

The natural way to compress the 15-day window is to externalize the timing risk to specialized markets. Two paths, both viable:

- **An on-chain DEX for `AMFI_SENIOR / USDr`** would let third-party liquidators close positions atomically. The Stability Pool stops being a settlement bridge and becomes purely a backstop, the Settlement Vault detour disappears.
- **A bridge-facilitator network** (similar in spirit to 3F's model) fronts USDr against the queued redemption. The Stability Pool would be repaid in a single block; the facilitator carries the redemption risk and earns a fee.

Either path increases capital efficiency at the cost of more counterparties and a larger audit surface. V1 deliberately ships without them.

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

