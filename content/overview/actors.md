# The three actors

Every flow in Agama is driven by one of three actor types. Understanding their incentives, KYC paths, and interaction surface is prerequisite for reading the rest of the docs.

## Alice — Borrower (qualified investor)

| Attribute         | Value                                              |
|-------------------|----------------------------------------------------|
| KYC'd by          | **Issuer** (AmFi or Nimofast), not Agama            |
| Holds             | RWA tokens (e.g., AmFi senior tranche)              |
| Goal              | Leverage her position without selling               |
| Entry point       | `openVaultPosition()` → `depositAsset()` → `borrow()` |

Alice is a **qualified investor** in the Brazilian sense: gross income ≥ R$ 200k/year or institutional holdings ≥ R$ 1M. She is KYC'd by the issuer already — Agama does not re-verify her. Instead, the adapter queries the issuer's QI whitelist on every interaction.

### Typical loop

!!! note

    Alice's leverage cap is not a protocol-enforced number; it's the mathematical limit implied by the LTV. With AmFi's 70% LTV, infinite loops converge to ~3.33× leverage.

```
Initial position: 1,000,000 AMFI_SENIOR (yield ~16% APY)

Loop 1: deposit 1M → borrow 500k USDXP (50% LTV) → re-stake at AmFi → gain 500k AMFI
Loop 2: deposit 500k → borrow 250k USDXP → re-stake → gain 250k AMFI
Loop 3: deposit 250k → borrow 125k USDXP → re-stake → gain 125k AMFI

Terminal: ~2.1M AMFI collateral, ~1.05M USDXP debt
Net APY ≈ (16% × 2.1) − (10% × 1.05) ÷ 1.0 initial = 22.5%
```

## Bob — Lender

| Attribute         | Value                                              |
|-------------------|----------------------------------------------------|
| KYC'd by          | **Agama KYC Light** (Sumsub flow, 2-min)            |
| Deposits          | USDXP                                               |
| Receives          | `agTOKEN` (yield-bearing ERC-4626)                  |
| Goal              | Earn supply APY on USDXP, backed by RWA             |
| Geofence          | No US, no Brazil                                    |

Bob is a retail crypto user seeking RWA yield. He completes a light-touch KYC (liveness + ID + sanctions + geofence) and deposits USDXP into the Lending Pool. His `agTOKEN` appreciates as Alice (and other borrowers) pay interest.

Bob can exit at any time (subject to pool utilization). His `agTOKEN` is standard ERC-20 — composable elsewhere on Rayls DeFi.

## Charlie — Stability Provider

| Attribute         | Value                                              |
|-------------------|----------------------------------------------------|
| KYC'd by          | **Agama KYC Light** (same as Bob)                   |
| Deposits          | `agTOKEN` (obtained from Lending Pool first)        |
| Receives          | `agaSP` (1:1, non-transferable)                     |
| Goal              | Supply APY + share of seized collateral             |
| Withdrawal        | 30-min timelock + 2-day execution window            |

Charlie must be a lender first: he deposits USDXP into the Lending Pool to receive `agTOKEN`, then deposits that `agTOKEN` into the Stability Pool to receive `agaSP`.

!!! warning

    The Stability Pool accepts **`agTOKEN`**, not USDXP. This is deliberate — it preserves Charlie's supply yield (via `agTOKEN` appreciation) while also positioning him to absorb liquidations. This is the single most frequently misunderstood aspect of RAAC-style designs.

### Charlie's expected yield

Two components:

1. **Supply APY** via `agTOKEN` appreciation — same as Bob.
2. **Liquidation gains** — when Alice gets liquidated, Charlie shares pro-rata in the seized collateral's recovery value beyond the debt absorbed.

Expected liquidation gain modelling (from [Design Review](../challenges.md#sp-economics)):

```
Assume: 3% of outstanding loans liquidated per year,
         5% average liquidation bonus captured,
         80% of bonus net of fees reaches SP depositors.

Expected SP yield boost = 3% × 5% × 80% = 0.12% per year
                        + supply APY (e.g. 6.8% at optimal utilization)
                        = ~6.92% SP APY
```

!!! warning

    This is thin. Our [Design Review #2](../challenges.md#sp-economics) recommends boosting SP attractiveness by reallocating a portion of `reserveFactor` directly to SP depositors.

## Who is out of scope

- **US persons**: geofenced.
- **Brazilian retail**: geofenced (regulatory — CVM would apply).
- **Non-whitelisted QIs**: cannot borrow (adapter reverts).
- **Protocol contracts** (yield aggregators, etc.): V1 requires EOA KYC. Protocol integrations deferred to V2.
