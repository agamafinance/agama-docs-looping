# Oracle Design

The Oracle Adapter is the single source of truth for NAV data, bridging three feed types with unified validation. Each feed has its own trust model and its own staleness and deviation guards, because a government bond price and an off-chain credit report do not deserve the same treatment.

## Data sources

| Feed | Source | Trust model | Staleness | Deviation bound | Band | Interval |
|---|---|---|---|---|---|---|
| Asset prices (USDC/USD) | [Reflector](https://reflector.network) | Decentralized | 1 hour | 2% | 0.90 to 1.10 | 5 min |
| Private credit NAV | Off-chain report, backend, reporter key | Centralized in V1, disclosed | 7 days | 5% | 0.50 to 2.00 | 1 hour |
| Etherfuse bond price | Etherfuse API and on-chain | Deterministic | 48 hours | None applied | 0.50 to 2.00 | 1 hour |

The Reflector USDC/USD feed exists to confirm peg integrity of the vault base asset, not to price the portfolio. The seven-day threshold on private credit NAV reflects the reporting cadence of off-chain credit instruments, which do not update hourly.

## Validation pipeline

Every update is checked against the authorized reporter set, the feed's absolute band, monotonic timestamps that are never ahead of ledger time, the feed's minimum interval, and the deviation bound, before it can move state. A stale feed does not degrade quietly: the Vault reverts with `OracleStale`.

### Why a deviation bound is not enough on its own

A deviation bound is relative, and there are two cases it cannot reach.

It cannot reach the **first** report for a feed, because a bound on a move needs something to move from. Before the band existed, `push_nav(i128::MAX)` was accepted and became the reference every later bound was measured as a percentage of. The band applies to every value including the first, which is what makes it the outer wall rather than a special case.

And it says nothing about **how many** reports there can be. Forty pushes of +5%, each one comfortably inside a 500 bps bound, moved a NAV by a factor of seven in forty seconds. The minimum interval limits that, and it is measured in ledger time between accepted values rather than in the timestamps the reporter supplies, because the reporter chooses those and can submit forty of them, a day apart, in the same minute.

The reference point lives in persistent storage rather than temporary. An expired reference does not weaken the monotonicity check, the deviation bound and the rate limit; it removes all three at once, and waiting out a TTL is not an attack anybody has to work at.

## Failure modes

| Failure | Impact | Mitigation |
|---|---|---|
| Reporter offline | Withdrawals and allocations revert | Deposits and stakes continue. Admin assigns a backup reporter. |
| Reporter compromised | False NAV pushed | The deviation bound rejects a large single move, the band rejects a value outside the feed's plausible range whatever the move, and the minimum interval stops the bound being walked past by repetition. Above a threshold of 1, a lone reporter also cannot commit a value at all. |
| Originator misreports | Incorrect NAV | Backend reconciliation. Anything above 5% requires admin confirmation. |
| Reflector offline | Display only | Core operations do not depend on Reflector. |

The design principle is that an oracle failure should block state changes rather than corrupt them. Deposits and staking keep working when the reporter is down, because neither depends on a fresh NAV.

## V1 to V2

V1 uses a single dedicated reporter key, disclosed as a centralized component. V2 is a multi-reporter quorum, and it now exists in the contract rather than only in this page.

Every feed carries a quorum threshold that defaults to 1, which is V1 exactly: one authorized address, one vote, and it lands. Raising a feed above 1 means a value commits only once that many distinct authorized reporters have submitted the same value for the same round, a round being one feed and one reported timestamp. A reporter gets one vote per round whatever it votes for. Partial agreement moves nothing: two reporters proposing two different values both sit short until enough of them converge on one.

Reaching quorum changes how many reporters have to agree before the guards above run. It does not change whether they run. The staleness, band, deviation and interval checks all bind on the value a round agreed on, unchanged.

**Every feed on testnet runs at 1.** The contract supports 2-of-3; what it waits on is reporter keys that are genuinely independent, which is an operational decision rather than a deployment one, and claiming the quorum while one key holds all three votes would be worse than not having it.

### What the record of who voted is for

A round that commits advances the feed's timestamp, so monotonicity closes that round behind it. A round that is refused moves no state at all, so it stays open. The record of who has already voted is therefore kept on a refusal and dropped on a commit, which looks asymmetric and is the only version that works.

Dropping it on a refusal undoes the feature. A reporter seeds a value of its own, waits for the round to be refused on some other value, votes for its own a second time and reaches a quorum of two alone. That was the state of this code when it was first written, it committed the seeded value in a test, and the test that now asserts the refusal is what holds the line. A threshold of 1 is exempt, by definition rather than by exception, since one vote is the whole round.

### What a quorum does not cover

It defends against one compromised or malfunctioning reporter. It does not defend against a colluding majority of a feed's reporter set, because collusion and honest agreement are the same thing on-chain, and it does not defend against reporters that are all honest and all reading the same wrong upstream source. Raising the threshold buys independence between reporters, not correctness of what they report.

Feed guards are write-once: a feed whose parameters need retuning gets a new feed id, so the change is visible to every consumer instead of silently loosening a bound under an unchanged name.
