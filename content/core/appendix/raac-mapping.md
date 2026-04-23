# Appendix A — RAAC Mapping

Every Agama contract maps back to a RAAC equivalent (where one exists). When implementing or auditing, open both side-by-side.

## 1:1 equivalents

| Agama contract              | RAAC equivalent                          | Source URL                                                                                     |
|-----------------------------|------------------------------------------|------------------------------------------------------------------------------------------------|
| `AgamaLendingPool`          | `LendingPool`                            | [lending-pool](https://docs.raac.io/lending-pool/) · [functions](https://docs.raac.io/lending-pool-functions/) |
| `AgamaStabilityPool`        | `StabilityPool`                          | [stability-pool](https://docs.raac.io/stability-pool/) · [functions](https://docs.raac.io/stability-pool-functions/) |
| `IAssetAdapter` + adapters  | `IAssetAdapter` + adapters                | [adapter-interface](https://docs.raac.io/lending-pool-asset-adapter-interface/)                 |
| `agTOKEN`                   | `rToken`                                  | (spec in Lending Pool docs)                                                                    |
| `DebtToken`                 | `DebtToken`                               | (spec in Lending Pool docs)                                                                    |
| `agaSP`                     | `deToken`                                 | (spec in Stability Pool docs)                                                                  |
| `AgamaFeeCollector`         | `FeeCollector`                            | [fee-collector](https://docs.raac.io/fee-collector/)                                           |
| `AgamaTreasury`             | `Treasury`                                | [treasury](https://docs.raac.io/treasury/)                                                     |
| `AgamaInterestRateModel`    | (embedded in LendingPool via ReserveLibrary) | [parameters-core](https://docs.raac.io/parameters-core/)                                   |
| `LiquidationProxy`          | `LiquidationProxy`                        | (spec implied in Liquidations docs)                                                            |

## Adapted (structurally equivalent but modified)

| Agama contract              | RAAC equivalent                          | Notes                                                                                           |
|-----------------------------|------------------------------------------|-------------------------------------------------------------------------------------------------|
| `AgamaSettlementVault`      | `RWAVault` + `LiquidationSwap`            | Merged into one contract, swap leg replaced with off-chain issuer redemption.                   |

## Agama-only (new primitives)

| Agama contract              | Rationale                                                                                       |
|-----------------------------|-------------------------------------------------------------------------------------------------|
| `AgamaReserveFund`          | Explicit bad-debt buffer. RAAC relies on redistribution only.                                   |
| `AgamaKYCRegistry`          | RAAC does not include a KYC registry in V1 — Agama needs one for retail KYC Light gating.      |

## Out of scope for V1 (no Agama equivalent)

| RAAC component              | Reason for exclusion in V1                              |
|-----------------------------|---------------------------------------------------------|
| `iREET` RWA Index Token     | V1 does not tokenize the collateral basket.             |
| RAAC NFT                    | Real estate-specific.                                   |
| Chainlink VRF integration   | V1 has no NFT redemption.                               |
| Real Estate Oracle          | V1 consumes issuer-provided oracles.                    |
| Prime Rate Oracle           | V1 uses a static kink model, not prime-pegged rates.    |
| crvUSD Oracle               | USDXP has no oracle yet; V1 trusts 1:1.                 |
| Cork integration            | Not available on Rayls; V2 target.                      |
| `borrowWithInsurance`       | V2.                                                     |
| `repayOnBehalf`             | V2.                                                     |
| NFT Royalty Fee Collector   | Real-estate specific.                                   |
| PSM Vault                   | Not applicable.                                         |
