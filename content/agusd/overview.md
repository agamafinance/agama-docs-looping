# agUSD — Overview

agUSD is Agama's synthetic dollar: mint it 1:1 against USDC, and its backing is automatically spread across every active [Lending Pool](/lending-pools/overview) — private credit and bonds alike — instead of sitting in a single pool.

## Mint and redeem

| Action | Effect |
|---|---|
| **Mint** | Deposit USDC, receive agUSD 1:1 |
| **Redeem** | Return agUSD, receive USDC back |

There's no pool to pick and no allocation decision to make — minting agUSD is a single deposit that stands in for a diversified position across the whole book.

## Auto-allocation

Once minted, agUSD's backing is auto-allocated across every active Lending Pool. If Agama adds a new pool, agUSD's diversification extends to it automatically — holders don't need to do anything to pick up the new exposure.

This is the core difference from a direct pool deposit ([How It Works → Alice's path](/how-it-works#alice-the-direct-depositor)): a direct depositor is exposed to one pool's performance, while an agUSD holder's exposure is blended across all of them.

## What agUSD is for

- **A diversified base position.** Hold agUSD as a synthetic dollar backed by a spread of real-world private credit and bonds, rather than concentrated in a single deal.
- **A stepping stone to yield.** agUSD itself doesn't compound — [stake it for sagUSD](/sagusd/overview) to start accruing the pools' yield.
- **A transferable unit.** agUSD is a standard token: send it, hold it, or move it elsewhere before deciding whether to stake.

See [Overview](/overview) for how agUSD fits into the wider architecture, and [Risks](/risks) for what backs it and what can go wrong.
