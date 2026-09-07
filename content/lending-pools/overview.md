# Lending Pools Overview

The Lending Pools are where deposited USDC actually goes to work. Each pool funds a specific kind of real-world exposure, and each is isolated from the others: a shortfall in one pool doesn't touch the capital in another.

## The active pools

| Pool | Type | Description |
|---|---|---|
| **Pool A** | Private credit | Real-world private credit deals |
| **Pool B** | Private credit | Real-world private credit deals |
| **Pool C** | Bonds | Real-world bond exposure |

Private credit and bonds behave differently (different duration, different recovery profile, different sensitivity to rates), which is exactly why Agama keeps them as separate pools rather than one blended fund. See [Risks](/risks) for how those differences show up as risk.

## Two ways capital reaches a pool

1. **Direct deposit.** Depositing USDC straight into a pool gives concentrated exposure to that pool alone.
2. **Via agUSD.** Minting [agUSD](/agusd/overview) auto-allocates the backing across every active pool. Pool-level allocation is handled by the protocol, not the depositor.

Both paths fund the same pools. The difference is whether one depositor's capital lands in a single pool or is spread across all of them.

## Isolation

Each pool's accounting is separate. A pool takes on the real-world credit or bond exposure it was created for, and its performance doesn't cross over into the other pools:

- A direct depositor in Pool A is exposed only to Pool A's performance.
- An agUSD holder is exposed to a blend of every pool, so a single pool underperforming is diluted across the whole allocation rather than concentrated.

## Where the yield comes from

Pools deploy capital into the real-world private credit and bond deals they're built for, and the yield those deals generate flows back to the pool, and from there to direct depositors or to agUSD's backing. There's no protocol emission subsidizing the return; it's a pass-through of real-world yield, net of any protocol costs.

See [agUSD](/agusd/overview) for how pool yield reaches the diversified path, and [sagUSD](/sagusd/overview) for how it compounds once staked.
