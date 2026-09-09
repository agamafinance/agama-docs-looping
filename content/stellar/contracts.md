# Soroban Contracts

The on-chain core is five Soroban contracts written in Rust and compiled to WASM. Source is public at [github.com/agamafinance/agama-soroban](https://github.com/agamafinance/agama-soroban) under Apache-2.0.

The [End-to-End Flow](/stellar/flow) page carries the architecture diagram showing how these five contracts fit together with the entry rails and the allocation targets.

## Vault Contract

Entry point for capital. Accepts USDC deposits, mints agUSD 1:1, manages NAV-based accounting and the FIFO withdrawal queue.

| Function | Description |
|---|---|
| `initialize(admin, usdc_token, agusd_token, allocation_engine)` | One-time setup storing core addresses and admin. Refuses a second call. |
| `deposit(from, amount) -> i128` | Transfers USDC, mints agUSD. Returns minted amount. |
| `request_withdrawal(from, amount) -> u64` | Burns agUSD, enqueues claim. Returns `claim_id`. |
| `claim_withdrawal(from, claim_id)` | Pays USDC when Ready. FIFO order. |
| `settle_allocation(pool, amount)` | Releases idle USDC to a pool. Callable only by the Allocation Engine, which has already checked the caps and the floor. |
| `set_agusd(admin, agusd_token)` | Repoints the token the Vault mints. Closes at the first deposit. |
| `set_engine(admin, allocation_engine)` | Repoints the Engine allowed to release reserves. Refuses any address that does not answer that it governs this Vault. |
| `set_oracle(admin, oracle, feed_id)` | Points the Vault at an Oracle Adapter and the feed it reads NAV from. |
| `set_paused(admin, paused)` | Circuit breaker. |
| `idle_reserves() -> i128` | USDC the Vault is holding. What the reserve floor protects and what claims are paid from. |
| `get_total_assets() -> i128` | Idle reserves plus deployed allocations. |
| `get_nav() -> i128` | Latest validated NAV from the Oracle Adapter. Propagates `OracleStale` rather than returning an old number. |
| `get_claim(claim_id) -> Claim` | The stored claim record. |
| `claim_status(claim_id) -> ClaimStatus` | Pending, Ready or Claimed. Ready is computed rather than stored: a claim becomes payable when the queue reaches it and reserves cover it, without anyone touching it. |
| `queue_head() -> u64` | Next claim id that may be paid. |
| `queue_tail() -> u64` | Next claim id to be handed out. |
| `queue_length() -> u64` | Claims requested and not yet paid. |
| `deposits() -> u64` | Deposits taken since deployment. What `set_agusd` keys off. |

Events: `Deposit`, `WithdrawalRequested`, `WithdrawalClaimed`, `PauseToggled`, `AgUsdRepointed`, `EngineRepointed`.

Security: initialization guard, `require_auth()` on all state-changing calls, zero and negative validation, pause circuit breaker, minimum withdrawal amount, strict FIFO with no priority.

## agUSD Token (SEP-41)

Composable synthetic dollar. `mint` is restricted to the recorded minter, which is the Vault Contract address. It is the only address that can bring agUSD into existence, and `set_minter` stops working at the first mint, so every unit in circulation was created by the minter named in the deployment record.

`burn` and `burn_from` are not minter-gated. They are the standard SEP-41 holder-authorized paths: any holder can burn their own agUSD, and a spender can burn against an allowance. The Vault's `request_withdrawal` uses that same path, calling `burn` on the withdrawer inside a transaction the withdrawer has already signed, rather than a privilege of its own.

Supply can therefore only go up through the Vault, and can go down through anyone holding the token. That is the right asymmetry for a redeemable synthetic dollar: burning agUSD destroys a claim rather than creating one, so a holder-authorized burn cannot cost anybody else anything.

Standard SEP-41 interface: `transfer`, `transfer_from`, `approve`, `allowance`, `balance`, `burn`, `burn_from`, `decimals`, `name`, `symbol`, `total_supply`.

Events: `mint`, `burn`, `transfer`, `approve` from SEP-41, plus `MinterSet`.

agUSD carries no transfer restriction. It is permissionless and composable, which is what makes it usable as collateral by other Soroban protocols.

## sagUSD Staking Contract

Yield-bearing staked agUSD with DeFindex-compatible share-based accounting. Yield increases the sagUSD/agUSD exchange rate rather than rebasing balances, so no claim step is required.

| Function | Description |
|---|---|
| `stake(from, agusd_amount) -> i128` | Locks agUSD, mints sagUSD shares at the current rate. Returns shares minted. |
| `request_unstake(from, shares) -> i128` | Step 1 of 2. Burns the shares immediately, prices them at the current rate and locks the agUSD owed behind the cooldown. Returns the assets owed. |
| `claim(from) -> i128` | Step 2 of 2. Pays out a matured unstake request. Reverts while the cooldown is still running. |
| `cooldown() -> u64` | Seconds between a request and the moment it can be claimed. 60 on testnet. |
| `pending(addr) -> Pending` | The caller's queued unstake: assets owed, and the timestamp it becomes claimable. |
| `distribute_yield(amount)` | Deposits yield, increases assets-per-share. Authorized distributor only, which in V1 is the stored admin: the call takes no distributor argument and authorizes the recorded admin address, whose own agUSD is what moves. |
| `exchange_rate() -> i128` | Current agUSD per sagUSD share, scaled to 7 decimals. |
| `share_price() -> i128` | Alias of `exchange_rate()`, the name this contract shipped with. Same computation, kept because the first-generation agUSD calls it on the credit vaults. |
| `nav() -> i128` | Total agUSD the contract is accountable for. |
| `total_shares() -> i128` | sagUSD in circulation. |

**Unstaking is two steps, not one.** There is no single `unstake()` call. `request_unstake` burns the shares at request time and prices them there, so a queued position cannot keep earning, be sold, or be re-requested while it waits. `claim` pays it out once `cooldown()` has elapsed. Pricing at request rather than at claim is what stops the cooldown being used as a free option on the exchange rate.

Converting the agUSD back to USDC is then a separate two-step queue on the Vault, so a full exit from sagUSD to USDC passes through two waits, not one. See [End-to-End Flow](/stellar/flow).

## Allocation Engine

Routes vault capital across pool adapters with on-chain concentration cap enforcement and a reserve floor. All four limits are measured in basis points of total assets, so the floor is read in the same units as the caps and the two cannot be compared wrongly.

| Function | Description |
|---|---|
| `initialize(admin, vault)` | One-time setup. Ships fail-closed: every cap at zero and the reserve floor at 10000 bps, so an unconfigured Engine can deploy nothing. |
| `register_pool(admin, pool_id, originator, jurisdiction, cap_bps)` | Whitelists a pool with metadata and cap. |
| `set_caps(admin, pool_cap_bps, originator_cap_bps, jurisdiction_cap_bps)` | Updates global concentration limits, in bps of total assets. |
| `set_reserve_floor(admin, floor_bps: u32)` | Sets the minimum share of total assets, in basis points, that must stay as idle USDC in the Vault. Rejects anything above 10000. Admin-gated; emits an event. |
| `set_vault(admin, vault)` | Repoints the Engine at a different Vault. Refused while any capital is deployed, so the book and the balance sheet the caps measure it against stay one Vault's. |
| `allocate(admin, pool_id, amount)` | Deploys capital. Reverts if any concentration cap is exceeded, or if the call would leave idle reserves below `floor_bps` of total assets. |
| `deallocate(pool_id, amount)` | Records repayments returning to the vault. |
| `get_exposure(pool_id) -> i128` | Current allocation per pool. |
| `get_exposures() -> Map` | Full allocation state. Pools with no exposure appear as zero, so the map doubles as the whitelist. |
| `total_allocated() -> i128` | Total booked as deployed across every pool. The Vault reads it to compute total assets. |
| `caps() -> Caps` | The three concentration limits currently in force, in bps. |
| `reserve_floor_bps() -> u32` | Current reserve floor, in bps of total assets. Readable by anyone. |
| `get_reserve_ratio() -> u32` | Idle reserves as an actual share of total assets, in bps: the number the floor is a lower bound on, read in the same units. |
| `get_pool(pool_id) -> Pool` | A registered pool's originator, jurisdiction and cap. |
| `pools() -> Vec<Address>` | Every registered pool adapter. |

### Reserve floor

The Engine enforces the reserve floor as a share of total assets rather than as an amount of USDC. `set_reserve_floor(admin, floor_bps)` takes basis points, `reserve_floor_bps()` returns them, and `get_reserve_ratio()` returns what idle reserves actually are as a share of total assets, in the same units, so the limit and the reality are read off the same scale. Testnet runs at 2500 bps, which is 25%.

Total assets are idle reserves plus everything the Engine has booked as deployed. `allocate()` computes what the Vault would be left holding once the release settles, and reverts if that is below `floor_bps` of the total. The check happens in the same transaction as the transfer, so a refused allocation moves no funds and books no exposure.

**Why a share and not a sum.** The floor is what keeps fast-exit liquidity available to the withdrawal queue without holding a position in a third-party protocol. Written as a fixed number of dollars it would stop meaning anything as the book moves: most of a small vault, a rounding error in a large one, and re-tuned by hand every time the protocol grows. Withdrawal pressure scales with the size of the book, so the liquidity guaranteed against it has to scale too. A ratio does that on its own.

**A floor only binds if the caps can reach it**, and that is a property of the configuration rather than of the code. Two pools capped at 30% each can deploy at most 60% between them, so a 20% floor could never be the reason an allocation is refused. The deployed configuration is chosen the other way round: pool caps of 4000 bps each, summing to 8000, against a floor that releases 7500. There are states reachable by ordinary allocations in which every concentration cap is satisfied and the floor is the only limit refusing the call, and that case is exercised on testnet as a submitted transaction carrying the Engine's own error code.

See [Threat Model](/security/threat-model) for how the floor sits in the withdrawal liquidity order.

### Pool adapter interface

Every pool adapter exposes the same three functions, `allocate`, `deallocate` and `get_exposure`, keeping the Engine agnostic to pool type. Two pool adapters are in scope: Etherfuse and private credit.

| Pool adapter | Underlying | Settlement | Oracle |
|---|---|---|---|
| Etherfuse | Stablebond contracts | Instant, on-chain | Etherfuse feed, 48h staleness |
| Private credit | Off-chain originator | D+15 to D+90 | Custom reporter, 7d staleness |

These pool adapters are distinct from the Oracle Adapter below. Pool adapters move capital into a pool; the Oracle Adapter values the resulting positions and never touches funds.

### Operational model

**V1 (grant scope):** admin-directed allocation. The Curator calls `allocate()` manually. The Engine enforces constraints but does not decide autonomously.

**V2 (post-grant):** an off-chain optimizer computes target allocations and submits through the same admin-gated functions. Same cap enforcement, same governance guardrails.

## Oracle Adapter

Single source of truth for NAV data, bridging three feed types with unified validation. See [Oracle Design](/security/oracle).

## Storage and TTL

Soroban storage is tiered deliberately.

| Contract | Type | Data | Rationale |
|---|---|---|---|
| Vault | Instance | Admin, tokens, pause, queue pointers | Small, read every call |
| Vault | Persistent | Withdrawal claims by `claim_id` | Claims pending for weeks |
| agUSD | Persistent | Balances, allowances | Long-lived user data |
| sagUSD | Instance | Admin, staked token, NAV, cooldown, stake counter | Touched every stake and unstake |
| sagUSD | Persistent | Share balances, pending unstake requests | A request outlives the shares that created it |
| Allocation Engine | Instance | Admin, Vault, caps, reserve floor in bps, pool registry | Config, read every allocation |
| Allocation Engine | Persistent | Per-pool exposure records | Must persist across settlement |
| Oracle | Temporary | Latest NAV and timestamp | Replaced each update, auto-expires |

Instance storage is bumped automatically on invocation. Persistent hot data is bumped on user interaction. Cold data such as claimed withdrawals archives naturally. A backend keeper handles periodic bumps for system-critical entries.

## Upgrade path

V1 contracts are immutable. Upgrades require redeployment and migration. V2 may introduce a controlled upgrade proxy with a timelock.
