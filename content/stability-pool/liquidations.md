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

The numbers below trace a single nominal liquidation end to end. The point is to feel the flow on real balance sheets, not to reproduce the code byte for byte.

**Setup.** Alice deposits **1M `AMFI_SENIOR`** as collateral when each token is worth `$1.00`. She borrows **700k USDr** at AmFi's `MAX_LTV` of 70%. AmFi's `LIQUIDATION_THRESHOLD` is 80%.

A few weeks later the senior tranche is marked down 20%, to `$0.80` per token. Alice's health factor:

```
HF  =  (collateral_value × LIQUIDATION_THRESHOLD) / debt
    =  (1M × $0.80 × 80%) / 700k
    =  640k / 700k
    =  0.914
```

Below 1, so the position is liquidatable.

### `t = 0`. Trigger

The manager keeper picks up the unhealthy position and calls `LiquidationProxy.initiateLiquidation(amfiAdapter, alice, ...)`. Alice's position is flagged. The 72-hour grace timer starts. She can still cure by repaying her 700k debt plus interest in full — assume she doesn't.

### `t = 72h + 1`. Finalize

Grace expires. The manager calls `StabilityPool.liquidateBorrower(...)`. Three things happen atomically:

1. The **Lending Pool** finalizes: Alice's 700k debt is burned.
2. The **Stability Pool** burns 700k of its own `agTOKEN` to pull 700k USDr out of the Lending Pool. Its `agTOKEN` balance shrinks; lenders are made whole the moment the liquidation lands.
3. The **`AmFiAdapter`** transfers Alice's 1M `AMFI_SENIOR` straight to the Settlement Vault. The Lending Pool itself never holds the RWA — that custody lives on the adapter.

The Settlement Vault then applies the `LiquidationSplit` (default `200 / 300 / 9500 / 0` bps) to the 1M tokens it just received:

| Bucket             |  Bps |  Amount  | Destination                                    |
|--------------------|-----:|---------:|------------------------------------------------|
| `treasuryBps`      |  200 |     20k  | Treasury (held until later redemption)         |
| `reserveFundBps`   |  300 |     30k  | Reserve Fund                                   |
| `redeemBps`        | 9500 |    950k  | Redemption queue, `Batch #42` (`pegGap = 700k`)|
| `inKindBps`        |    0 |      0   | reserved for V2                                |

State right after this transaction:

| Actor          | Position                                                              |
|----------------|-----------------------------------------------------------------------|
| Alice          | debt = 0, collateral = 0. She walks away.                             |
| Pure lender    | `agTOKEN` keeps appreciating. Untouched.                              |
| Staked Bob     | `agaSP` value dips: the Stability Pool now holds RWA, not `agTOKEN`. |
| Lending Pool   | USDr liquidity preserved.                                             |

### `t = 72h → ~D + 15`. Off-chain redemption

The manager submits the 950k `AMFI_SENIOR` from `Batch #42` to AmFi's primary redemption queue. AmFi clears it on its own timeline (~15 days for the senior tranche). At redemption, USDr arrives in the Settlement Vault:

```
USDr received  =  950k × $0.80 × (1 − 0.5%)
               =  950k × 0.80 × 0.995
               ≈  757k USDr
```

(`$0.80` is the NAV at redemption time. `0.5%` is AmFi's standard primary-redemption fee.)

### `t ≈ D + 15`. Settle

The manager calls `SettlementVault.settleRedemption(batchId = 42, 757k)`. The batch carries `pegGap = 700k`, so:

- **`toSP = min(757k, 700k) = 700k`** is deposited into the Lending Pool on the Stability Pool's behalf. Fresh `agTOKEN` is minted back to the Stability Pool. The peg is restored.
- **`excess = 57k`** flows to the Reserve Fund per the V1 `ExcessPolicy` (100% to Reserve Fund).
- No shortfall this time, so the Reserve Fund's `coverShortfall` path doesn't fire.

### Scoreboard

| Actor         | Before liquidation        | After settlement                                |
|---------------|---------------------------|-------------------------------------------------|
| Alice         | 1M collateral, 700k debt  | 0 / 0. Position closed.                         |
| Pure lender   | `agTOKEN` accruing        | `agTOKEN` accruing. No change.                  |
| Staked Bob    | `agaSP` 1:1 with `agTOKEN`| `agaSP` 1:1 again + pro-rata share of the bonus |
| Treasury      | —                         | + 20k `AMFI_SENIOR`                             |
| Reserve Fund  | —                         | + 30k `AMFI_SENIOR` + 57k USDr ≈ 80k of value   |
| Protocol P&L  | —                         | Solvent. Reserve Fund grew, no bad debt.        |

This is the nominal "good" outcome: redemption returned more USDr than the debt absorbed, so staked Bob is repaid in full and earns the surplus as the liquidation bonus. The pathological case (redemption returns less than `pegGap`) is handled in the [shortfall section below](#shortfall-handling-if-the-stability-pool-is-depleted).

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

