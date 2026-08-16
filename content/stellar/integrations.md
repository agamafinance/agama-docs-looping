# Ecosystem Integrations

Agama composes existing Stellar ecosystem primitives rather than reimplementing solved problems. Each integration serves a specific architectural role and replaces a component that would otherwise be built from scratch.

| Integration | Role | SCF Integration List |
|---|---|---|
| Blend v2 | Lending pools: on-chain yield plus liquidity buffer | Yes |
| DeFindex | Yield vault accounting for sagUSD | Yes |
| Soroswap | AMM pools and Router API | Yes |
| Etherfuse | Stablebonds as Stellar-native RWA collateral | Yes |
| CCTP (Circle) | Native cross-chain USDC bridge | Yes |
| MoneyGram | Retail fiat cash ramp (SEP-24) | Yes |
| Bridge | Institutional fiat ramp (bank wires, ACH) | No |
| Reflector | Oracle price feeds | No |

## Blend v2

Agama uses Blend v2 pools as an allocation target inside the Allocation Engine. Idle vault capital earns Blend supply APY while awaiting private credit deployment, and Blend positions double as the instant-withdrawal liquidity buffer backing the withdrawal queue.

```
Allocation Engine
    ├── allocate(blend_adapter, amount)
    │       └── blend_pool.supply(usdc, amount)
    │               └── Vault receives Blend LP receipt tokens
    ├── deallocate(blend_adapter, amount)
    │       └── blend_pool.withdraw(usdc, amount)
    └── get_exposure(blend_adapter)
            └── reads Blend LP token balance + accrued interest
```

The Blend adapter implements the same interface as the private credit adapters, so pool type stays transparent to the Engine and concentration caps apply identically.

Blend v2 handles interest rate modelling, utilization tracking and liquidation mechanics, all of which are solved problems. Agama's differentiation is the private credit curation layer, not generic lending.

## DeFindex

sagUSD uses DeFindex-compatible vault accounting. `distribute_yield()` increases assets-per-share, the standard DeFindex share-price model, so sagUSD positions are natively readable by any DeFindex-integrated wallet or protocol without additional integration work.

This is interface compatibility, not a protocol-level integration: Agama does not route funds through DeFindex vault contracts.

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
