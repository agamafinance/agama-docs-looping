# sagUSD Overview

sagUSD is staked agUSD, and it is the position that earns. Stake agUSD and you receive sagUSD shares at the current exchange rate. Yield arrives by raising that rate, so the shares you hold become redeemable for more agUSD over time.

## Stake and unstake

| Action | Effect |
|---|---|
| **Stake** | Lock agUSD, receive sagUSD shares at the current rate |
| **Unstake** | Burn shares, receive agUSD back at the current rate |

The share accounting follows the DeFindex convention: distributing yield increases assets per share rather than minting new tokens. sagUSD positions are therefore readable by any DeFindex-integrated wallet or protocol without extra integration work. This is interface compatibility, not a routing relationship: Agama does not send funds through DeFindex vault contracts.

## How the yield arrives

Yield is distributed by an authorized distributor calling `distribute_yield()`, which raises the sagUSD/agUSD exchange rate. That is the entire mechanism.

- **No claim step.** Nothing to harvest, nothing to sign, no reward that expires unclaimed.
- **No rebase.** Your balance does not change. What each share is worth does.
- **No manual compounding.** The next distribution applies to the same shares at the higher rate.

Every distribution emits an event carrying the amount and the resulting exchange rate, so the full history of the share price can be reconstructed from the chain rather than taken on trust.

## What moves the rate

The rate tracks what the credit book behind the Vault actually earns: repayments from the [credit vaults](/credit-vaults/overview), and interest from Etherfuse Stablebonds. Private credit repays off-chain on originator terms, so distributions follow settlement cycles rather than a block schedule.

Before a reported value can move accounting, the [Oracle Adapter](/security/oracle) validates it against that feed's staleness threshold and deviation bound. A stale feed does not degrade quietly, it errors, and a report that moves further than the bound allows is rejected rather than stored.

Underperformance works the same way in reverse. There is no tranching in V1, so a credit loss is not absorbed by a junior class before it reaches holders. See [Settlement & NAV](/security/settlement) for how a default is handled and [Risks](/risks) for what that means in practice.

## Getting out

Unstaking returns agUSD. Converting that agUSD back to USDC goes through the Vault's two-step withdrawal queue, which is first in, first out and can take from minutes to weeks depending on where the capital currently sits. See [agUSD](/agusd/overview) for the redemption path and [How It Works](/how-it-works) for the liquidity order the queue draws on.
