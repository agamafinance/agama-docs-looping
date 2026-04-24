# Overview

Agama is a decentralized lending and borrowing protocol for Brazilian Real World Assets (RWA) on Rayls. It enables qualified investors holding tokenized private credit (AmFi senior tranche, Nimofast receivables) to leverage their positions, while giving retail crypto users access to RWA-backed yield with light-touch KYC.

!!! note

    Agama's architecture is a direct adaptation of the [RAAC Protocol](https://docs.raac.io/) for Ethereum — a production money market with a stability pool backstop. Agama inherits RAAC's design intact and deviates only where Brazilian RWA, Rayls infrastructure, or V1 scope simplifications demand.

## Positioning

| Property              | Value                                                   |
|-----------------------|---------------------------------------------------------|
| Protocol type         | Money market with Stability Pool backstop               |
| Network               | Rayls (EVM L1, Arbitrum-based public chain)             |
| Reserve asset         | USDXP (fiat-backed, XP Inc. / Clear Corretora)          |
| Collateral universe   | AmFi senior tranche, Nimofast receivables               |
| Target TVL (Q1)       | 10M USDXP supply cap                                    |
| Testnet demo          | June 2026                                               |
| Mainnet target        | Q4 2026                                                 |
| Architectural parent  | RAAC Core V1                                            |

## Current state

- Won Rayls hackathon (Cannes, March 2026)
- 200k USD grant from Rayls confirmed
- Rayls public chain mainnet launches 2026-04-30
- Agama testnet target: June 2026
- Mainnet target: Q4 2026

## Core value proposition

**For borrowers (qualified investors)**: leverage existing RWA positions up to ~3.3× via looping, without selling. AmFi senior at ~16% yield, leveraged against a ~10% borrow APY, yields ~19–24% net on original capital depending on loop count.

**For lenders (retail crypto users)**: earn RWA-backed yield through a yield-bearing `agTOKEN` receipt. KYC Light only (2-minute Sumsub flow), geofenced from US and Brazil.

**For Stability Providers**: earn supply APY + share of liquidation collateral. SP depositors take `agTOKEN` and stake it into the SP to receive `agaSP` (1:1, non-transferable).

## Scope of this document

This documentation is a **V1 specification**. It covers:

- Smart contract architecture
- Function signatures, access control, invariants
- Compliance and KYC integration
- Governance and emergency procedures
- Deployment and parameters

It does **not** cover tokenomics, incentives, or governance tokens. **V1 ships without any native token.** Any future token is out of scope for this specification.

## Using this documentation

- **Developers**: start here → [Introduction](/docs/introduction) → contracts.
- **Integrators (new adapters)**: see the [Asset Adapter Interface](/docs/adapters/interface).
