# Soroban Contracts

The on-chain core is five Soroban contracts written in Rust and compiled to WASM. Source is public at [github.com/agamafinance/agama-soroban](https://github.com/agamafinance/agama-soroban) under Apache-2.0.

## Vault Contract

Entry point for capital. Accepts USDC deposits, mints agUSD 1:1, manages NAV-based accounting and the FIFO withdrawal queue.

| Function | Description |
|---|---|
| `initialize(admin, usdc_token, agusd_token, allocation_engine)` | One-time setup storing core addresses and admin. |
| `deposit(from, amount) -> i128` | Transfers USDC, mints agUSD. Returns minted amount. |
| `request_withdrawal(from, amount) -> u64` | Burns agUSD, enqueues claim. Returns `claim_id`. |
| `claim_withdrawal(from, claim_id)` | Pays USDC when Ready. FIFO order. |
| `get_nav() -> i128` | Latest validated NAV from the Oracle Adapter. |
| `get_total_assets() -> i128` | Reserves plus deployed allocations. |
| `set_paused(admin, paused)` | Circuit breaker. |

Events: `deposit`, `withdrawal_requested`, `withdrawal_claimed`.

Security: initialization guard, `require_auth()` on all state-changing calls, zero and negative validation, pause circuit breaker, minimum withdrawal amount, strict FIFO with no priority.

## agUSD Token (SEP-41)

Composable synthetic dollar. `mint` and `burn` are restricted to the Vault Contract address. Standard SEP-41 interface: `transfer`, `approve`, `transfer_from`, `balance`, `allowance`.

agUSD carries no transfer restriction. It is permissionless and composable, which is what makes it usable as collateral by other Soroban protocols.

## sagUSD Staking Contract

Yield-bearing staked agUSD with DeFindex-compatible share-based accounting. Yield increases the sagUSD/agUSD exchange rate rather than rebasing balances, so no claim step is required.

| Function | Description |
|---|---|
| `stake(from, agusd_amount) -> i128` | Locks agUSD, mints sagUSD shares at current rate. |
| `unstake(from, shares) -> i128` | Burns shares, returns agUSD at current rate. |
| `distribute_yield(distributor, amount)` | Deposits yield, increases assets-per-share. Authorized distributor only. |
| `exchange_rate() -> i128` | Current agUSD per sagUSD share. |

## Allocation Engine

Routes vault capital across pool adapters with on-chain concentration cap enforcement.

| Function | Description |
|---|---|
| `register_pool(admin, pool_id, originator, jurisdiction, cap_bps)` | Whitelists a pool with metadata and cap. |
| `set_caps(admin, pool_cap_bps, originator_cap_bps, jurisdiction_cap_bps)` | Updates global concentration limits. |
| `allocate(admin, pool_id, amount)` | Deploys capital. Reverts if any concentration cap is exceeded or if the call would push idle reserves below the reserve floor. |
| `deallocate(pool_id, amount)` | Records repayments returning to the vault. |
| `get_exposure(pool_id) -> i128` | Current allocation per pool. |
| `get_exposures() -> Map` | Full allocation state. |

### Adapter interface

All pool types implement the same interface, keeping the Engine agnostic to pool type.

| Adapter | Underlying | Settlement | Oracle |
|---|---|---|---|
| Etherfuse | Stablebond contracts | Instant, on-chain | Etherfuse feed, 48h staleness |
| Private credit | Off-chain originator | D+15 to D+90 | Custom reporter, 7d staleness |

### Operational model

**V1 (grant scope):** admin-directed allocation. The Curator calls `allocate()` manually. The Engine enforces constraints but does not decide autonomously.

**V2 (post-grant):** an off-chain optimizer computes target allocations and submits through the same admin-gated functions. Same cap enforcement, same governance guardrails.

## Oracle Adapter

Single source of truth for NAV data, bridging multiple feed types with unified validation. See [Oracle Design](/security/oracle).

## Storage and TTL

Soroban storage is tiered deliberately.

| Contract | Type | Data | Rationale |
|---|---|---|---|
| Vault | Instance | Admin, tokens, pause, queue pointers | Small, read every call |
| Vault | Persistent | Withdrawal claims by `claim_id` | Claims pending for weeks |
| agUSD | Persistent | Balances, allowances | Long-lived user data |
| sagUSD | Instance | Exchange rate, total shares, distributor | Touched every stake and unstake |
| Allocation Engine | Persistent | Per-pool exposure records | Must persist across settlement |
| Oracle | Temporary | Latest NAV and timestamp | Replaced each update, auto-expires |

Instance storage is bumped automatically on invocation. Persistent hot data is bumped on user interaction. Cold data such as claimed withdrawals archives naturally. A backend keeper handles periodic bumps for system-critical entries.

## Upgrade path

V1 contracts are immutable. Upgrades require redeployment and migration. V2 may introduce a controlled upgrade proxy with a timelock.
