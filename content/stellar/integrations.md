# Ecosystem Integrations

Agama composes existing Stellar ecosystem primitives rather than reimplementing solved problems. Each integration serves a specific architectural role and replaces a component that would otherwise be built from scratch.

## Current integrations

| Integration | Role | SCF Integration List |
|---|---|---|
| DeFindex | Shared share-price accounting convention for sagUSD, no contract calls | Yes |
| Soroswap | AMM pools and Router API | Yes |
| Etherfuse | Stablebonds as Stellar-native RWA collateral | Yes |
| CCTP (Circle) | Native cross-chain USDC bridge | Yes |
| MoneyGram | Retail fiat cash ramp (SEP-24) | Yes |
| Bridge | Institutional fiat ramp (bank wires, ACH) | No |
| Reflector | Oracle price feeds | No |

## Revision, September 2026: Blend v2 removed

Blend v2 was previously used as an allocation target for idle capital and as the instant-withdrawal liquidity buffer. Following the Comet BLND-USDC exploit and the wind-down of Blend v2, it was removed from the SCF Integration List, and Agama removed the integration from its architecture and from its grant proposal.

It is not replaced by another protocol. The liquidity-buffer role moves inside Agama's own [Allocation Engine](/stellar/contracts#allocation-engine) as a reserve floor enforced at contract level, set as a minimum share of net assets rather than as a fixed sum: an allocation reverts if the call would leave free reserves below `reserve_floor_bps()` of `floor_base()`, 2500 bps on testnet, and the Vault enforces the same floor again against its own book when it releases the cash. That base is measured on the cash the Vault can account for from its own flows rather than on its raw balance, so USDC arriving without the books being told counts for nothing until something books it: an invariant fuzzer found that a base built on the balance could be lowered by booking the same dollar twice. Fast-exit liquidity is therefore a protocol parameter anyone can read on-chain, rather than a position held inside a third party.

Blend v2 appears nowhere else in these docs: not as an allocation target, not as a pool adapter, not as a liquidity source. See [Threat Model](/security/threat-model) for the current withdrawal liquidity order.

## DeFindex

sagUSD follows the same economic convention as DeFindex: yield accrues by raising the assets behind each share, rather than by minting new shares or rebasing balances. `distribute_yield()` moves agUSD into the contract and `exchange_rate()` rises; no holder's balance changes. Anything that understands share-price accounting can value a sagUSD position from that one number.

This is a shared accounting model, not call-level compatibility, and not a protocol-level integration. Agama does not route funds through DeFindex vault contracts, and nothing in Agama depends on a DeFindex deployment.

Being precise about what the shared convention is not, because the claim is checkable: DeFindex's own vault interface publishes neither `distribute_yield` nor `exchange_rate`. It is multi-asset, `get_asset_amounts_per_shares` returns one amount per underlying asset rather than a scalar price per share, and it has no vault-level yield distribution entry point. A DeFindex-integrated wallet would therefore need integration work to read sagUSD, exactly as it would for any share-based vault outside DeFindex's own deployments. What is genuinely shared is the economics, and that part is not a small thing: shares are never rebased, nothing is pushed to holders, and a position appreciates because the assets behind each share grow. DeFindex remains the reference point the model was taken from.

Verified against [`vault/src/interface.rs`](https://github.com/defindex-io/stellar-contracts/blob/main/vault/src/interface.rs) in `defindex-io/stellar-contracts`, the live repository, in September 2026. The former `paltalabs/defindex` repository was archived in July 2026.

## Soroswap

Soroswap is the primary liquidity venue for agUSD/USDC and sagUSD/agUSD. The application integrates the Soroswap Router API for swap routing across Stellar liquidity sources.

The agUSD/USDC pool enables peg arbitrage in both directions: mint at 1:1 through the Vault and sell on Soroswap when above peg, buy on Soroswap and redeem when below.

### Classic and Soroban transaction constraint

A Stellar transaction containing `InvokeHostFunction` cannot include Classic operations such as path payments or DEX offers in the same transaction.

| Path | Mechanism | Composable with contracts |
|---|---|---|
| Soroban (primary) | Swaps via Soroswap Router, single Soroban transaction | Yes, deposit and swap in the same transaction |
| Classic (secondary) | Trading agUSD on the Stellar DEX order book | No, separate transaction |

The application supports both paths and does not claim atomicity between them.

## Etherfuse

Etherfuse Stablebonds are Stellar-native tokens backed by government bonds with embedded yield. They are Agama's first-day RWA collateral.

- A live vault at mainnet launch without depending on off-chain credit tokenization.
- A low-risk base yield layer complementing higher-yield private credit.
- Proof that the Allocation Engine generalizes across RWA types.

Stablebond NAV is deterministic from public bond pricing, so the oracle staleness threshold is relaxed to 48 hours and no deviation bound applies.

## CCTP

Circle's Cross-Chain Transfer Protocol provides native 1:1 USDC bridging from Ethereum, Arbitrum and Base. No wrapped tokens, no third-party bridge risk.

CCTP runs natively on Soroban. Stellar is CCTP domain 27, and `TokenMessengerMinter`, `MessageTransmitter` and `CctpForwarder` are deployed on both Stellar Testnet and Mainnet, so the bridge path can be built and validated on testnet before it ever touches mainnet.

```
LP on Ethereum
    ├── initiates CCTP burn (USDC burned on source chain)
    ├── Circle attestation service confirms burn
    └── LP mints USDC on Stellar
            └── deposits into Agama Vault, receives agUSD
```

The application exposes this through a Bridge tab built on Circle's Bridge Kit SDK.

## MoneyGram and Bridge

**MoneyGram (SEP-24)** is the retail cash on and off-ramp, covering 180+ countries through interactive anchor flows. Integration sits at the backend level via a SEP-24 adapter.

**Bridge** is the multi-currency institutional ramp for bank wires and ACH, integrated through its REST API for payout initiation and webhook callbacks.

Together they let a user move from physical cash to a yield-bearing RWA position without touching a centralised exchange, a capability Stellar has and most ecosystems do not.

## Reflector

Reflector is the decentralized push-based oracle network on Stellar. Agama consumes its USDC/USD and XLM/USD feeds for asset price validation. See [Oracle Design](/security/oracle) for the staleness and deviation guards applied to each feed.
