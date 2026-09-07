# Oracle Design

The Oracle Adapter is the single source of truth for NAV data, bridging three feed types with unified validation. Each feed has its own trust model and its own staleness and deviation guards, because a government bond price and an off-chain credit report do not deserve the same treatment.

## Data sources

| Feed | Source | Trust model | Staleness | Deviation bound |
|---|---|---|---|---|
| Asset prices (USDC/USD, XLM/USD) | [Reflector](https://reflector.network) | Decentralized | 1 hour | 2% |
| Private credit NAV | Off-chain report, backend, reporter key | Centralized in V1, disclosed | 7 days | 5% |
| Etherfuse bond price | Etherfuse API and on-chain | Deterministic | 48 hours | None applied |

The Reflector USDC/USD feed exists to confirm peg integrity of the vault base asset, not to price the portfolio. The seven-day threshold on private credit NAV reflects the reporting cadence of off-chain credit instruments, which do not update hourly.

## Validation pipeline

Every update is checked against the authorized reporter set, monotonic timestamps and the deviation bound before it can move state. A stale feed does not degrade quietly: the Vault reverts with `OracleStale`.

## Failure modes

| Failure | Impact | Mitigation |
|---|---|---|
| Reporter offline | Withdrawals and allocations revert | Deposits and stakes continue. Admin assigns a backup reporter. |
| Reporter compromised | False NAV pushed | Deviation bounds reject it. V2 introduces a multi-reporter quorum. |
| Originator misreports | Incorrect NAV | Backend reconciliation. Anything above 5% requires admin confirmation. |
| Reflector offline | Display only | Core operations do not depend on Reflector. |

The design principle is that an oracle failure should block state changes rather than corrupt them. Deposits and staking keep working when the reporter is down, because neither depends on a fresh NAV.

## V1 to V2

V1 uses a single dedicated reporter key, disclosed as a centralized component. V2 moves to a 2-of-3 multi-reporter quorum. The deviation and staleness guards do not change, only the number of parties required to push a value.
