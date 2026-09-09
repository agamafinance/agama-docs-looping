# Risks

Holding agUSD or sagUSD is exposure to real-world credit performance, to the contracts that hold and route the capital, and to a small set of privileged keys. This page lists what those are, without softening them. Read it before depositing or staking.

## Off-chain settlement and counterparty risk

This is the largest risk in the protocol and it cannot be removed on-chain.

Private credit instruments settle off-chain. An originator repays in fiat, on its own terms, into a bank account before anything reaches Stellar. The exposure that creates is real: a borrower can default, a repayment can arrive late, and a cross-currency repayment carries FX risk. Those are properties of private credit as an asset class, not of this implementation.

The custody picture follows from that. Idle USDC in the Vault and Etherfuse Stablebond positions are on-chain and non-custodial. Private credit allocations sit off-chain with the originator, governed by legal agreements, and the settlement fiat sits in a bank account controlled by an Agama entity. Two of the four components are therefore custodial.

If a pool defaults, the exposure is written down on-chain through an admin-gated, evented call that moves the Engine's book, the adapter's book and the Vault's deployed capital together, the admin delists the pool, and the existing exposure runs off rather than being force-unwound. A later partial repayment is an ordinary deallocation against whatever exposure remains.

Recognising a loss buys the admin nothing. The write-down lowers what the protocol reports as deployed, and a reserve floor measured against that would fall with it, which would make a fabricated default a way to release cash the floor had already refused. So every write-down is also added to a cumulative loss counter that never falls and stays in the floor's denominator for good. It is also the more honest treatment of a real default: agUSD redeems one for one, so losing assets does not reduce what the Vault owes, and a book in that state should be holding more cash against its liabilities rather than less.

**Who bears that loss is not decided by the contracts, and this page used to say otherwise.** There is no tranching in V1 and no loss-socialisation mechanism either: a deposit mints exactly what was deposited, a queued claim pays exactly what is recorded on it, and no contract reduces either against a loss. The withdrawal queue is paid strictly in order, so a shortfall lands on whoever is at the back of it when the cash runs out. That is a first-mover advantage and a run incentive, and how losses should be shared between agUSD and sagUSD holders remains an open product decision. See [Settlement & NAV](/security/settlement) for the full flow and the custody table.

## Withdrawal queue liquidity

Redemption is not instant, and the docs would be lying if they implied otherwise.

Requesting a withdrawal burns agUSD and puts a numbered claim in a first-in, first-out queue. The claim pays when it reaches the front and the Vault holds enough idle USDC to cover it. How long that takes depends entirely on where the capital currently sits.

| Scenario | Expected wait |
|---|---|
| Vault has idle reserves | Around 5 minutes, next keeper cycle |
| Reserves at the floor, Etherfuse available | Minutes |
| Reserves depleted, only private credit | Days to weeks |

Two properties of the queue are worth understanding before joining it.

- **Strict order, with no exceptions.** No priority tier, no fast lane, and no admin function that reorders it. That is the point of the queue.
- **It cannot be held up by the claim in front of you, though.** An earlier version of this page said an unclaimed position at the head stalls the line and that V1 accepts that cost. It does not, and it no longer has to. `settle_withdrawal()` is permissionless: it pays whichever claim is at the head to the owner recorded on it, with no claim id and no recipient to supply, so anybody can move the queue on without being able to redirect a payment or skip ahead. And a claimant who cannot be paid at all, because USDC is a Stellar asset contract and the destination has no trustline, a frozen one, or a limit below the claim, is stepped over instead of trapping the payout: the claim is marked deferred, stays unpaid, stays owed, and its owner collects it later out of head order.
- **The order is a queue, not a pro-rata.** Under stress, the constraint shows up as waiting time rather than as a partial fill.

An exit that does not queue exists: agUSD trades against USDC on Soroswap. That trades the wait for price risk, since a swap fills at whatever the pool quotes rather than at 1:1.

## Oracle risk

The private credit NAV feed is centralized in V1 and disclosed as such. A single dedicated reporter key, operated by Agama's backend, pushes the value that off-chain originator reporting produces. V2 replaces it with a 2-of-3 multi-reporter quorum; the staleness and deviation guards do not change, only the number of parties needed to push a value.

What bounds that key in the meantime is on-chain and per feed. Every push is checked against the authorized reporter set, against timestamps that must be strictly increasing and never ahead of ledger time, and against the feed's deviation bound: 5% for private credit NAV, 2% for Reflector asset prices, none for deterministic Etherfuse bond pricing. A push outside the bound is not stored. A feed older than its staleness threshold does not degrade quietly either: reads fail with `OracleStale` rather than returning an old number.

The residual risk is misreporting inside the bounds. A reporter, or an originator feeding it, can move NAV by less than the deviation bound repeatedly, and the on-chain guard will not catch that. Backend reconciliation against originator servicing data is the control there, and it is off-chain.

An oracle failure blocks state changes rather than corrupting them. When the reporter is down, withdrawals and allocations revert while deposits and staking keep working. See [Oracle Design](/security/oracle) for the feed table and the failure modes.

## Admin key powers

V1 runs on a 2-of-3 multi-sig, and it is a genuine trust assumption. The admin can pause the protocol, register and delist pools, set the concentration caps and the reserve floor, update the reporter set, and direct allocations.

The bounds matter as much as the powers. There is no function that moves user funds to an arbitrary address: the admin cannot transfer USDC out of the Vault, only instruct an allocation to a pool that is already whitelisted and only within the caps that are already set. The admin cannot mint agUSD, which only the Vault can do, and cannot burn anyone else's, since burning is authorized by the holder. The admin cannot reorder the withdrawal queue. Pausing blocks deposits, withdrawals and new allocations, and leaves staking and oracle updates running, so it is a circuit breaker on capital movement rather than a freeze on accounting.

The powers that remain are still real: an admin that widens the caps and reallocates, or delists a pool, changes the risk of the book. V2 moves the role to governance with a 48 hour timelock. V1 contracts are immutable, so an upgrade means redeployment and migration rather than a silent change under the same addresses.

## What is enforced by contract rather than by policy

Several of the mitigations above are commitments in most protocols. Here they are guards inside `allocate()`, checked in the same transaction as the allocation, with any single failure reverting the whole call:

- a cap on how much any one pool can hold, as a share of net assets
- a cap on everything a single originator fronts, summed across its pools
- a cap per jurisdiction
- a reserve floor, a minimum share of net assets *plus everything ever written off* that the Vault must be left holding as free USDC, 2500 bps on testnet, enforced by the Allocation Engine and again by the Vault itself

Net assets are the denominator of the three caps on purpose, so allocating in small pieces does not get around them; the floor uses that same figure plus recognised losses, so a write-down cannot move it. Caps start at zero and the floor starts at 10000 bps, which is 100%, on deployment, so an Engine that has not been configured cannot deploy capital at all. Every change to a cap or to the floor emits an event.

This does not make the exposure safe. It makes the limits on it readable on-chain by anyone, and enforced without trusting an operator to respect them.

## Smart contract risk

The contracts are on testnet and have not been audited. An external review by OtterSec is scheduled after the testnet code freeze and before mainnet contracts hold user funds, and the report will be published with a remediation log. See [Audit Status](/security/audit) for the scope and process, and [Threat Model](/security/threat-model) for the STRIDE analysis and the test coverage.

All contracts are public at [github.com/agamafinance/agama-soroban](https://github.com/agamafinance/agama-soroban) under Apache-2.0, with no private development phase, so the code can be read now rather than after the fact.
