# sagUSD Overview

sagUSD is staked agUSD, and it is the position that earns. Stake agUSD and you receive sagUSD shares at the current exchange rate. Yield arrives by raising that rate, so the shares you hold become redeemable for more agUSD over time.

## Stake and unstake

| Action | Call | Effect |
|---|---|---|
| **Stake** | `stake(from, amount)` | Lock agUSD, receive sagUSD shares at the current rate |
| **Unstake, step 1** | `request_unstake(from, shares)` | Burn the shares now, price them at the current rate, lock the agUSD owed behind the cooldown |
| **Unstake, step 2** | `claim(from)` | Receive that agUSD, once the cooldown has elapsed |

Unstaking is two steps, not one. There is no single `unstake()` call. `request_unstake` burns your shares and fixes what you are owed at the rate showing at that moment; `claim` pays it out after `cooldown()`, which is 60 seconds on testnet.

Pricing at request rather than at claim is the point of the design. If the position were priced when you claimed it, the cooldown would be a free option: you could request an exit, watch the rate for the length of the cooldown, and only take it if the number moved your way. Burning and pricing up front closes that. It also means a position waiting out its cooldown cannot keep earning, be transferred, or be re-requested.

The share accounting follows the same economic convention as DeFindex: distributing yield raises the assets behind each share rather than minting new tokens or rebasing balances, so anything that understands share-price accounting can value the position from the exchange rate alone. That is a shared economic model rather than compatibility with DeFindex's contract interface, and it is not a routing relationship: Agama does not send funds through DeFindex vault contracts, and a DeFindex-integrated wallet would need integration work to read sagUSD. See [Ecosystem Integrations](/stellar/integrations#defindex) for what the two models do and do not share.

## How the yield arrives

Yield is distributed by an authorized distributor calling `distribute_yield()`, which raises the sagUSD/agUSD exchange rate. The distributor is the stored admin in V1, and the call moves that account's own agUSD into the contract, so a distribution cannot invent value, only move it in. That is the entire mechanism.

- **No claim step.** Nothing to harvest, nothing to sign, no reward that expires unclaimed.
- **No rebase.** Your balance does not change. What each share is worth does.
- **No manual compounding.** The next distribution applies to the same shares at the higher rate.

Every distribution moves real agUSD into the contract, so it leaves a SEP-41 `transfer` event on the chain along with the matching move in `nav()` and `exchange_rate()`. The full history is reconstructable from those, rather than taken on trust. A dedicated `yield_distributed` event carrying the amount and the resulting rate in one record is planned, so the reconstruction will not need two sources joined together.

## What moves the rate

The rate tracks what the credit book behind the Vault actually earns: repayments from the [credit vaults](/credit-vaults/overview), and interest from Etherfuse Stablebonds. Private credit repays off-chain on originator terms, so distributions follow settlement cycles rather than a block schedule.

Before a reported value can move accounting, the [Oracle Adapter](/security/oracle) validates it against that feed's staleness threshold and deviation bound. A stale feed does not degrade quietly, it errors, and a report that moves further than the bound allows is rejected rather than stored.

Underperformance works the same way in reverse. Agama does not tranche its own positions in V1, so there is no junior class of holders absorbing a credit loss before it reaches everyone else. See [Settlement & NAV](/security/settlement) for how a default is handled and [Risks](/risks) for what that means in practice.

## Getting out

Leaving fully is two queues, not one. Unstaking returns agUSD through the request and claim pair above, behind the sagUSD cooldown. Converting that agUSD back to USDC then goes through the Vault's own two-step withdrawal queue, which is first in, first out and can take from minutes to weeks depending on where the capital currently sits. See [agUSD](/agusd/overview) for the redemption path and [How It Works](/how-it-works) for the liquidity order the queue draws on.
