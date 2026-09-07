# Overview

**A synthetic dollar backed by real-world private credit and bonds.**

Agama turns USDC into yield-bearing exposure to real-world lending (private credit and bonds) without a fund subscription, a lock-up negotiation, or picking a single deal blind. Deposit USDC, choose how directly you want to be exposed, and let the protocol do the allocation.

## The problem

Private credit and bonds pay real yield, but that yield is locked behind slow, manual, fund-style access: subscription paperwork, minimum tickets, and settlement cycles measured in weeks. On-chain capital has no fast way in, and no way to diversify across deals without doing that paperwork many times over.

Agama wraps that access in two on-chain primitives: pick a pool directly, or mint a synthetic dollar that is automatically spread across every pool the protocol runs.

## Architecture in one picture

<Diagram src="/images/architecture.png" alt="Lenders deposit USDC directly into Agama Lending Pools (Pool A, Pool B, Pool C: private credit and bonds), or mint agUSD 1:1 against USDC. agUSD auto-allocates across all pools. agUSD can be staked into sagUSD, a yield-bearing token. The Lending Pools deploy capital into private credit and bonds, the real-world yield backing every pool." width="760" />

## Components

The protocol has three parts:

1. **Lending Pools.** Each pool funds one real-world credit or bond exposure: Pool A and Pool B are private credit, Pool C is bonds. Depositing USDC straight into a pool gives targeted exposure to that pool's real-world yield.

2. **agUSD.** A synthetic dollar, minted 1:1 against USDC. Instead of sitting in one pool, agUSD's backing is auto-allocated across every active Lending Pool, a single deposit that spreads across the whole book.

3. **sagUSD.** Stake agUSD to receive sagUSD, a yield-bearing token. Its value accrues over time as the underlying pools collect yield from private credit and bonds, with no separate claim step required.

## Two ways in

Agama deliberately supports both a direct and a diversified path, because they serve different users:

| | Direct pool deposit | agUSD |
|---|---|---|
| **You choose** | A specific pool (private credit or bonds) | Nothing, exposure is spread automatically |
| **Exposure** | Concentrated in one deal | Diversified across every active pool |
| **Best for** | Users with a view on a specific pool | Users who want blended, hands-off exposure |
| **Upgrade path** | n/a | Stake into sagUSD for yield-bearing exposure |

## Where the yield comes from

Every pool's return is ultimately paid by real-world borrowers (private credit obligors or bond issuers), not by protocol emissions or other depositors. The **Private Credit / Bonds** layer in the diagram is that real-world backing: it's what every pool, and by extension agUSD and sagUSD, is earning against. See [Lending Pools](/lending-pools/overview) for how a pool is structured, and [Risks](/risks) for what can go wrong on the real-world side.

## Getting started

- **New users**: read [How It Works](/how-it-works) for a walk-through of both paths: direct pool deposits and minting agUSD.
- **Depositors comparing pools**: [Lending Pools → Overview](/lending-pools/overview).
- **Looking for yield-bearing exposure**: [agUSD](/agusd/overview) and [sagUSD](/sagusd/overview).
