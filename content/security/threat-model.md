# Threat Model

The protocol is modelled with STRIDE. Each threat below maps to a mitigation that exists in the contracts, not to a policy.

## STRIDE

| Category | Threat | Mitigation |
|---|---|---|
| Spoofing | Unauthorized agUSD mint | `mint` restricted to the recorded minter, the Vault, and `set_minter` closes at the first mint. `burn` is holder-authorized and cannot inflate supply. `require_auth()` on all functions. |
| Spoofing | Fake oracle reporter | Authorized reporter set. `push_nav()` validates the caller. Rotation requires admin plus an event. |
| Tampering | NAV manipulation | Deviation bounds reject anything above 5%. Two-step confirmation for large changes. |
| Tampering | Allocation to a compromised pool | On-chain concentration caps per pool, originator and jurisdiction, plus the reserve floor. `allocate()` reverts if any is exceeded, and `register_pool` refuses an adapter that does not name this Engine and this Engine's Vault. The caps are measured on what a pool holds plus what has been written off against it and not recovered, so a default consumes a limit rather than freeing one. |
| Tampering | Hostile or mis-wired Allocation Engine | The Vault enforces the reserve floor itself in `settle_allocation`, against its own deployed capital book, which no Engine can write to. Asking an incoming Engine whether it governs this Vault catches mis-wiring and nothing more: any contract that stores one address answers correctly. |
| Tampering | Exposure that no longer exists | `write_down` recognises a credit loss on-chain, admin-gated and evented, so the reserve ratio stops overstating the book by the size of the loss. `recover` books the cash if it comes back, against the Vault's own balance rather than an assertion. |
| Elevation of privilege | A write-down used to create room under the reserve floor | Recognised losses stay in the floor's denominator until the cash comes back, and the one call that takes them out of it puts the same amount into free reserves in the same transaction. A write-down lowers net assets and does not lower the base the floor is a share of, so alternating `allocate` and `write_down` releases nothing an honest single allocation would not have. |
| Denial of service | Withdrawal queue stall | `settle_withdrawal()` is permissionless and pays the head claim to its recorded owner, so a claimant who never returns cannot hold the queue behind them. |
| Denial of service | Withdrawal queue freeze on an undeliverable payout | Delivery is attempted rather than assumed. USDC is a Stellar asset contract, so a payout fails if the destination has no trustline, a frozen one, or a limit below the claim; the claim is then deferred and stepped over, unpaid and still owed, rather than trapping the call. |
| Denial of service | Withdrawal queue stall on an archived claim record | A claim record is persistent, bumped for 90 days, and written only when something happens to it, and an archived entry cannot be read at all, which stopped the queue at the head. `bump_claim` postpones the archival and needs no authorization, because the caller chooses nothing and pays the rent. |
| Elevation of privilege | Admin key lost or compromised, permanently | Every contract carries a two-step handover, `propose_admin` then `accept_admin`, with the successor authorizing the second step itself. |
| Repudiation | Originator denies allocation | Soroban events on every `allocate` and `deallocate`, indexed with block provenance. |
| Repudiation | Disputed yield | Every distribution moves real agUSD in, leaving a SEP-41 `transfer` event and a matching move in `nav()` and `exchange_rate()`. Fully reconstructable. A dedicated `yield_distributed` event is planned. |
| Info disclosure | LP position exposure | Public chain by design. No private data in contracts. |
| Denial of service | Withdrawal queue flood | Minimum amount plus agUSD burn cost. TTL on claim records. |
| Denial of service | Oracle starvation | Deposits and stakes continue. Only withdrawals and allocations revert. Admin updates the reporter set. |
| Elevation of privilege | Admin key compromise | Admin cannot transfer USDC directly. Only `allocate()`, which is cap-bound and floor-bound at both the Engine and the Vault, or `pause()`. Multi-sig 2-of-3. |

The elevation-of-privilege row is the one worth reading twice. A compromised admin key cannot drain the vault, because there is no function that moves user funds to an arbitrary address. The worst available action is allocating within existing caps to an already-whitelisted pool, or pausing the protocol.

## Access control

| Role | V1 holder | Permissions | Evolution |
|---|---|---|---|
| Admin | 2-of-3 multi-sig | Pause, register pools, set caps, set the reserve floor in bps, write down a defaulted exposure, sweep an adapter's surplus home to the Vault, repoint counterparties while the guards allow it, update reporters, propose a successor admin | Governance plus 48h timelock |
| Reporter | Dedicated hot wallet | Push NAV to the oracle | Multi-reporter quorum (2-of-3) |
| Yield Distributor | Same as Admin in V1 | `distribute_yield()`, which moves the distributor's own agUSD | Dedicated service key, then keeper network |
| Curator | Same as Admin in V1 | Whitelist pools, risk parameters | Independent risk committee |

