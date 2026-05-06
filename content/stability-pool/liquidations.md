# Stability Pool: Liquidations

Liquidations are **single-step and manager-gated** in V1. The Agama-specific step is routing seized collateral through the [Settlement Vault](/settlement-vault/overview) for off-chain redemption.

## End-to-end flow

The liquidation itself is one atomic transaction. The settlement that follows takes ~15 days because real-world collateral can't be sold on-chain at block speed.

```
                ┌──────────────────────────────────────────────────┐
                │  PHASE 1   Liquidate          t = 0              │
                ├──────────────────────────────────────────────────┤
                │  Manager keeper sees Alice's HF < 1              │
                │  on the (sRESOLV, …) market.                     │
                │  → LiquidationProxy.liquidate(...)               │
                │                                                  │
                │  ┌───────────────────────────────────────┐       │
                │  │ Atomic operations inside this one tx: │       │
                │  ├───────────────────────────────────────┤       │
                │  │  • Burn Alice's debt on this market   │       │
                │  │  • SP burns its own agYLD to repay    │       │
                │  │    the LendingPool in USDr            │       │
                │  │  • Adapter transfers seized RWA       │       │
                │  │    from Alice's vault → SP            │       │
                │  │  • SP forwards RWA → Settlement Vault │       │
                │  │  • Settlement Vault queues the        │       │
                │  │    off-chain redemption batch         │       │
                │  └───────────────────────────────────────┘       │
                │                                                  │
                │  ── State after Phase 1 ────────────────────     │
                │   Alice           debt = 0,  collateral = 0      │
                │                   on this market only            │
                │   Pure lender     unaffected, agYLD intact       │
                │   Staked Bob      sagYLD price DIPS by           │
                │                   debt / SP_size                 │
                │   Lending Pool    USDr liquidity preserved       │
                └──────────────────────────────────────────────────┘
                                      │
                                      │  off-chain redemption (~15d)
                                      │  Manager redeems queued
                                      │  RWA at the issuer
                                      ▼
                ┌──────────────────────────────────────────────────┐
                │  PHASE 2   Settle             t ≈ D + 15         │
                ├──────────────────────────────────────────────────┤
                │  USDr arrives at the Settlement Vault            │
                │                  │                               │
                │     SettlementVault.settleRedemption()           │
                │                  │                               │
                │   ┌──────────────┼─────────────────┐             │
                │   ▼              ▼                 ▼             │
                │  toSP =        excess →       shortfall covered  │
                │  min(usdr,     SP via         by ReserveFund,    │
                │  pegGap)       depositOnBehalf then bad-debt     │
                │                                redistribution    │
                │                                (last resort)     │
                │                  │                               │
                │                  ▼                               │
                │   LendingPool.depositOnBehalf(SP, toSP+excess)   │
                │                  │                               │
                │                  ▼                               │
                │   fresh agYLD minted to the Stability Pool       │
                │                  │                               │
                │                  ▼                               │
                │   sagYLD share price LIFTS pro-rata to all       │
                │   holders                                        │
                │                                                  │
                │  ── State after Phase 2 ────────────────────     │
                │   Alice           still 0, walked away           │
                │   Pure lender     untouched throughout           │
                │   Staked Bob      principal back + pro-rata      │
                │                   premium                        │
                │   ReserveFund     pro-rata premium on its SP     │
                │                   stake                          │
                └──────────────────────────────────────────────────┘
```

The on-chain function calls behind those phases:

```
Phase 1 :  LiquidationProxy.liquidate(poolAdapter, vaultAdapter, user, data, minSharesOut)
            └─ atomically calls:
               • LendingPool.liquidate(adapter, user, data)         (burns debt, seizes RWA)
               • SettlementVault.handleSeizure(adapter, data, ...)  (queues redemption)

Phase 2 :  SettlementVault.settleRedemption(batchId, usdrReceived)  (after issuer redemption)
```

There is no on-chain grace period in V1: the moment HF crosses below 1 and the manager submits, the position is closed. Borrowers who want to cure must do so by repaying enough debt or topping up enough collateral **before** the manager sees them — there is no second chance once the call goes in.

## Manager gating (V1 design choice)

Liquidations are gated to a `MANAGER_ROLE` on the `LiquidationProxy`. The proxy then holds `MANAGER_ROLE` on the Stability Pool, which in turn holds `LIQUIDATION_PROXY_ROLE` on the Lending Pool. The role chain is:

