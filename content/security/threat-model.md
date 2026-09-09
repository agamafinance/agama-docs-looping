# Threat Model

The protocol is modelled with STRIDE. Each threat below maps to a mitigation that exists in the contracts, not to a policy.

## STRIDE

| Category | Threat | Mitigation |
|---|---|---|
| Spoofing | Unauthorized agUSD mint | `mint` restricted to the recorded minter, the Vault, and `set_minter` closes at the first mint. `burn` is holder-authorized and cannot inflate supply. `require_auth()` on all functions. |
| Spoofing | Fake oracle reporter | Authorized reporter set. `push_nav()` validates the caller. Rotation requires admin plus an event. |
| Tampering | NAV manipulation | Deviation bounds reject anything above 5%. Two-step confirmation for large changes. |
| Tampering | Allocation to a compromised pool | On-chain concentration caps per pool, originator and jurisdiction, plus the reserve floor. All four are basis points of total assets. `allocate()` reverts if any is exceeded. |
| Repudiation | Originator denies allocation | Soroban events on every `allocate` and `deallocate`, indexed with block provenance. |
| Repudiation | Disputed yield | Every distribution moves real agUSD in, leaving a SEP-41 `transfer` event and a matching move in `nav()` and `exchange_rate()`. Fully reconstructable. A dedicated `yield_distributed` event is planned. |
| Info disclosure | LP position exposure | Public chain by design. No private data in contracts. |
| Denial of service | Withdrawal queue flood | Minimum amount plus agUSD burn cost. TTL on claim records. |
| Denial of service | Oracle starvation | Deposits and stakes continue. Only withdrawals and allocations revert. Admin updates the reporter set. |
| Elevation of privilege | Admin key compromise | Admin cannot transfer USDC directly. Only `allocate()`, which is cap-bound, or `pause()`. Multi-sig 2-of-3. |

The elevation-of-privilege row is the one worth reading twice. A compromised admin key cannot drain the vault, because there is no function that moves user funds to an arbitrary address. The worst available action is allocating within existing caps to an already-whitelisted pool, or pausing the protocol.

## Access control

| Role | V1 holder | Permissions | Evolution |
|---|---|---|---|
| Admin | 2-of-3 multi-sig | Pause, register pools, set caps, set the reserve floor in bps, repoint counterparties while the guards allow it, update reporters | Governance plus 48h timelock |
| Reporter | Dedicated hot wallet | Push NAV to the oracle | Multi-reporter quorum (2-of-3) |
| Yield Distributor | Same as Admin in V1 | `distribute_yield()`, which moves the distributor's own agUSD | Dedicated service key, then keeper network |
| Curator | Same as Admin in V1 | Whitelist pools, risk parameters | Independent risk committee |

## Pausability

When paused, deposits and withdrawals are blocked. Staking, both steps of unstaking, and oracle updates all continue. Pausing is a circuit breaker on capital movement, not a freeze on accounting.

## Withdrawal queue

The queue is a two-step FIFO. `request_withdrawal` burns agUSD and creates a persistent claim record. `claim_withdrawal` pays USDC once the claim is Ready.

Liquidity is drawn in priority order: idle USDC reserves held above the on-chain reserve floor, 2500 bps of total assets on testnet, then new deposits, then Etherfuse Stablebond redemption (on-chain, instant), then private credit repayment (off-chain, D+15 to D+90).

The reserve floor is enforced by the Allocation Engine, not by policy: `allocate()` reverts if a call would leave the Vault holding less idle USDC than `reserve_floor_bps()` of total assets. Fast-exit liquidity is therefore a protocol parameter anyone can read on-chain, rather than a position held inside another protocol.

The floor is a share of total assets, not a fixed sum, and that unit is the substance of it. Written as an amount it would be most of a small book and a rounding error in a large one, and it would need re-tuning by hand each time the protocol grew. Withdrawal pressure scales with the book, so the cash held back against it scales too. `get_reserve_ratio()` reports what idle reserves actually are as a share of total assets, in the same basis points the floor is set in, so the limit and the reality can be compared directly.

| Scenario | Expected wait |
|---|---|
| Vault has idle reserves | Around 5 minutes, next keeper cycle |
| Reserves at the floor, Etherfuse available | Minutes |
| Reserves depleted, only private credit | Days to weeks |

Safeguards: minimum withdrawal amount as anti-dust, queue depth monitoring that triggers proactive Etherfuse redemption, strict FIFO with no priority and no jumping including by admin, and no claim expiry.

## Test coverage

End-to-end flows (deposit, stake, yield, redeem), cap-violation rejection, re-initialization guards, access control, zero and negative validation, oracle staleness and deviation, withdrawal queue ordering, and fuzzing on accounting invariants.
