# Overview

**Leveraged yield on real-world assets.**

Agama is a lending protocol purpose-built for tokenised RWA tranches. Holders collateralise their tranche tokens and borrow stablecoins against them. Lenders provide that liquidity and earn interest backed by the performance of real-world credit, receivables, and fund shares.

## The Problem

Tokenised RWAs produce real yield. Holders cannot lever it.

There is no secondary market to sell into. Redemption queues run for weeks. Lending venues built for crypto collateral will not finance an asset they cannot liquidate at block speed; they reject RWA collateral outright, or list it at LTVs so conservative the loop is not economic.

Stablecoin lenders are starved for durable yield. Crypto-backed borrow demand is cyclical and has compressed. The capital is on-chain. The collateral is on-chain. The rails between them are not.

## Architecture in one paragraph

Agama runs **one shared liquidity pool** of USDr (the Lending Pool) that funds **isolated borrow markets**, one per RWA tranche. Lenders see a single deposit destination and a single APY. Borrowers see a list of independent markets, each with its own collateral type, risk parameters, and debt counter — borrowing on one tranche has no effect on a borrower's exposure to another tranche.

This is a **Morpho-Blue-style isolated-debt model** sitting on top of an **Aave-style unified-liquidity pool**, plus a Liquity-style Stability Pool as the backstop.

## Components

The protocol has two core surfaces:

1. **Lending Pool.** Lenders deposit USDr and receive `agYLD`, a yield-bearing receipt that accrues interest automatically from borrower repayments. Borrowers post a Senior or Junior tranche as collateral and borrow USDr at a dynamic rate driven by aggregate pool utilisation. The pool currently routes through **6 per-tranche adapters** — Senior + Junior across three issuer pools — and new markets ship by adding an adapter without redeploying the pool.

2. **Stability Pool.** The protocol's safety net. Stakers deposit `agYLD` and receive `sagYLD`. When a borrower is liquidated, the SP absorbs the bad debt by burning `agYLD` and receives the seized collateral at a 3–8% discount. That discount accrues as extra yield to SP stakers. Unstake is subject to a 7-day cooldown.

## Per-market debt isolation

This is the part that surprises people coming from Aave. Agama tracks debt **per market**, not per user.

Concretely:

- The `DebtToken` exposes two views:
  - `balanceOf(user, adapter)` — the user's debt **on that specific market**.
  - `balanceOf(user)` — the same user's debt aggregated across all markets they touch.
- Health factors are computed **per market**: the LTV check on jCONDO ignores the borrower's positions on sRESOLV.
- A liquidation on jCONDO seizes only the jCONDO collateral. Other markets are untouched.

This makes the system far less correlated under stress than a cross-margin design: a single bad asset can't force-liquidate a borrower's healthy positions elsewhere. The trade-off is that borrowers can't net collateral across markets — each market stands on its own.

## RWA looping

The core use case is **RWA looping**: collateralise a yield-bearing tranche, borrow stable against it, buy more of the same tranche, repeat. Each loop amplifies exposure to the underlying real-world yield.

```
1. Deposit a yield-bearing RWA paying  x%
2. Borrow stablecoins against it at    y%
3. Buy more of the asset
4. Repeat until reaching                z× leverage
```

In theory this transforms an `x%` real-world yield into:

> ### Net yield = `x + (z − 1) · (x − y)`

| Variable | Meaning                          |
|:--------:|----------------------------------|
| **x**    | base RWA yield                   |
| **y**    | stablecoin borrow rate           |
| **z**    | target leverage                  |

**Worked example.** A Senior tranche yielding **12%**, looped to **3×** leverage against a **10%** stable borrow rate:

```
Net yield = 12 + (3 − 1) · (12 − 10)
          = 12 + 4
          = 16%
```

This is the *theoretical* leveraged yield, the closed-form upper bound at exactly `z` leverage. Reaching `3×` requires roughly a **67%** LTV. Real loops converge geometrically: at the recommended **50%** LTV the terminal leverage is `2×`; at a Senior tranche's `MAX_LTV` of **75%** it's `4×`. Junior tranches cap looping at `MAX_LTV` 50% (terminal `2×`) — wider liquidation bonus, higher discount on stress, lower leverage ceiling. See [Interest Rate Model → Looping viability](/lending-pool/interest-rate-model#looping-viability) for the loop-by-loop table.

The math is the same one used across Aave, Morpho and most leverage strategies. What Agama brings is a venue tuned specifically for RWA collateral, with isolated per-market risk and a Stability Pool sized to absorb liquidations of assets that don't have an on-chain spot market.
