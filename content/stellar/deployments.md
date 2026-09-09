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
| Vault | Custody, mint, FIFO withdrawal queue | [`CCGPF36P...F5KVRR`](https://stellar.expert/explorer/testnet/contract/CCGPF36PDG2WBBK6ZROLMNMHD67UV4MNG6PHQCN2PXWLLRBXCYF5KVRR) |
| agUSD | SEP-41, minted only by the Vault | [`CCW763RT...U4ALZL`](https://stellar.expert/explorer/testnet/contract/CCW763RTVRDQTEEQ42XCAARSJ42AKWRB2DDM62QV4XVUJFCDAWU4ALZL) |
| sagUSD | SEP-41, DeFindex-compatible shares | [`CCBEDKRQ...L6HFO2`](https://stellar.expert/explorer/testnet/contract/CCBEDKRQHKAP2W3NC4UIYC4WZSMJVYRXN6EQERHFII45M3PD4JL6HFO2) |
| Allocation Engine | Caps and reserve floor, all in bps of total assets | [`CAFJKWLU...SZ5HUX`](https://stellar.expert/explorer/testnet/contract/CAFJKWLUGUSYEC7L5ZBNFIFEPSO5MLI7SKDMVVJCGC6Z2TGVP5SZ5HUX) |
| Oracle Adapter | Per-feed staleness and deviation guards | [`CDV5BC4X...XCSV7G`](https://stellar.expert/explorer/testnet/contract/CDV5BC4XCNT5ASOZNFXBQXRGKVXGKHLRVK5EDX6XP5J6EBIZWSXCSV7G) |

The USDC issuer on Stellar is `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.

## Pool adapters

Both implement the same interface (`allocate`, `deallocate`, `get_exposure`), so the Allocation Engine stays agnostic to pool type.

| Adapter | Settlement | Address |
|---|---|---|
| Private credit | D+15 to D+90, off-chain originator | [`CBAPY7KR...ZGFTOZ`](https://stellar.expert/explorer/testnet/contract/CBAPY7KRVIG3FPGSP3VKXXA6SCDKZUWBSFDWISRJXR5V7PYPVQZGFTOZ) |
| Etherfuse | Instant, on-chain redemption | [`CBA3GQLH...AH7EWI`](https://stellar.expert/explorer/testnet/contract/CBA3GQLHCEOCCZIDVFZ74AG4FUCEO2SN7AMGY4RSAMN4DTHW2WAH7EWI) |

## Superseded deployments

Earlier generations stay on the ledger rather than being deleted from the record. They are listed here so nothing published previously points somewhere unexplained.

| Contract | Address | Why it was superseded |
|---|---|---|
| agUSD, first generation | [`CCXEP6QA...NQ6H3`](https://stellar.expert/explorer/testnet/contract/CCXEP6QAAYEMFMV2JGBULD2NS6AQB6KQSBHLPPBJSDBCN6HOYIHNQ6H3) | A self-contained vault rather than a plain token. It mints only inside its own `deposit()` and exposes no `mint` entry point, so a separate Vault contract cannot mint against a deposit. |
| Vault, first deployments | [`CAVKHGBQ...F5OFJW3`](https://stellar.expert/explorer/testnet/contract/CAVKHGBQUEPVTWHFJGU42ZVZA6VZSM6RZXFHCUXTT72JFRWNPF5OFJW3) and [`CDQP7L5R...B4TR3KS4`](https://stellar.expert/explorer/testnet/contract/CDQP7L5RZ6AM4J2PZETMG7TC4M3CDTVQ6QAMYPLG43Z6GAOCB4TR3KS4) | Each stored a counterparty address at `initialize()` with no setter, so one could never mint and the other could never deploy capital. |
| sagUSD, first deployment | [`CABPYD4U...XTALX`](https://stellar.expert/explorer/testnet/contract/CABPYD4U5FAYLBEBMY2MVGVF7BILXTNPWGLOPIXCMUK3QQGIAE2XTALX) | Accepts the first generation agUSD and stores it at `initialize()` with no setter. It also has **no re-initialization guard**: anyone can call its `initialize` a second time and take it over, so the agUSD it still custodies should be treated as at risk. The current sagUSD rejects a second `initialize` with `AlreadyInitialized`. |
| sagUSD, second and third deployments | [`CDY3ED6T...BTC345`](https://stellar.expert/explorer/testnet/contract/CDY3ED6T72VJDX5RCMQOZNCV5XKJBHQVAYPNOXTWB66RNBVOS5BTC345) and [`CBMEW3QA...WFTHZF`](https://stellar.expert/explorer/testnet/contract/CBMEW3QALCS6FFJMK5FR7LVKUWX3MPIP26LQQQAFYMQFYVG6VUWFTHZF) | The second was replaced within the day after review, because its `set_agusd` guard keyed off the stake counter alone and delivered yield takes custody without touching it. The third exposed `accrue_yield` and `share_price`, the names the contract shipped with, rather than `distribute_yield` and `exchange_rate`, the names Agama committed to. Both were superseded holding nothing: NAV and share supply were zero at each handover. |
| Allocation Engine and pool adapters, first deployments | [`CANDJEHB...KSL2SGS`](https://stellar.expert/explorer/testnet/contract/CANDJEHBZUPGBWQMWM567Z3NQR4AHJKJSMWB4LTXPT6SC7GSRKSL2SGS), [`CCDZRKZD...KCXT3VZ`](https://stellar.expert/explorer/testnet/contract/CCDZRKZDCWJWTFMLVJFW4LRALZEWRDKWOOD727EDO3EFFKLNDKCXT3VZ), [`CBS3OGCV...WKFLYKK`](https://stellar.expert/explorer/testnet/contract/CBS3OGCVYMI3XQN2ORZZNE2WKGYK24VSTVDUB3QS5HCZHBQQFWKFLYKK) | Bound to a superseded Vault at `initialize()` with no setter. Their replacements carry admin-gated setters, guarded so they are refused once the contract holds state the change would invalidate. |

These are testnet contracts and hold no user funds. They are documented rather than removed because a published address that quietly disappears is worse than one explained.

## Credit vaults

Six credit vaults are live on testnet, curated by [Qiro](https://www.qiro.fi/investor) and [Tenka](https://tenka.fi/). Each vault is an independent Soroban contract with its own share token.

These six are deployed instances of an earlier build of the same staking contract that issues sagUSD, from before its yield entry point took the `distribute_yield` name. They answer to `accrue_yield` and to `share_price`, not to `distribute_yield` and `exchange_rate`. Anything integrating against them directly should read the interface each instance publishes rather than assume the sagUSD one.

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
