# How It Works

Agama has one action, deposit USDC, and two ways to take it. **Alice** wants targeted exposure and picks a pool directly. **Bob** wants diversified, hands-off exposure and mints agUSD, then stakes it for yield.

## Alice, the direct depositor

| Attribute | Value |
|---|---|
| Deposits | USDC, directly into one Lending Pool |
| Receives | A claim on that pool's real-world yield |
| Exposure | Concentrated in a single pool (private credit or bonds) |
| Goal | Targeted exposure to a specific deal she has a view on |

Alice has looked at Agama's active pools and prefers Pool A, a private-credit pool, over the bonds pool. She deposits USDC directly into Pool A. Her return depends entirely on how Pool A's underlying private-credit book performs. She isn't exposed to Pool B or Pool C at all.

This path suits depositors who want to underwrite a specific pool rather than take the blended average across all of them. See [Lending Pools](/lending-pools/overview) for what distinguishes the pools from each other.

## Bob, the diversified depositor

Bob's flow has two steps. Step 1 is the baseline position; Step 2 is optional and layers on top.

### Step 1. Mint agUSD (required)

| Attribute | Value |
|---|---|
| Deposits | USDC |
| Receives | agUSD, 1:1 |
| Exposure | Auto-allocated across every active Lending Pool |
| Exit | Redeem agUSD back to USDC |

Bob deposits USDC and mints agUSD 1:1. He doesn't pick a pool: the protocol spreads his backing across Pool A, Pool B, and Pool C automatically. If one pool underperforms, it's a fraction of his exposure, not all of it. See [agUSD](/agusd/overview) for the full mechanics.

### Step 2. Stake for sagUSD (optional)

| Attribute | Value |
|---|---|
| Deposits | agUSD (from Step 1) |
| Receives | sagUSD |
| Yield | Accrues as the underlying pools earn from private credit and bonds |
| Exit | Unstake back to agUSD |

Bob can leave his agUSD as a flat, transferable synthetic dollar, or stake it for sagUSD to start compounding the blended pool yield. Unlike Alice, Bob never has to think about which pool is doing well, because sagUSD's value reflects the pools' combined performance. See [sagUSD](/sagusd/overview) for how the yield-bearing mechanics work.

## Choosing a path

| | Alice's path (direct) | Bob's path (agUSD → sagUSD) |
|---|---|---|
| Decision required | Which pool | None, diversified by default |
| Concentration | Single pool | Spread across all active pools |
| Yield-bearing token | No, a direct pool position | Yes, once staked into sagUSD |
| Best for | A specific view on one pool | Hands-off, blended exposure |

Both paths draw on the same underlying pools and the same real-world yield. The difference is how much of the allocation decision Agama makes for you. See [Overview](/overview) for the architecture that ties both paths together, and [Risks](/risks) for what to weigh before depositing either way.