```
human / keeper bot
       │
       ▼
LiquidationProxy.MANAGER_ROLE  ← granted by admin via setManager()
       │
       ▼ calls
LiquidationProxy.liquidate(...)
       │
       ▼ holds StabilityPool.MANAGER_ROLE
StabilityPool.liquidateBorrower(...)
       │
       ▼ holds LendingPool.LIQUIDATION_PROXY_ROLE
LendingPool.liquidate(adapter, user, data)
```

V1 picks this gating deliberately, for three reasons:

1. **Audit surface.** A single trusted call path is far simpler to reason about than a permissionless market with arbitrary callers.
2. **MEV control.** No front-running war between liquidator bots, no sandwich attacks on the Stability Pool's `agYLD`.
3. **Predictable failure modes.** When the keeper goes down, exactly one operator is on call.

The trade-off is centralisation: a frozen or compromised manager would prevent liquidations until governance rotates the role.

**V2 trajectory.** The natural evolution is to drop `MANAGER_ROLE` from `LiquidationProxy.liquidate` and let the liquidation premium (3% Senior, 8% Junior) be the open incentive — same model Aave and MakerDAO have used for years. That move comes with a wider audit and is on the post-mainnet roadmap.

## Why the 15-day window is structural

Phase 2 above has the Stability Pool holding RWA tokens for ~15 days while the Settlement Vault redeems them with the issuer. From a staked Bob's perspective, his `sagYLD` is collateralised by RWA instead of `agYLD` during that window. This is not a workaround — it's a structural property of V1.

### Where the delay comes from

DeFi clears at block speed. Real-world credit instruments do not. AmFi tranche tokens have a primary redemption window of D+15 because the underlying receivables themselves take time to settle through the issuer. Most other RWA classes are similar: T-bills T+1, private credit T+3 to T+30, fund shares can be quarterly.

A lending venue built for crypto collateral solves the timing mismatch with on-chain liquidity: a third-party liquidator buys the seized collateral on a DEX, repays the loan, captures the premium, all in one transaction. That option doesn't exist for AmFi-issued tranches on Rayls today. There is no `<tranche> / USDr` pool, no AMM, no off-chain market maker quoting size at par. The only legitimate path from RWA back to stablecoins is **issuer redemption**, which by definition is asynchronous.

### Why V1 takes the simple path

Rather than spinning up a separate market of bridge facilitators who front capital to collapse the redemption window, the Stability Pool itself absorbs the timing mismatch. Staked Bob is, effectively, the bridge facilitator. He carries the asset for ~15 days and earns the liquidation premium as compensation.

| Trade-off                                              | V1 (current) | V1 with bridge market | V2 with on-chain DEX |
|--------------------------------------------------------|:------------:|:---------------------:|:--------------------:|
| Time SP capital is locked per liquidation              |  ~15 days    |   ~0 (single block)   |   ~0 (single block)  |
| Number of distinct counterparties                      |     1        |          2            |         2+           |
| External market dependency                             |    none      |    bridge facilitator |   DEX liquidity      |
| Audit surface                                          |    minimal   |       larger          |      larger          |

V1 picks the lockup over the dependency tax because it ships with one moving part instead of three.

### What protects the staker during those 15 days

