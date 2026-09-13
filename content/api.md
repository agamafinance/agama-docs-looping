# API

The complete public interface of the five Soroban contracts that make up Agama on Stellar, taken from the deployed source rather than written alongside it. For the reasoning behind these entry points, which guard exists because of which failure, read [Soroban Contracts](/stellar/contracts). For the live addresses, read [Deployments](/stellar/deployments). The source is at [github.com/agamafinance/agama-soroban](https://github.com/agamafinance/agama-soroban).

## How to read this page

Signatures are given as they appear in the contract, minus the leading `e: Env` that every Soroban function takes. The Stellar CLI takes each parameter as a named flag, so `deposit(from: Address, amount: i128)` is invoked as `--from G... --amount 10000000`.

Amounts are `i128` at 7 decimals throughout, matching USDC on Stellar: `10000000` is one unit. Basis points are `u32`, where `10000` is 100%.

**Caller** is the address that must authorize the invocation, which is not always an address the function takes as a parameter. Where it says *stored admin* or *stored Engine*, the contract reads the address out of its own state and requires that one, so there is no argument to substitute. Where it says *anyone*, the function requires no authorization at all, and in each of those cases the caller chooses nothing: the arguments cannot redirect funds or select a beneficiary.

**Errors** are contract errors, returned rather than trapped, and each contract owns a numbered range. A call that fails returns `Error(Contract, #NNN)`. The SEP-41 token functions are the exception: they trap with codes 1 to 4 from the shared token module rather than returning a typed error.

`__constructor` runs inside the transaction that deploys the contract and cannot be called again. It replaced a separate `initialize` entry point, which left a window between the deploy and the wiring in which anyone could send the same call naming themselves admin.

## Vault

Custody, issuance and the withdrawal queue. It is the only contract that holds USDC. Errors are in the 300 range.

### Capital in and out

| Function | What it does | Caller | Errors |
|---|---|---|---|
| `deposit(from: Address, amount: i128) -> i128` | Takes `amount` USDC and mints the same amount of agUSD to `from`. Returns what was minted. The USDC lands before the mint, so a transfer that fails takes the whole call with it. | `from` | `Paused` 303, `InvalidAmount` 304, `NotInitialized` 301 |
| `request_withdrawal(from: Address, amount: i128) -> u64` | Burns `amount` agUSD immediately and joins the FIFO queue. Returns the claim id. The burn is at request time, not at claim time, which is what stops a queued position being sold or staked while it waits. | `from` | `Paused` 303, `InvalidAmount` 304, `BelowMinWithdrawal` 305 |
| `claim_withdrawal(from: Address, claim_id: u64)` | Pays a claim to its owner. The claim must be at the head of the queue, or deferred, and must not already be paid. | `from`, and it must be the recorded owner | `ClaimNotFound` 306, `NotClaimOwner` 307, `AlreadyClaimed` 308, `NotAtQueueHead` 309, `InsufficientLiquidity` 310, `PaymentRejected` 322 |
| `settle_withdrawal() -> u64` | Pays whichever claim is at the head, to the owner recorded on it, and advances the queue. Returns the claim id settled. If the token refuses delivery the claim is marked deferred, left unpaid and stepped over. | anyone. It takes no claim id and no recipient, so it can only do what the owner's own `claim_withdrawal` would have done | `QueueEmpty` 315, `ClaimNotFound` 306, `AlreadyClaimed` 308, `InsufficientLiquidity` 310 |
| `bump_claim(claim_id: u64)` | Postpones the archival of a claim record by extending its TTL. Claims are bumped only when they are written, and a claim waiting behind a stalled queue is a claim nothing writes to. | anyone. It cannot shorten a TTL or alter a claim, and the caller pays the rent | `ClaimNotFound` 306 |

The anti-dust minimum on `request_withdrawal` is 1 agUSD, or `10000000`.

### Allocation and the book

| Function | What it does | Caller | Errors |
|---|---|---|---|
| `settle_allocation(pool: Address, amount: i128)` | Releases idle USDC to a pool adapter and raises the Vault's own deployed book. Refuses any release that would take free reserves below the queued claims or below the reserve floor, whoever is asking. | stored Engine | `NotInitialized` 301, `Paused` 303, `InvalidAmount` 304, `InsufficientLiquidity` 310, `ReserveFloorBreached` 316 |
| `record_repayment(amount: i128)` | Books capital returning from a pool. The Vault compares its real balance against the balance it can account for and refuses any repayment it cannot see. | stored Engine | `NotInitialized` 301, `InvalidAmount` 304, `DeployedUnderflow` 318, `RepaymentNotReceived` 317 |
| `record_writedown(admin: Address, amount: i128)` | Recognises that deployed capital is not coming back. Lowers the deployed book with no cash arriving, and adds the same amount to `recognised_losses`, which stays in the reserve floor's denominator. | stored Engine **and** the stored admin, both | `NotInitialized` 301, `NotAdmin` 302, `InvalidAmount` 304, `DeployedUnderflow` 318 |
| `record_recovery(admin: Address, amount: i128)` | Books capital that had been written off and has come back, releasing the recognised loss against it. Refuses any amount the Vault cannot see in its own balance. | stored Engine **and** the stored admin, both | `NotInitialized` 301, `NotAdmin` 302, `InvalidAmount` 304, `RecoveryNotReceived` 323 |

`record_writedown` and `record_recovery` are reached through the Allocation Engine's `write_down` and `recover`, which write the adapter's book and the Engine's in the same transaction.

### Configuration

| Function | What it does | Caller | Errors |
|---|---|---|---|
| `__constructor(admin: Address, usdc_token: Address)` | Deploy-time wiring. Takes USDC only, and checks it answers the token interface. agUSD and the Engine arrive later, through setters that interrogate them, because each is built against this Vault's address and cannot exist before it does. | `admin` | `InvalidUsdc` 325 |
| `set_agusd(admin: Address, agusd_token: Address)` | Points the Vault at the token it mints. The token must name this Vault as its minter, and the pointer closes at the first deposit. | stored admin  It must also count stroops the way this Vault's USDC does. `deposit` mints one stroop of agUSD for one stroop of USDC, so a token with different decimals leaves the internal arithmetic self consistent, the round trip exact, and everything outside wrong: an AMM pool or a lending market valuing a unit at a dollar would be out by a factor of ten with nothing on-chain contradicting it. | `NotInitialized` 301, `NotAdmin` 302, `DepositsExist` 312, `AgUsdMismatch` 324 | `NotAdmin` 302, `DepositsExist` 312, `AgUsdMismatch` 324, `DecimalMismatch` 327 |
| `set_engine(admin: Address, allocation_engine: Address)` | Points the Vault at the Engine allowed to call `settle_allocation`. The Engine must answer that it governs this Vault and arrive with an empty book, and the pointer will not move while this Vault has capital out at a pool. | stored admin | `NotInitialized` 301, `NotAdmin` 302, `CapitalDeployed` 313, `EngineMismatch` 314 |
| `set_oracle(admin: Address, oracle: Address, feed_id: Symbol)` | Points the Vault at an Oracle Adapter and the feed `get_nav` reads. Interrogates the pair before accepting it, which it did not used to: the address has to answer `get_feed` for this exact feed, so it has to be a contract, an oracle, and one that knows the feed. It deliberately asks nothing about whether that feed has reported yet or whether its last value is fresh, because pointing at a newly deployed oracle, or at one whose reporter is down, is an ordinary operation and often the reason for repointing. What no check reaches is a real feed that is the wrong one for this Vault's book, which is why the pair is readable. | stored admin | `NotAdmin` 302, `OracleMismatch` 326 |
| `set_reserve_floor(admin: Address, floor_bps: u32)` | Sets the share of the floor's base the Vault will not release. Ships closed at `10000` until this is called. | stored admin | `NotInitialized` 301, `NotAdmin` 302, `InvalidFloor` 319 |
| `set_paused(admin: Address, paused: bool)` | Circuit breaker over `deposit`, `request_withdrawal` and `settle_allocation`. It does not touch the payout paths, because the agUSD behind a queued claim is already burned. | stored admin | `NotInitialized` 301, `NotAdmin` 302 |
| `propose_admin(admin: Address, new_admin: Address)` | First half of a two step handover. The role does not move. | stored admin | `NotInitialized` 301, `NotAdmin` 302 |
| `accept_admin(new_admin: Address)` | Second half. Only the proposed address can call it, and its signature is the proof the key is reachable. | `new_admin` | `NoPendingAdmin` 320, `NotPendingAdmin` 321 |

### Views

`oracle() -> Result<Address, VaultError>` and `oracle_feed() -> Result<Symbol, VaultError>` read back the pair `set_oracle` writes. Every other counterparty this Vault points at could be read back and this one could not, so the only way to learn where it pointed was to call `get_nav()` and infer it from the number, and a wrong pointer produces a perfectly plausible number. The missing getter is what let the missing check go unnoticed.

| Function | What it returns |
|---|---|
| `idle_reserves() -> i128` | USDC held by the Vault, gross. Counts money already owed to the queue, so no deployment limit is measured against it. |
| `outstanding_liabilities() -> i128` | USDC owed to claims that have burned their agUSD and not been paid. |
| `free_reserves() -> i128` | `idle_reserves` less `outstanding_liabilities`, never negative. The cash the protocol may actually deploy, and what every limit reads. |
| `deployed_capital() -> i128` | Capital released to pools and not seen back, from the Vault's own records rather than the Engine's. |
| `booked_reserves() -> i128` | The idle balance the Vault can account for from its own flows. Anything above it arrived unannounced, which is what a repayment looks like from inside. |
| `recognised_losses() -> i128` | Written off and not recovered. Falls only through `record_recovery`, which requires the cash. |
| `floor_base() -> Result<i128, VaultError>` | The denominator the reserve floor is a share of: `booked_reserves + deployed_capital + recognised_losses - outstanding_liabilities`, summed unclamped and clamped once at zero. It is measured on the cash this Vault can account for from its own flows rather than on its raw balance, because cash arriving without the books being told would otherwise raise the base on arrival and be spent again when something booked it. An invariant fuzzer found that in four operations. |
| `get_total_assets() -> Result<i128, VaultError>` | Gross assets: idle reserves plus deployed capital. |
| `get_net_assets() -> Result<i128, VaultError>` | Free reserves plus deployed capital. The honest measure of what the Vault is worth, and for that reason not the floor's base. |
| `reserve_floor_bps() -> u32` | The Vault's own copy of the floor. |
| `get_nav() -> Result<i128, VaultError>` | NAV from the Oracle Adapter for the configured feed. A stale feed surfaces as `OracleStale` 511 rather than an old number. |
| `get_claim(claim_id: u64) -> Result<Claim, VaultError>` | The claim record: `owner`, `amount`, `requested_at`, `claimed`. |
| `claim_status(claim_id: u64) -> Result<ClaimStatus, VaultError>` | `Pending`, `Ready` or `Claimed`. `Ready` is derived, because both conditions for it change without anyone touching the claim. |
| `is_deferred(claim_id: u64) -> bool` | Whether `settle_withdrawal` could not deliver this claim and stepped over it. It is unpaid, still owed, and collectable out of head order. |
| `queue_head() -> u64` | The next claim id that may be paid. |
| `queue_tail() -> u64` | The next claim id to be handed out. |
| `queue_length() -> u64` | Claims the queue has not reached. Deferred claims are not counted, because they are out of the way. |
| `deposits() -> u64` | Deposits taken since deployment. This is what `set_agusd` keys off. |
| `paused() -> bool` | |
| `admin() -> Result<Address, VaultError>`, `usdc()`, `agusd()`, `allocation_engine()` | The stored pointers. |
| `pending_admin() -> Option<Address>` | The proposed and not yet accepted admin, `None` if no handover is in flight. |

### Error codes

| | | | |
|---|---|---|---|
| 300 `AlreadyInitialized` (retired) | 301 `NotInitialized` | 302 `NotAdmin` | 303 `Paused` |
| 304 `InvalidAmount` | 305 `BelowMinWithdrawal` | 306 `ClaimNotFound` | 307 `NotClaimOwner` |
| 308 `AlreadyClaimed` | 309 `NotAtQueueHead` | 310 `InsufficientLiquidity` | 311 `OracleNotConfigured` |
| 312 `DepositsExist` | 313 `CapitalDeployed` | 314 `EngineMismatch` | 315 `QueueEmpty` |
| 316 `ReserveFloorBreached` | 317 `RepaymentNotReceived` | 318 `DeployedUnderflow` | 319 `InvalidFloor` |
| 320 `NoPendingAdmin` | 321 `NotPendingAdmin` | 322 `PaymentRejected` | 323 `RecoveryNotReceived` |
| 324 `AgUsdMismatch` | 325 `InvalidUsdc` | 326 `OracleMismatch` | 327 `DecimalMismatch` |

## agUSD

The synthetic dollar the Vault mints, one for one against a deposit. A SEP-41 token that does nothing except keep balances and let exactly one address create them. Errors are in the 200 range.

| Function | What it does | Caller | Errors |
|---|---|---|---|
| `__constructor(admin: Address, minter: Address, decimal: u32, name: String, symbol: String)` | Deploy-time. Records the admin and the minting authority and writes the SEP-41 metadata. | `admin` | |
| `mint(to: Address, amount: i128)` | Creates supply. The authorization is the stored minter's, not an address the caller passes, so there is no argument to talk your way through. | stored minter, which is the Vault | `NotInitialized` 201, `InvalidAmount` 203 |
| `set_minter(admin: Address, minter: Address)` | Corrects the minting authority, and only while the token has never minted. After the first mint it is fixed for the life of the contract. | stored admin | `NotInitialized` 201, `NotAdmin` 204, `MinterFrozen` 205 |
| `propose_admin(admin: Address, new_admin: Address)` | First half of a two step handover. | stored admin | `NotInitialized` 201, `NotAdmin` 204 |
| `accept_admin(new_admin: Address)` | Second half. | `new_admin` | `NoPendingAdmin` 206, `NotPendingAdmin` 207 |
| `minter() -> Result<Address, AgUsdCoreError>` | The only address that can create supply. | anyone | `NotInitialized` 201 |
| `mints() -> u64` | Mints since deployment. Zero means the minter can still be corrected, which is the one number an auditor needs to check that the promise holds. | anyone | |
| `admin() -> Result<Address, AgUsdCoreError>`, `pending_admin() -> Option<Address>` | | anyone | `NotInitialized` 201 |

SEP-41: `balance(id)`, `transfer(from, to, amount)`, `transfer_from(spender, from, to, amount)`, `approve(from, spender, amount, expiration_ledger)`, `allowance(from, spender)`, `burn(from, amount)`, `burn_from(spender, from, amount)`, `decimals()`, `name()`, `symbol()`, `total_supply()`.

`burn` and `burn_from` are the standard holder-authorized ones, because that is what `Vault::request_withdrawal` relies on. Supply therefore goes up only through the Vault and down only through the holder.

Error codes: 200 `AlreadyInitialized` (retired), 201 `NotInitialized`, 202 `NotMinter` (declared, never returned: a non-minter is stopped by the authorization check), 203 `InvalidAmount`, 204 `NotAdmin`, 205 `MinterFrozen`, 206 `NoPendingAdmin`, 207 `NotPendingAdmin`.

## sagUSD

The staking contract. Yield reaches holders through share price appreciation rather than a moving redemption rate, which is what keeps agUSD usable as a unit of account. Errors are in the 800 range.

| Function | What it does | Caller | Errors |
|---|---|---|---|
| `__constructor(admin: Address, agusd: Address, cooldown_seconds: u64, decimal: u32, name: String, symbol: String)` | Deploy-time. Records the admin, the agUSD accepted, the cooldown and the sagUSD metadata. | `admin` | |
| `stake(from: Address, amount: i128) -> i128` | Takes agUSD and mints sagUSD shares at the current rate. Returns the shares minted. First staker gets 1:1. | `from` | `InvalidAmount` 806, `ZeroShares` 807 |
| `request_unstake(from: Address, shares: i128) -> i128` | Burns the shares immediately and records the agUSD owed, claimable after the cooldown. Returns the assets owed. A second request restarts the cooldown on the whole pending balance. | `from` | `InvalidAmount` 806, `NoSupply` 808 |
| `claim(from: Address) -> i128` | Pays out matured pending agUSD. | `from` | `NothingPending` 809, `StillInCooldown` 810 |
| `bump_pending(addr: Address)` | Postpones the archival of a pending unstake by extending its TTL. The record is written once, at the request, and nothing writes to it again until it is claimed, so nothing extends it; a cooldown is by construction a period the staker has been told to go away for. | anyone. It cannot shorten a TTL, cannot alter what is owed or to whom, and the caller pays the rent | `NothingPending` 809 |
| `distribute_yield(amount: i128)` | Moves `amount` agUSD from the admin into the contract and raises NAV by exactly that. Every share appreciates; there is nothing to claim and no rebase. It replaced a bare NAV setter, which was a setter on the denominator of the contract's own share price. | stored admin | traps: `amount must be positive` |
| `set_agusd(admin: Address, agusd: Address)` | Repoints the accepted token, and only while the contract has never taken custody: no stakes, no NAV, no balance. | stored admin | `NotInitialized` 801, `NotAdmin` 802, `CustodyTaken` 803 |
| `set_allocations(allocations: Vec<Allocation>)` | Records the off-chain strategy breakdown shown in the interface. Display metadata; nothing on-chain reads it. | stored admin | |
| `propose_admin(admin: Address, new_admin: Address)` / `accept_admin(new_admin: Address)` | Two step handover. | stored admin, then `new_admin` | `NotInitialized` 801, `NotAdmin` 802, `NoPendingAdmin` 804, `NotPendingAdmin` 805 |

Views: `nav() -> i128`, `total_shares() -> i128`, `exchange_rate() -> i128` (agUSD per share at 7 decimals), `share_price() -> i128` (an alias kept because the first generation agUSD calls it), `pending(addr) -> Pending` with fields `assets` and `claimable_at`, `cooldown() -> u64`, `allocations() -> Vec<Allocation>`, `stakes() -> u64`, `agusd() -> Address`, `admin() -> Address`, `pending_admin() -> Option<Address>`.

SEP-41: `balance`, `transfer`, `transfer_from`, `approve`, `allowance`, `decimals`, `name`, `symbol`, `total_supply`. There is deliberately no `burn`: shares leave supply only through `request_unstake`.

Error codes: 800 `AlreadyInitialized` (retired), 801 `NotInitialized`, 802 `NotAdmin`, 803 `CustodyTaken`, 804 `NoPendingAdmin`, 805 `NotPendingAdmin`, 806 `InvalidAmount`, 807 `ZeroShares`, 808 `NoSupply`, 809 `NothingPending`, 810 `StillInCooldown`, 811 `DecimalMismatch`.

`ZeroShares` is worth naming separately from `InvalidAmount`: it is a stake large enough to be a positive number of assets and small enough to round to no shares at all, and taking it would be taking a deposit and giving nothing back for it.

Events: `staked(staker, assets, shares, nav, supply)` · `unstake_requested(staker, shares, assets, claimable_at, nav, supply)` · `unstake_claimed(staker, assets)` · `yield_distributed(amount, nav, supply)` · `agusd_repointed(agusd)` · `admin_proposed(new_admin)` · `admin_changed(admin)`. The first four carry `nav` and `supply` as they stand after the call, because the share price is `nav / supply` and an indexer replaying the stream has no way back to a past pair: carrying both makes every price in a history a fact from the ledger rather than a sample somebody happened to take. `unstake_claimed` carries neither, on purpose, because the shares were burned at request time and nothing about the price moves at a payout.

## Allocation Engine

The constraint layer. It decides nothing about where capital goes, which in V1 is an admin decision; what it does is refuse. Errors are in the 400 range.

| Function | What it does | Caller | Errors |
|---|---|---|---|
| `allocate(admin: Address, pool_id: Address, amount: i128)` | Routes Vault capital into a registered pool, against four limits checked in the same transaction as the release: the per-pool cap, the per-originator cap, the per-jurisdiction cap and the reserve floor. Any one failing reverts the whole call, so a refused allocation moves nothing and books nothing. | stored admin | `NotInitialized` 401, `NotAdmin` 402, `InvalidAmount` 406, `PoolNotRegistered` 404, `InsufficientReserves` 411, `PoolCapExceeded` 407, `OriginatorCapExceeded` 408, `JurisdictionCapExceeded` 409, `ReserveFloorBreached` 410, `AdapterMismatch` 414 |
| `deallocate(pool_id: Address, amount: i128)` | Capital coming back. The adapter moves the USDC to the Vault in the same call that reduces the exposure, and the Vault checks the money arrived before it believes it. No cap is checked, because deallocating can never breach one. The adapter still has to name this Engine and this Engine's Vault, re-read here rather than taken from registration. | stored admin | `NotInitialized` 401, `InvalidAmount` 406, `PoolNotRegistered` 404, `ExposureUnderflow` 412, `AdapterMismatch` 414 |
| `write_down(admin: Address, pool_id: Address, amount: i128, reason: Symbol)` | Recognises a loss across all three books at once: the adapter's, the Engine's and the Vault's. It buys the caller nothing: recognised losses stay in the reserve floor's denominator, and the amount is charged against the pool's concentration cap until the cash comes back. | stored admin, whose signature must also satisfy the Vault's admin | `NotInitialized` 401, `NotAdmin` 402, `InvalidAmount` 406, `PoolNotRegistered` 404, `WriteDownExceedsExposure` 415, `AdminMismatch` 418 |
| `recover(admin: Address, pool_id: Address) -> i128` | Brings home whatever an adapter holds above its booked exposure, which is what a written-off position that recovers looks like, and what interest above principal looks like. Returns the amount. The destination is the adapter's stored Vault and the amount is not a parameter, so there is nothing here for a caller to aim, which holds only while that Vault is still the one this Engine governs, so the pairing is re-checked here too. | stored admin, whose signature must also satisfy the Vault's admin | `NotInitialized` 401, `NotAdmin` 402, `PoolNotRegistered` 404, `AdapterMismatch` 414, `AdminMismatch` 418, and the adapter's `NothingToRecover` |
| `book_recovery(admin: Address, pool_id: Address, amount: i128)` | `recover` with the adapter leg removed, for a recovery whose cash is already in the Vault because the adapter's own admin swept it. Bounded by the Vault, which subtracts the balance it can account for from the balance it holds and refuses anything larger, so the recovery stays evidenced rather than asserted. The pool is an admin assertion here, because cash already in the Vault is unattributed by construction: the global loss book moves by the cash that arrived whatever pool is named, so solvency does not rest on it, and the per-pool cap does. |
| `register_pool(admin: Address, pool_id: Address, originator: Symbol, jurisdiction: Symbol, cap_bps: u32)` | Whitelists an adapter with the metadata the caps aggregate over. The adapter must name this Engine and this Engine's Vault back. This is the first time that check runs rather than the only time: `allocate`, `deallocate` and `recover` re-run it, because `set_vault` can move the Engine's end of the pairing after a pool is registered. | stored admin | `NotInitialized` 401, `NotAdmin` 402, `InvalidCap` 405, `PoolAlreadyRegistered` 403, `AdapterMismatch` 414 |
| `set_pool_cap(admin: Address, pool_id: Address, cap_bps: u32)` | Moves a registered pool's own cap. A pool's effective limit is the tighter of this and the global pool cap, and until this existed only the second could move, so wherever a pool's own figure was binding it was binding for the life of the Engine. The useful direction is down: a cap of zero stops new capital reaching a pool without touching what it holds or releasing what it has been charged, which is the delisting that works on a pool in default. | stored admin | `NotAdmin` 402, `PoolNotRegistered` 404, `InvalidCap` 405 |
| `unregister_pool(admin: Address, pool_id: Address)` | Removes an entry. Refused while this Engine or the adapter still books capital in it, and refused while a write-off is still charged against it: the aggregate caps are built by walking this registry, so an entry leaving takes its charge out of them and a defaulted pool could otherwise be delisted and replaced under the same originator with its whole limit back. It runs no counterparty check, deliberately, because the entry most worth removing is the one whose adapter no longer names this Engine's Vault. | stored admin | `NotAdmin` 402, `PoolNotRegistered` 404, `PoolHasExposure` 420, `PoolHasWrittenOffCharge` 421 |
| `set_caps(admin: Address, pool_cap_bps: u32, originator_cap_bps: u32, jurisdiction_cap_bps: u32)` | Sets the global concentration limits. A pool's effective limit is the tighter of its own and the global one. | stored admin | `NotInitialized` 401, `NotAdmin` 402, `InvalidCap` 405 |
| `set_reserve_floor(admin: Address, floor_bps: u32)` | Sets the minimum share of the floor's base that stays as idle USDC in the Vault. Ships closed at `10000`. | stored admin | `NotInitialized` 401, `NotAdmin` 402, `InvalidCap` 405 |
| `__constructor(admin: Address, vault: Address)` | Deploy-time. The Vault must answer `admin()`, and must answer with this Engine's admin, because the calls that recognise and reverse a loss need one signature that satisfies both contracts. | `admin` | `VaultMismatch` 419 |
| `set_vault(admin: Address, vault: Address)` | Repoints the Engine, while its exposure book is empty, and runs the same check the constructor runs. An empty book is not an empty registry, and this call cannot repair the second: every pool already registered goes on naming the outgoing Vault, and each has to be brought across with `set_counterparties` before anything can be allocated to it again. | stored admin | `NotInitialized` 401, `NotAdmin` 402, `CapitalDeployed` 413, `VaultMismatch` 419 |
| `propose_admin(admin: Address, new_admin: Address)` / `accept_admin(new_admin: Address)` | Two step handover. | stored admin, then `new_admin` | `NotInitialized` 401, `NotAdmin` 402, `NoPendingAdmin` 416, `NotPendingAdmin` 417 |

### Views

| Function | What it returns |
|---|---|
| `get_reserve_ratio() -> Result<u32, EngineError>` | `Vault::accounted_free_reserves()` over `Vault::floor_base()`, in bps. This is the number `set_reserve_floor` bounds, measured against the same base the floor is checked against, so it does not jump upwards when a loss is recognised and it does not report liquidity the Vault would refuse to release. |
| `floor_base() -> Result<i128, EngineError>` | `Vault::floor_base()`, read from the Vault rather than rebuilt here, so the limit the Engine enforces and the limit the Vault enforces are one number. Rebuilding it from the Engine's own books reproduces it only while no term is clamped, and the Vault clamps the sum once at the end. |
| `written_off() -> i128` | Written off across all pools and not recovered. |
| `written_off_pool(pool_id: Address) -> i128` | Written off against one pool and not recovered. This is what a write-down costs that pool's cap. |
| `charged_exposure(pool_id: Address) -> i128` | What the concentration caps are measured on: deployed plus written off. It differs from `get_exposure` only after a write-down, and that difference is the reason a write-down cannot reopen a cap. |
| `get_exposure(pool_id: Address) -> i128` | Capital currently deployed into a pool. |
| `get_exposures() -> Map<Address, i128>` | The whole book, keyed by pool. Registered pools with no exposure appear as zero, so it doubles as the whitelist. |
| `total_allocated() -> i128` | Booked as deployed across every pool. |
| `admin_aligned() -> bool` | Whether this Engine's admin and the Vault's are the same address. It is false exactly when `write_down` and `recover` will refuse, which makes a half finished rotation visible before an incident puts a number on it. |
| `vault_admin() -> Result<Address, EngineError>` | The Vault's admin, as the Vault reports it. |
| `caps() -> Caps` | `pool_bps`, `originator_bps`, `jurisdiction_bps`. |
| `get_pool(pool_id: Address) -> Result<Pool, EngineError>` | `originator`, `jurisdiction`, `cap_bps`. |
| `pools() -> Vec<Address>` | Registered adapters. |
| `reserve_floor_bps() -> u32`, `vault() -> Result<Address, EngineError>`, `admin() -> Result<Address, EngineError>`, `pending_admin() -> Option<Address>` | |

### Error codes

| | | | |
|---|---|---|---|
| 400 `AlreadyInitialized` (retired) | 401 `NotInitialized` | 402 `NotAdmin` | 403 `PoolAlreadyRegistered` |
| 420 `PoolHasExposure` | 421 `PoolHasWrittenOffCharge` | | |
| 404 `PoolNotRegistered` | 405 `InvalidCap` | 406 `InvalidAmount` | 407 `PoolCapExceeded` |
| 408 `OriginatorCapExceeded` | 409 `JurisdictionCapExceeded` | 410 `ReserveFloorBreached` | 411 `InsufficientReserves` |
| 412 `ExposureUnderflow` | 413 `CapitalDeployed` | 414 `AdapterMismatch` | 415 `WriteDownExceedsExposure` |
| 416 `NoPendingAdmin` | 417 `NotPendingAdmin` | 418 `AdminMismatch` | 419 `VaultMismatch` |

### Pool adapters

Every adapter implements the same interface, which is what lets the Engine route to an off-chain credit facility and to a tokenized bond through identical code. `allocate`, `deallocate` and `write_down` are callable only by the stored Engine; `recover_surplus` by the Engine or the adapter's admin, and it sends to the adapter's stored Vault rather than anywhere the caller names.

`allocate(amount: i128)`, `deallocate(amount: i128)`, `write_down(amount: i128)`, `recover_surplus(caller: Address) -> i128`, `get_exposure() -> i128`, `engine() -> Address`, `vault() -> Address`, `admin() -> Address`, `pool_kind() -> Symbol`, `oracle_feed() -> Symbol`, `set_counterparties(admin, engine, vault)`, `propose_admin`, `accept_admin`, `pending_admin`.

The settlement figure is the one place the two adapters differ, and they differ because the instruments do. Private credit publishes `settlement_window() -> (u32, u32)`, a range of 15 to 90 days; Etherfuse publishes `settlement_days() -> u32`, which is zero, because a Stablebond redemption is on-chain and returns in the same call. Nothing on-chain enforces either. They are published so that the Engine's operators and the withdrawal queue can be sized against the real cash conversion time of the book.

Error ranges: 600 for the private credit adapter, 700 for Etherfuse, with matching variants. `NotEmpty` 605 and 705 is the refusal to repoint an adapter that is still holding something; `NothingToRecover` 611 and 711 is `recover_surplus` finding no surplus.

## Oracle Adapter

NAV reporting, with the guards on the way in rather than on the way out. Errors are in the 500 range.

| Function | What it does | Caller | Errors |
|---|---|---|---|
| `push_nav(reporter: Address, feed_id: Symbol, nav: i128, timestamp: u64)` | Strict report. Validates and stores, or fails the transaction. A deviation breach fails here rather than emitting a rejection, because a failing invocation's events are rolled back anyway. | `reporter`, and it must be in the reporter set | `UnauthorizedReporter` 503, `FeedNotRegistered` 504, `InvalidNav` 507, `NavOutOfBand` 513, `TimestampInFuture` 509, `NonMonotonicTimestamp` 508, `TooSoon` 514, `DeviationOutOfBounds` 510 |
| `submit_nav(reporter: Address, feed_id: Symbol, nav: i128, timestamp: u64) -> PushOutcome` | The same validation, but a deviation breach returns `RejectedDeviation` and publishes a rejection event instead of failing. Returns `Accepted` otherwise. | `reporter`, in the reporter set | as `push_nav`, without 510 |
| `register_feed(admin, feed_id: Symbol, staleness_secs: u64, deviation_bps: u32, min_nav: i128, max_nav: i128, min_interval_secs: u64)` | Write-once registration of a feed's guards. The band bounds every report including the first, which a deviation bound cannot reach, because a bound on a move needs something to move from. | stored admin | `NotInitialized` 501, `NotAdmin` 502, `InvalidFeedConfig` 506, `FeedAlreadyRegistered` 505 |
| `set_quorum_threshold(admin, feed_id: Symbol, threshold: u32)` | How many distinct authorized reporters have to submit the same value for the same round before it commits. Defaults to 1, which is V1 exactly: the first vote is quorum and it lands. Above 1 a reporter gets one vote per round whatever it votes for, and partial agreement moves nothing. Reaching quorum changes how many reporters must agree before the band, staleness, deviation and interval guards run, never whether they run. | stored admin | `NotAdmin` 502, `FeedNotRegistered` 504, `InvalidQuorumThreshold` 517 |
| `quorum_threshold(feed_id: Symbol) -> u32` / `quorum_votes(feed_id: Symbol, timestamp: u64, nav: i128) -> u32` | The threshold in force, and how many votes a particular value has in a particular round. | anyone | |
| `add_reporter(admin, reporter: Address)` / `remove_reporter(admin, reporter: Address)` | Manages the set of addresses allowed to report. | stored admin | `NotInitialized` 501, `NotAdmin` 502 |
| `get_nav(feed_id: Symbol) -> Result<i128, OracleError>` | The latest NAV, refusing to return one older than the feed's staleness window. It fails rather than handing back a stale number, and the Vault lets that failure propagate. | anyone | `FeedNotRegistered` 504, `NoNavReported` 512, `OracleStale` 511 |
| `last_update(feed_id: Symbol) -> Result<NavPoint, OracleError>` | The raw stored point, including its age, for monitoring: `nav`, `timestamp`, `recorded_at`. | anyone | `NoNavReported` 512 |
| `get_feed(feed_id: Symbol) -> Result<Feed, OracleError>` | The registered guards for a feed. | anyone | `FeedNotRegistered` 504 |
| `is_reporter(addr: Address) -> bool`, `reporters() -> Vec<Address>`, `admin()`, `pending_admin()` | | anyone | |
| `__constructor(admin: Address)` | Deploy-time. Empty reporter set, no feeds registered. | `admin` | |
| `propose_admin(admin, new_admin)` / `accept_admin(new_admin)` | Two step handover. | stored admin, then `new_admin` | `NotInitialized` 501, `NotAdmin` 502, `NoPendingAdmin` 515, `NotPendingAdmin` 516 |

The minimum interval is measured on `recorded_at`, which is ledger time, and never on the timestamp the reporter supplies, because the reporter chooses that one.

### Error codes

| | | | |
|---|---|---|---|
| 500 `AlreadyInitialized` (retired) | 501 `NotInitialized` | 502 `NotAdmin` | 503 `UnauthorizedReporter` |
| 504 `FeedNotRegistered` | 505 `FeedAlreadyRegistered` | 506 `InvalidFeedConfig` | 507 `InvalidNav` |
| 517 `InvalidQuorumThreshold` | 518 `AlreadyVoted` | | |
| 508 `NonMonotonicTimestamp` | 509 `TimestampInFuture` | 510 `DeviationOutOfBounds` | 511 `OracleStale` |
| 512 `NoNavReported` | 513 `NavOutOfBand` | 514 `TooSoon` | 515 `NoPendingAdmin` |
| 516 `NotPendingAdmin` | | | |

## Calling a contract

Read-only, simulated and never submitted:

```
stellar contract invoke --id CONTRACT --source KEY --network testnet --send=no \
  -- free_reserves
```

State changing, submitted, returning a transaction hash:

```
stellar contract invoke --id CONTRACT --source KEY --network testnet \
  -- deposit --from GADDRESS --amount 10000000
```

The full interface of any deployed contract, including types, is on the ledger:

```
stellar contract info interface --id CONTRACT --network testnet
```

A refusal is contract logic and shows up identically in simulation, so simulating is enough to confirm an entry point rejects what it should. Authorization is not: simulation records the authorizations a call would need rather than enforcing them, so anything that turns on who signed has to be checked with a submitted transaction signed by the key under test.
