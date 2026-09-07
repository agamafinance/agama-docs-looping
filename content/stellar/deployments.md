# Deployments

Agama runs natively on Stellar. All protocol logic is implemented as Soroban smart contracts written in Rust and compiled to WASM. Deposits and redemptions settle in native Circle USDC, not a wrapped or synthetic asset.

## Network

| | |
|---|---|
| Network | Stellar Testnet |
| RPC | `https://soroban-testnet.stellar.org` |
| Application | [app.agama.finance/stellar](https://app.agama.finance/stellar) |
| Source | [github.com/agamafinance/agama-soroban](https://github.com/agamafinance/agama-soroban) (Apache-2.0) |

## Core contracts

| Contract | Standard | Address |
|---|---|---|
| USDC (Circle) | Stellar asset contract | [`CBIELTK6...XQDAMA`](https://stellar.expert/explorer/testnet/contract/CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA) |
| agUSD | SEP-41 | [`CCXEP6QA...NQ6H3`](https://stellar.expert/explorer/testnet/contract/CCXEP6QAAYEMFMV2JGBULD2NS6AQB6KQSBHLPPBJSDBCN6HOYIHNQ6H3) |
| sagUSD | SEP-41, DeFindex-compatible shares | [`CABPYD4U...XTALX`](https://stellar.expert/explorer/testnet/contract/CABPYD4U5FAYLBEBMY2MVGVF7BILXTNPWGLOPIXCMUK3QQGIAE2XTALX) |

The USDC issuer on Stellar is `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.

## Credit vaults

Six credit vaults are live on testnet, curated by [Qiro](https://www.qiro.fi/investor) and [Tenka](https://tenka.fi/). Each vault is an independent Soroban contract with its own share token.

| Vault | Curator | Strategy | Share token | Address |
|---|---|---|---|---|
| Payment Financing | Qiro | Short-term payment receivables | qPAY | [`CAUFXVGK...YQEF4`](https://stellar.expert/explorer/testnet/contract/CAUFXVGKB2OKEDDO6SDWH4ZSWXJ37T2WYKEVUTBOCWZAFEUTGCFYQEF4) |
| Private Credit | Qiro | Diversified credit fund | qPCV | [`CADVWAZ3...VECN3`](https://stellar.expert/explorer/testnet/contract/CADVWAZ324KZYLDGYJVHPLQ5BXSQWTWZLH64OHIHIDYPX76BRL7VECN3) |
| Institutional Credit | Qiro | Institutional lender financing | qICV | [`CC3MOBKH...MJBK2`](https://stellar.expert/explorer/testnet/contract/CC3MOBKHGNTHGALTQKZHICW5MYD4VYPGZEA3UC7GFYRK3VYK47EMJBK2) |
| Flagship | Tenka | ABF senior | tFLAG | [`CBOF52TX...ULKKS`](https://stellar.expert/explorer/testnet/contract/CBOF52TX36HR62LX7HVMWMYVPUDBZXTRD74H2Q7NZKLUGAVBNBJULKKS) |
| High Yield | Tenka | ABF mezzanine | tHY | [`CCWXOUPQ...NHOPG`](https://stellar.expert/explorer/testnet/contract/CCWXOUPQFZLGENWWT3JLMXOBDE6N6EE5STS7IHESCADX72DDFUSNHOPG) |
| Deal Vaults | Tenka | Deal-by-deal | tDEAL | [`CBXKGXB4...2IDO5G`](https://stellar.expert/explorer/testnet/contract/CBXKGXB46PD2NDGPS6YRIWJ33A5YEJP5YPYGRBJZTTGWBQ7ASY2IDO5G) |

Every contract above is verifiable on [Stellar Expert](https://stellar.expert/explorer/testnet).

## Wallets

The application connects through the [Stellar Wallets Kit](https://stellarwalletskit.dev/), covering Freighter, xBull, Albedo and Ledger.