1. **The RWA is yield-bearing throughout.** The seized tranche keeps accruing real-world interest whether it sits in Alice's vault or in the Settlement Vault. Economic value doesn't decay during the wait; it accrues to the eventual recipient (the Stability Pool) on settlement.
2. **The Reserve Fund covers shortfalls.** If redemption returns less USDr than the absorbed debt (price moved against the position between liquidation and settlement), the Reserve Fund covers the gap before any bad-debt redistribution.
3. **The liquidation premium is the compensation.** When redemption returns more USDr than the absorbed debt, the surplus is redeposited into the Stability Pool via `LendingPool.depositOnBehalf(stabilityPool, excess)`. The fresh `agYLD` lifts `sagYLD`'s share price pro-rata across every holder — retail stakers and the Reserve Fund alike. That surplus is the price the protocol pays staked Bob for his 15-day exposure.
4. **The escape hatch.** If the Manager fails to settle within `staleBatchPeriod` (60 days), `sagYLD` holders can claim the seized RWA in-kind via [`emergencyDistributeInKind`](/settlement-vault/overview#escape-hatch). This is a last resort against manager capture, not a normal exit path.

### The V2 trajectory

The natural way to compress the 15-day window is to externalise the timing risk to specialised markets. Two paths, both viable:

- **An on-chain DEX for `<tranche> / USDr`** would let third-party liquidators close positions atomically. The Stability Pool stops being a settlement bridge and becomes purely a backstop, the Settlement Vault detour disappears.
- **A bridge-facilitator network** fronts USDr against the queued redemption. The Stability Pool would be repaid in a single block; the facilitator carries the redemption risk and earns a fee.

Either path increases capital efficiency at the cost of more counterparties and a larger audit surface. V1 deliberately ships without them.

## `liquidate` flow (detail)

```solidity
// LiquidationProxy.sol
function liquidate(
    address poolAdapter,
    address vaultAdapter,
    address user,
    bytes calldata data,
    uint256 minSharesOut
) external onlyRole(MANAGER_ROLE) {
    SP.liquidateBorrower(poolAdapter, vaultAdapter, user, data, minSharesOut);
    emit Liquidated(poolAdapter, vaultAdapter, user, minSharesOut);
}

// StabilityPool.liquidateBorrower (orchestration)
//
// 1. Validation
//    require(lendingPool.supportedAdapter(poolAdapter), "UnsupportedAdapter");
//    uint256 debt = DebtToken.balanceOf(user, poolAdapter);
//    require(debt > 0, "InvalidAmount");
//    require(IAssetAdapter(poolAdapter).validateLiquidationData(user, data), "CollateralMismatch");
//
// 2. Accrue interest
//    lendingPool.updateState();
//
// 3. Atomic seizure on the LP: scoped debt burned, RWA transferred to SP
//    (uint256 absorbed, uint256 badDebt) = lendingPool.liquidate(poolAdapter, user, data);
//
// 4. SP makes the LP whole in USDr by burning its own agYLD
//    lendingPool.withdraw(absorbed);
//
// 5. Route seized collateral to the SettlementVault for off-chain redemption
//    rwa.safeTransfer(address(settlementVault), seized);
//    settlementVault.handleSeizure(vaultAdapter, data, seized, absorbed, minSharesOut);
//
// 6. Emit BorrowerLiquidated(user, address(rwa), data, absorbed)
```

## Worked example

A real liquidation traced with concrete amounts. Read the two phases top to bottom; the diagram carries the setup, the per-phase actions, the LiquidationSplit allocation, and the final state.

<Diagram src="/diagrams/liquidation-flow.svg" alt="Liquidation flow: 2 phases (Liquidate / Settle) with concrete amounts on every edge" width="440" />

This is the nominal good outcome: the redemption returned **780k USDr** (`980k × $0.80 × (1 − 0.5%)`) against a 700k peg gap. The 700k repays the peg, and the **80k surplus** is redeposited into the Stability Pool via `depositOnBehalf` — `sagYLD`'s share price lifts pro-rata across every holder. With the example pool composition from the [Stability Pool overview](overview.md#worked-example) (1M `sagYLD` outstanding):

| Holder         | Share | Premium credited at settlement |
|----------------|------:|-------------------------------:|
| Reserve Fund   |  20%  |  16,000 USDr-equivalent        |
| Treasury       |   5%  |   4,000 USDr-equivalent        |
| Bob            |   1%  |     800 USDr-equivalent        |
| Charlie        |   5%  |   4,000 USDr-equivalent        |
| Other stakers  |  69%  |  55,200 USDr-equivalent        |
| **Total**      | 100%  | **80,000 USDr**                |

No holder makes a claim transaction — the premium appears as appreciation in `sagYLD`'s redeemable value. The pathological case (redemption returns less than `pegGap`) is handled in the [shortfall section below](#shortfall-handling-if-the-stability-pool-is-depleted).

## No-insurance design choice (V1)

V1 Agama does not offer an insurance pathway (e.g. prepaid premium to delay or survive liquidation):

- Smaller audit surface.
- Simpler liquidation logic.
- Cork Protocol (V2 feature) will provide credit insurance at a higher layer.

## Shortfall handling (if the Stability Pool is depleted)

If at `liquidate` time the Stability Pool has insufficient `agYLD` to cover the debt:

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
