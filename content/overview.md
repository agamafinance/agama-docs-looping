# Overview

**Leveraged yield on real-world assets.**

Agama is a lending protocol purpose-built for tokenized RWAs. Holders collateralize their RWA tokens and borrow stablecoins against them. Lenders provide that liquidity and earn interest backed by the performance of real-world credit, receivables, and fund shares.

## The Problem

Tokenized RWAs produce real yield. Holders cannot lever it.

There is no secondary market to sell into. Redemption queues run for weeks. Lending venues built for crypto collateral will not finance an asset they cannot liquidate at block speed — they reject RWA collateral outright, or list it at LTVs so conservative the loop is not economic.

Stablecoin lenders are starved for durable yield. Crypto-backed borrow demand is cyclical and has compressed. The capital is on-chain. The collateral is on-chain. The rails between them are not.

## Components

The protocol has two core components:

1. **Lending Pool** — Lenders deposit stablecoins and receive `agTOKEN`, a yield-bearing receipt that accrues interest automatically from borrower repayments. Borrowers post RWA tokens as collateral and borrow at dynamic rates driven by pool utilization. The protocol supports multiple RWA types as collateral — private credit, receivables, fund shares, tokenized bonds — with new asset classes added over time.

2. **Stability Pool** — The protocol's safety net. Stakers deposit `agTOKEN` and absorb borrower liquidations in exchange for a pro-rata share of seized collateral. They keep earning the base lending yield while staked.

## RWA looping

The core use case is **RWA looping**: collateralize a yield-bearing RWA, borrow stablecoins against it, buy more of the same RWA, repeat. Each loop amplifies exposure to the underlying real-world yield.

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

**Worked example.** An RWA yielding **16%**, looped to **3×** leverage against a **10%** stablecoin borrow rate:

```
Net yield = 16 + (3 − 1) · (16 − 10)
          = 16 + 12
          = 28%
```

Two to three loops can take a base RWA yield to significantly higher net returns after borrowing costs. The math is the same one used across Aave, Morpho and most leverage strategies — what Agama brings is a venue tuned specifically for RWA collateral, with a Stability Pool sized to absorb liquidations of assets that don't have an on-chain spot market.