## Pausability

When paused, deposits, withdrawal *requests* and new allocations are blocked. Withdrawal *payouts* are not, and that asymmetry is deliberate: a withdrawal request burns the agUSD as it queues the claim, so pausing the payout would leave the holder with neither the token nor the cash for as long as the switch stayed on. Stopping the flows that create new obligations is what a breaker is for; refusing to honour obligations already on the books is something else. Staking, both steps of unstaking, and oracle updates all continue. Pausing is a circuit breaker on capital movement, not a freeze on accounting.

## Admin rotation

Every contract carries a two-step handover. `propose_admin(admin, new_admin)` records a successor and changes nothing; `accept_admin(new_admin)` moves the role, and only the proposed address can call it, authorizing for itself. Two steps rather than one, because a single-call setter aimed at an address nobody controls produces the unrecoverable state rotation exists to fix, in one transaction, with no second chance. Requiring the successor's own signature is the only available proof that the key is real and reachable.

There is no cancel entry point and there does not need to be one: a proposal replaces any earlier one, a pending admin can do nothing until it accepts, and an admin withdrawing a proposal proposes itself.

## Withdrawal queue

The queue is a two-step FIFO. `request_withdrawal` burns agUSD and creates a persistent claim record. `claim_withdrawal` pays USDC once the claim is Ready. It cannot be held up by the claim in front: `settle_withdrawal()` is permissionless and pays the head claim to its recorded owner, and a claim the USDC contract refuses to deliver is deferred and stepped over rather than trapping the payout, unpaid and still owed, for its owner to collect out of head order later.

Liquidity is drawn in priority order: free USDC reserves held above the on-chain reserve floor, 2500 bps of net assets on testnet, then new deposits, then Etherfuse Stablebond redemption (on-chain, instant), then private credit repayment (off-chain, D+15 to D+90).

The reserve floor is enforced by the Allocation Engine, not by policy: `allocate()` reverts if a call would leave the Vault holding less free USDC than `reserve_floor_bps()` of `floor_base()`, which is net assets plus what has been written off and not recovered. It is enforced a second time by the Vault, against its own deployed capital book, because the Engine is only an address the Vault authorizes and a limit enforced solely in the Engine is one that any contract holding that authorization can skip. Fast-exit liquidity is therefore a protocol parameter anyone can read on-chain, rather than a position held inside another protocol.

The floor is a share of that base, not a fixed sum, and that unit is the substance of it. Written as an amount it would be most of a small book and a rounding error in a large one, and it would need re-tuning by hand each time the protocol grew. Withdrawal pressure scales with the book, so the cash held back against it scales too. `get_reserve_ratio()` reports what free reserves actually are as a share of the same base, in the same basis points the floor is set in, so the limit and the reality can be compared directly. The base carries recognised losses until the capital behind them actually comes back, which is what stops a write-down, an admin call that moves no cash, from lowering the floor along with the book. A recovery takes a loss out of the base and puts the cash into free reserves in the same transaction, so the base does not fall on that call either.

Net, not gross, on both sides. A withdrawal request burns its agUSD immediately and leaves the USDC in the Vault until the claim is paid, so between those two moments the money is on the balance sheet and already owed. Counting it as reserve let a Vault with every dollar queued for withdrawal report a healthy ratio and still deploy against it.

| Scenario | Expected wait |
|---|---|
| Vault has idle reserves | Around 5 minutes, next keeper cycle |
| Reserves at the floor, Etherfuse available | Minutes |
| Reserves depleted, only private credit | Days to weeks |

Safeguards: minimum withdrawal amount as anti-dust, queue depth monitoring that triggers proactive Etherfuse redemption, strict FIFO with no priority and no jumping including by admin, no way to stall it and no way to freeze it on an undeliverable payout, and no claim expiry.

## Test coverage

End-to-end flows (deposit, stake, yield, redeem), cap-violation rejection, re-initialization guards, access control with targeted authorizations rather than a blanket mock, zero and negative validation, oracle staleness, deviation, band and rate limit, withdrawal queue ordering, permissionless settlement, a claim the token refuses to deliver, a hostile Allocation Engine bounded by the Vault's own floor, a write-down that buys no room under that floor, write-down accounting across three books, two-step admin handover, and fuzzing on accounting invariants.
