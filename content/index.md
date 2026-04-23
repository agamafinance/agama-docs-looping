# Documentation | Agama

Welcome to the Agama Protocol documentation. Agama is a decentralized lending and borrowing protocol for Brazilian Real World Assets (RWA) on Rayls. It enables qualified investors holding tokenized private credit (AmFi senior tranche, Nimofast receivables) to leverage their positions, while giving retail crypto users access to RWA-backed yield with light-touch KYC.

Agama's architecture is a direct adaptation of [RAAC Protocol](https://docs.raac.io/) for Ethereum — a production money market with a stability pool backstop. Agama inherits RAAC's design intact and deviates only where Brazilian RWA specifics, Rayls infrastructure, or V1 scope simplifications demand it.

## Core V1

The protocol is composed of three core components, three compliance primitives, and three collector contracts.

### Core components

- **[Lending Pool](core/lending-pool/overview.md)** — Handles deposits, borrowing, interest, and liquidations. Delegates collateral logic to adapters.
- **[Stability Pool](core/stability-pool/overview.md)** — Liquidation backstop; accepts `agTOKEN` (not USDXP), issues `agaSP` 1:1 share token.
- **[Settlement Vault](core/settlement-vault/overview.md)** — Agama-specific: holds seized collateral, applies split, queues off-chain issuer redemption, auto-reconstitutes Stability Pool.

### Adapters

- **[AmFi Adapter](core/adapters/amfi.md)** — AmFi senior tranche ERC-20 tokens.
- **[Nimofast Adapter](core/adapters/nimofast.md)** — Nimofast receivables tokens.
- **[Asset Adapter Interface](core/adapters/interface.md)** — Uniform interface between the Lending Pool and each collateral asset.

### Tokens

- **[agTOKEN](core/tokens/agtoken.md)** — Yield-bearing ERC-4626 receipt for lenders.
- **[DebtToken](core/tokens/debt-token.md)** — Non-transferable, scaled debt tracker.
- **[agaSP](core/tokens/agasp.md)** — Stability Pool share, 1:1 with `agTOKEN`.
- **[USDXP](core/tokens/usdxp.md)** — Rayls-native stablecoin (XP Inc. / Clear).

### Compliance

- **[KYC Registry](core/compliance/kyc-registry.md)** — Sumsub KYC Light for retail lenders and SP providers.
- **[Qualified Investors](core/compliance/qualified-investors.md)** — Issuer-side QI whitelist for borrowers.

### Collectors

- **[Fee Collector](core/collectors/fee-collector.md)** — Pull-based fee router.
- **[Treasury](core/collectors/treasury.md)** — Whitelisted operational reserves.
- **[Reserve Fund](core/collectors/reserve-fund.md)** — Bad-debt buffer with double-timelocked outflows.

## Getting started

| I am a…         | Start here                                                  |
|-----------------|-------------------------------------------------------------|
| Developer       | [Core V1 Introduction](core/introduction.md) → each component → its Functions page |
| Auditor         | [Security Overview](security/overview.md) + [Invariants](security/invariants.md) + [RAAC Mapping](core/appendix/raac-mapping.md) |
| Adapter integrator | [Asset Adapter Interface](core/adapters/interface.md) + [For Issuers](integrate/for-issuers.md) |
| Institutional partner | [For Institutions](integrate/for-institutions.md) |

## Getting support

- Documentation issues: open an issue on the docs repository.
- Security disclosures: see [Bug Bounty](security/bug-bounty.md).
- Integration questions: `integrations@agama.fi` (or TBD channel).
