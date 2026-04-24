# Nimofast Adapter

`NimofastAdapter` handles Nimofast Global's tokenized receivables. Same structure as the [AmFi Adapter](amfi.md), with more conservative risk parameters due to higher asset volatility and less track record.

## About Nimofast

[Nimofast Global](https://www.manilatimes.net/2026/01/15/tmt-newswire/globenewswire/nimofast-global-platform-to-tokenize-us-100-billion-in-real-world-energy-commodities-assets-in-brazil-using-rayls/2259540) is an institutional platform launched Q1 2026 to tokenize Brazilian energy, commodities, and agribusiness receivables. Built with Parfin on Rayls.

Target market: US$ 100B+ of Brazilian real-economy cash flows.

Redemption semantics: per-product, generally D+N where N depends on the underlying asset's payment cycle (typically 30–90 days for receivables).

## Risk parameters

| Parameter                | Value    | Reasoning                                                   |
|--------------------------|----------|-------------------------------------------------------------|
| `MAX_LTV`                | 6500 bps (65%) | More conservative than AmFi; receivables more volatile. |
| `LIQUIDATION_THRESHOLD`  | 7500 bps (75%) | 10% buffer.                                             |
| `LIQUIDATION_BONUS`      |  700 bps (7%)  | Higher bonus to compensate slower redemption.           |
| `ORACLE_STALENESS_MAX`   | 48 hours       | Nimofast NAV updated daily (to confirm).                |

## Integration points

- **Oracle**: `INimofastPriceOracle(oracle).getPrice()`.
- **QI whitelist**: `INimofastWhitelist(whitelist).isQualifiedInvestor(user)`.
- **Token**: Nimofast receivables ERC-20 (validated during adapter registration).

Otherwise identical to `AmFiAdapter`. See [AmFi Adapter](amfi.md) for function-level details.

## V1 readiness

!!! warning

    Nimofast Global was in "advanced phase of technological, legal, and operational structuring" as of Q1 2026. Agama's Nimofast adapter launches only after Nimofast's on-chain oracle and QI whitelist are live and stable. Expect this adapter to ship 2–4 weeks after the AmFi adapter.

