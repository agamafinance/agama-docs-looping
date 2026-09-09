# Soroban Contracts

The on-chain core is five Soroban contracts written in Rust and compiled to WASM. Source is public at [github.com/agamafinance/agama-soroban](https://github.com/agamafinance/agama-soroban) under Apache-2.0.

The [End-to-End Flow](/stellar/flow) page carries the architecture diagram showing how these five contracts fit together with the entry rails and the allocation targets.

## Wiring

Every protocol contract, the five here and the two pool adapters, wires itself in a `__constructor` that runs inside the transaction that deploys it. That replaced `initialize`, a separate call sent after the deploy, and being separate was the problem twice over. `initialize` left a public window between the deploy and the wiring, in which the same call naming a different admin could land first. It also took its counterparties on trust while the setter that repairs the same pointer interrogated them, so the one call that created the wiring was the one call that checked nothing, on a protocol whose deployment record is a list of mis-wirings. Each constructor now runs the check its own repair setter runs.

The Vault's constructor takes `(admin, usdc_token)` and nothing else. agUSD and the Allocation Engine are absent deliberately: each is built against the Vault's address and so cannot exist before the Vault does, and a Vault cannot be told at deploy time about a contract that is waiting to be told about the Vault. They arrive afterwards through the doors that check. `set_agusd` requires the incoming token to name this Vault as its minter, and `set_engine` requires the incoming Engine to answer that it governs this Vault and to arrive with an empty book. USDC is the one pointer that is not circular, and the one with no setter at all, so the constructor checks it as far as an address can be checked: it has to answer the token interface, which an ordinary account cannot.

The Engine's constructor requires its Vault to answer `admin()`, and to answer with the Engine's own admin. `write_down` and `recover` need one signature that satisfies both contracts, so an Engine wired to a Vault under a different admin is an Engine that can never recognise a loss. Refusing that pairing at deploy time costs less than discovering it during a default.

Two contracts cannot each validate the other first, so the deployment order is the one sequence in which every check has something real to check: the Vault with USDC only, then agUSD naming the Vault, then `set_agusd`, then the Engine naming the Vault, then `set_engine`, then each adapter naming its Engine and its Vault, then `register_pool`.

## Vault Contract

Entry point for capital. Accepts USDC deposits, mints agUSD 1:1, manages NAV-based accounting and the FIFO withdrawal queue.

| Function | Description |
|---|---|
| `__constructor(admin, usdc_token)` | Deploy-time wiring, inside the transaction that deploys the contract. Takes USDC only, and checks it answers the token interface. |
| `deposit(from, amount) -> i128` | Transfers USDC, mints agUSD. Returns minted amount. |
| `request_withdrawal(from, amount) -> u64` | Burns agUSD, enqueues claim. Returns `claim_id`. |
| `claim_withdrawal(from, claim_id)` | Pays USDC when Ready. FIFO order, or out of order for a claim the queue has already deferred. Fails with `PaymentRejected` rather than trapping if the token refuses to deliver. |
| `settle_withdrawal()` | Pays the head claim to its recorded owner. Permissionless: no claim id and no recipient, so the caller can neither redirect a payment nor skip ahead. If the token refuses to deliver, the claim is marked deferred and stepped over, unpaid and still owed. |
| `is_deferred(claim_id) -> bool` | Whether the queue stepped over this claim because it could not be delivered. |
| `bump_claim(claim_id)` | Postpones the archival of a claim record by extending its TTL. Permissionless: there is no amount, no recipient and no claim state to touch, and the caller pays the rent. |
| `set_reserve_floor(admin, floor_bps)` | The Vault's own copy of the reserve floor, enforced in `settle_allocation`. Ships closed at 10000. |
| `record_repayment(amount)` | Called by the Engine. The Vault verifies the cash actually arrived in its own balance before reducing `deployed_capital`. |
| `record_writedown(admin, amount)` | Called by the Engine and signed by the admin. Reduces `deployed_capital` with no cash arriving, and raises `recognised_losses` by the same amount so the floor's base does not move. |
| `record_recovery(admin, amount)` | Called by the Engine and signed by the admin. Books capital that had been written off and has come back, releasing the recognised loss against it. Refuses any amount the Vault cannot see arriving in its own balance. |
| `settle_allocation(pool, amount)` | Releases idle USDC to a pool. Callable only by the Allocation Engine, which has already checked the caps and the floor. |
| `set_agusd(admin, agusd_token)` | Repoints the token the Vault mints. Refuses any token that does not name this Vault as its minter, and closes at the first deposit. |
| `set_engine(admin, allocation_engine)` | Repoints the Engine allowed to release reserves. Refuses any address that does not answer that it governs this Vault with an empty book, and refuses to move while this Vault has capital deployed. |
| `set_oracle(admin, oracle, feed_id)` | Points the Vault at an Oracle Adapter and the feed it reads NAV from. |
| `set_paused(admin, paused)` | Circuit breaker on deposits, withdrawal requests and new allocations. Payouts stay open, because a queued claim has already burned its agUSD. |
| `idle_reserves() -> i128` | USDC the Vault is holding, gross. What claims are paid from. |
| `outstanding_liabilities() -> i128` | USDC owed to queued withdrawal claims that have burned their agUSD and not been paid. |
| `free_reserves() -> i128` | Idle reserves less what the queue is owed. What the reserve floor protects. |
| `deployed_capital() -> i128` | Capital this Vault has released and not seen back, from its own records rather than the Engine's. |
| `reserve_floor_bps() -> u32` | The Vault's own floor, in bps of `floor_base`. |
| `get_total_assets() -> i128` | Gross: idle reserves plus deployed allocations. Counts USDC owed to the queue, which is still an asset until it is paid. |
| `get_net_assets() -> i128` | Free reserves plus deployed capital. The honest measure of what the Vault is worth. |
| `recognised_losses() -> i128` | Deployed capital written off and not recovered. It falls in one way only, `record_recovery`, which requires the cash. Not an asset, and `get_net_assets()` correctly excludes it. |
| `floor_base() -> i128` | Net assets plus `recognised_losses()`. The denominator the reserve floor uses. |
| `get_nav() -> i128` | Latest validated NAV from the Oracle Adapter. Propagates `OracleStale` rather than returning an old number. |
| `get_claim(claim_id) -> Claim` | The stored claim record. |
| `claim_status(claim_id) -> ClaimStatus` | Pending, Ready or Claimed. Ready is computed rather than stored: a claim becomes payable when the queue reaches it and reserves cover it, without anyone touching it. |
| `queue_head() -> u64` | Next claim id that may be paid. |
| `queue_tail() -> u64` | Next claim id to be handed out. |
| `queue_length() -> u64` | Claims requested and not yet paid. |
| `deposits() -> u64` | Deposits taken since deployment. What `set_agusd` keys off. |
| `propose_admin(admin, new_admin)` / `accept_admin(new_admin)` | Two-step admin handover. The successor authorizes the second step itself. |
| `pending_admin() -> Option<Address>` | The proposed successor, if a handover is in flight. |

Events: `Deposit`, `WithdrawalRequested`, `WithdrawalClaimed`, `WithdrawalDeferred`, `PauseToggled`, `AgUsdRepointed`, `EngineRepointed`, `ReserveFloorSet`, `RepaymentRecorded`, `WriteDownRecorded`, `RecoveryRecorded`, `AdminProposed`, `AdminChanged`.

Security: wiring done in the constructor rather than in a call anyone could front-run, `require_auth()` on all state-changing calls, zero and negative validation, a pause circuit breaker on deposits, requests and allocations but never on payouts, minimum withdrawal amount, strict FIFO with no priority, no way to stall it and no way to freeze it on a payout the token refuses, and the reserve floor enforced against the Vault's own book and against a base a write-down cannot move.

### The Vault is the last word on its own reserves

`settle_allocation` used to release USDC on the Engine's say-so and check nothing itself, on the reasoning that duplicating the Engine's limits would mean two implementations that can disagree. The Engine, though, is simply an address the Vault authorizes, and `set_engine`'s guard, which asks an incoming Engine whether it governs this Vault, is answered correctly by any contract that stores one address and returns it. A limit enforced only in the Engine is therefore a limit any contract holding that authorization can skip.

The Vault now keeps its own floor, its own deployed capital book and its own record of what the withdrawal queue is owed, and `settle_allocation` refuses any release that would take free reserves below the floor or below the queued claims. `deployed_capital` rises with every release the Vault performs and falls in exactly two ways: a repayment the Vault can see in its own balance, or a write-down carrying the admin's signature as well as the Engine's call. An honest Engine never meets the check, because it applied the same arithmetic to the same book one call earlier.

The floor is a share of `floor_base`, which is net assets plus what has been written off and not recovered, and not of net assets alone. `record_writedown` lowers net assets with no cash moving anywhere, so a floor measured against them is a floor whose absolute size its own caller can lower at will: allocate to the floor, write the position off, allocate to the new floor, and the reserves leave a slice at a time with every call inside the limit. `recognised_losses()` falls in one way only, `record_recovery`, and that call takes the loss out of the base and puts the cash into free reserves in the same transaction. The base never falls, so what a write-down cannot buy, a recovery cannot buy back.

### A queued claim is a liability

A withdrawal request burns the agUSD immediately and leaves the USDC in the Vault until the claim is paid, so between those two moments the money is on the balance sheet and no longer anybody's to lend out. Every limit that asks how much may be deployed reads free reserves rather than the gross balance.

### A claim that cannot be delivered does not freeze the queue

Paying a claim is a token transfer, and USDC is a Stellar asset contract over a classic asset, so it fails whenever the destination has no trustline, has had one frozen by the issuer, has a limit below the claim, or no longer exists. A failed payout used to trap the whole call, so the head pointer never moved and every withdrawal behind it stopped permanently. Delivery is now attempted: a claim the token refuses is marked deferred and stepped over, unpaid, still counted in `outstanding_liabilities` so its cash stays reserved, and collected later by its recorded owner through `claim_withdrawal`, out of head order and only once. A deferred claim loses its place in the queue, which is a real cost and falls on the only party who can fix its cause.

## agUSD Token (SEP-41)

Composable synthetic dollar. `mint` is restricted to the recorded minter, which is the Vault Contract address. It is the only address that can bring agUSD into existence, and `set_minter` stops working at the first mint, so every unit in circulation was created by the minter named in the deployment record.

`burn` and `burn_from` are not minter-gated. They are the standard SEP-41 holder-authorized paths: any holder can burn their own agUSD, and a spender can burn against an allowance. The Vault's `request_withdrawal` uses that same path, calling `burn` on the withdrawer inside a transaction the withdrawer has already signed, rather than a privilege of its own.

Supply can therefore only go up through the Vault, and can go down through anyone holding the token. That is the right asymmetry for a redeemable synthetic dollar: burning agUSD destroys a claim rather than creating one, so a holder-authorized burn cannot cost anybody else anything.

Standard SEP-41 interface: `transfer`, `transfer_from`, `approve`, `allowance`, `balance`, `burn`, `burn_from`, `decimals`, `name`, `symbol`, `total_supply`.

Events: `mint`, `burn`, `transfer`, `approve` from SEP-41, plus `MinterSet`.

agUSD carries no transfer restriction. It is permissionless and composable, which is what makes it usable as collateral by other Soroban protocols.

## sagUSD Staking Contract

Yield-bearing staked agUSD with share-based accounting, following the same share-price economics as DeFindex rather than its contract interface. Yield increases the sagUSD/agUSD exchange rate rather than rebasing balances, so no claim step is required.

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

Routes vault capital across pool adapters with on-chain concentration cap enforcement and a reserve floor. All four limits are measured in basis points, so the floor is read in the same units as the caps and the two cannot be compared wrongly. The caps are a share of net assets and the floor is a share of `floor_base`, which carries recognised losses as well.

| Function | Description |
|---|---|
| `__constructor(admin, vault)` | Deploy-time wiring, inside the transaction that deploys the contract. The Vault has to answer `admin()`, and to answer with this Engine's own admin. Ships fail-closed: every cap at zero and the reserve floor at 10000 bps, so an unconfigured Engine can deploy nothing. |
| `register_pool(admin, pool_id, originator, jurisdiction, cap_bps)` | Whitelists a pool with metadata and cap. |
| `set_caps(admin, pool_cap_bps, originator_cap_bps, jurisdiction_cap_bps)` | Updates global concentration limits, in bps of net assets. |
| `set_reserve_floor(admin, floor_bps: u32)` | Sets the minimum share of `floor_base`, in basis points, that must stay as free USDC in the Vault. Rejects anything above 10000. Admin-gated; emits an event. The Vault keeps its own copy and enforces it independently. |
| `set_vault(admin, vault)` | Repoints the Engine at a different Vault. Refused while any capital is deployed, so the book and the balance sheet the caps measure it against stay one Vault's. Runs the same check the constructor runs. |
| `allocate(admin, pool_id, amount)` | Deploys capital. Reverts if any concentration cap is exceeded, measured on `charged_exposure` rather than on live exposure, or if the call would leave free reserves below `floor_bps` of `floor_base`. The Vault applies the same floor again when it releases. |
| `write_down(admin, pool_id, amount, reason)` | Recognises a credit loss. Reduces this Engine's exposure, the adapter's own and the Vault's deployed capital in one transaction, with no cash required, and charges the amount against the pool's cap until the cash comes back. Admin-gated; emits an event carrying the reason. Refuses with `AdminMismatch` if this Engine's admin and the Vault's have diverged. |
| `recover(admin, pool_id) -> i128` | Sweeps whatever an adapter holds above its booked exposure to the Vault, releases the recognised loss against it and releases the pool's charge by the same amount. Returns the amount. Neither the destination nor the amount is a parameter. Refuses with `AdminMismatch` if this Engine's admin and the Vault's have diverged. |
| `deallocate(pool_id, amount)` | Records repayments returning to the vault. |
| `get_exposure(pool_id) -> i128` | Current allocation per pool. |
| `get_exposures() -> Map` | Full allocation state. Pools with no exposure appear as zero, so the map doubles as the whitelist. |
| `total_allocated() -> i128` | Total booked as deployed across every pool. |
| `caps() -> Caps` | The three concentration limits currently in force, in bps. |
| `reserve_floor_bps() -> u32` | Current reserve floor, in bps of `floor_base`. Readable by anyone. |
| `get_reserve_ratio() -> u32` | Free reserves as an actual share of `floor_base`, in bps: the number the floor is a lower bound on, read in the same units. |
| `written_off() -> i128` | Written off across every pool and not recovered. It falls in one way only, `recover`, which requires the cash. |
| `written_off_pool(pool_id) -> i128` | Written off against one pool and not recovered. This is what a write-down costs that pool's cap. |
| `charged_exposure(pool_id) -> i128` | What the caps are measured on: deployed plus written off and not recovered. It differs from `get_exposure` only after a write-down. |
| `admin_aligned() -> bool` | Whether this Engine's admin and the Vault's are the same address. False exactly when `write_down` and `recover` will refuse. |
| `vault_admin() -> Address` | The Vault's admin, as the Vault reports it. |
| `get_pool(pool_id) -> Pool` | A registered pool's originator, jurisdiction and cap. |
| `pools() -> Vec<Address>` | Every registered pool adapter. |

### Reserve floor

The Engine enforces the reserve floor as a share of a base rather than as an amount of USDC. `set_reserve_floor(admin, floor_bps)` takes basis points, `reserve_floor_bps()` returns them, and `get_reserve_ratio()` returns what free reserves actually are as a share of that base, in the same units, so the limit and the reality are read off the same scale. Testnet runs at 2500 bps, which is 25%. The Vault holds the same number and applies it again when it releases the cash, against its own book.

The base, `floor_base()`, is free reserves plus everything the Engine has booked as deployed plus what it has written off and not recovered. `allocate()` computes what the Vault would be left holding once the release settles, and reverts if that is below `floor_bps` of the base. The check happens in the same transaction as the transfer, so a refused allocation moves no funds and books no exposure.

The write-off term is why the base is not simply net assets. `write_down` lowers net assets with no cash moving, so a floor measured against them falls every time a loss is recognised, real or otherwise, and alternating `allocate` with `write_down` empties a Vault past its own floor a slice at a time. `written_off()` falls in one way only, `recover`, which requires the cash to have reached the Vault and adds it to free reserves in the same transaction it takes the loss out of the base, so the base is invariant under a write-down exactly as it is under an allocation and under a recovery. The three concentration caps deliberately keep net assets as their denominator: a larger base loosens a cap and tightens a floor, so the term belongs only where it tightens. For a protocol that has never taken a loss the two numbers are the same.

**Why a share and not a sum.** The floor is what keeps fast-exit liquidity available to the withdrawal queue without holding a position in a third-party protocol. Written as a fixed number of dollars it would stop meaning anything as the book moves: most of a small vault, a rounding error in a large one, and re-tuned by hand every time the protocol grows. Withdrawal pressure scales with the size of the book, so the liquidity guaranteed against it has to scale too. A ratio does that on its own.

**A floor only binds if the caps can reach it**, and that is a property of the configuration rather than of the code. Two pools capped at 30% each can deploy at most 60% between them, so a 20% floor could never be the reason an allocation is refused. The deployed configuration is chosen the other way round: pool caps of 4000 bps each, summing to 8000, against a floor that releases 7500. There are states reachable by ordinary allocations in which every concentration cap is satisfied and the floor is the only limit refusing the call, and that case is exercised on testnet as a submitted transaction carrying the Engine's own error code.

See [Threat Model](/security/threat-model) for how the floor sits in the withdrawal liquidity order.

### A write-down does not reopen a cap

The three concentration caps are measured on `charged_exposure`, which is what a pool holds plus what has been written off against it and not recovered, and not on live exposure alone. Live exposure is the quantity `write_down` sets to zero while the adapter goes on holding the capital, so a cap measured on it is a cap a write-down resets: the same pool could be filled to its cap, written off and filled again without limit, and the originator and jurisdiction sums followed it up, because they are built from the same per-pool numbers. Charging the write-off against the cap is the numerator half of the fix the floor got in its denominator, and the charge stands until `recover` brings the cash home. A defaulted originator does not get its limit back by defaulting.

### Two admins, one signature

`write_down` and `recover` each write the Vault's books as well as this Engine's, and the Vault's leg needs the Vault admin's signature. The two roles rotate independently, and nothing should stop them: a rotation that required a counterparty's cooperation would be a rotation a hostile counterparty could block. What it means is that a handover completed on one side and not the other leaves loss recognition impossible until it is completed on the other. Both calls check the alignment before they check anything about their arguments, and refuse with `AdminMismatch` rather than trapping on the Vault's own `NotAdmin` several frames down, which during an incident is the difference between being sent to look at the rotation and being sent to look at the position. `admin_aligned()` reports the divergence at any time rather than leaving it to be discovered during a default.

### Pool adapter interface

Every pool adapter exposes the same interface, `allocate`, `deallocate`, `write_down`, `recover_surplus` and `get_exposure`, keeping the Engine agnostic to pool type. Two pool adapters are in scope: Etherfuse and private credit.

`recover_surplus(caller) -> i128` sends whatever the adapter holds above its booked exposure to the Vault it already names, and returns how much that was. It is the way home for capital `deallocate` cannot move, which is a recovery on a position written down to zero and interest paid above principal, both of which used to sit in the adapter forever and, because `set_counterparties` refuses an adapter holding USDC, close its only repair path along the way. Neither the destination nor the amount is a parameter, so a live position cannot be swept out from under `deallocate` and there is nothing for a caller to aim. Either the Engine or the adapter's admin may call it: the Engine is the ordinary path, because it passes the amount on to the Vault and the three books stay in step, and the admin path is the one that still works when the Engine an adapter is stuck to has itself been superseded.

| Pool adapter | Underlying | Settlement | Oracle |
|---|---|---|---|
| Etherfuse | Stablebond contracts | Instant, on-chain | Etherfuse feed, 48h staleness |
| Private credit | Off-chain originator | D+15 to D+90 | Custom reporter, 7d staleness |

These pool adapters are distinct from the Oracle Adapter below. Pool adapters move capital into a pool; the Oracle Adapter values the resulting positions and never touches funds.

### Operational model

**V1 (grant scope):** admin-directed allocation. The Curator calls `allocate()` manually. The Engine enforces constraints but does not decide autonomously.

**V2 (post-grant):** an off-chain optimizer computes target allocations and submits through the same admin-gated functions. Same cap enforcement, same governance guardrails.

## Oracle Adapter

Single source of truth for NAV data, bridging three feed types with unified validation. Each feed carries a staleness window, a per-push deviation bound, an absolute band and a minimum interval in ledger time between accepted values, and the reference point lives in persistent storage so it cannot expire out from under the checks that read it. See [Oracle Design](/security/oracle).

## Storage and TTL

Soroban storage is tiered deliberately.

| Contract | Type | Data | Rationale |
|---|---|---|---|
| Vault | Instance | Admin, pending admin, tokens, pause, queue pointers, reserve floor, deployed capital, queued liabilities, accounted balance, recognised losses | Small, read every call |
| Vault | Persistent | Withdrawal claims and deferral flags by `claim_id` | Claims pending for weeks. Bumped for 90 days when written, and by anyone through `bump_claim` |
| agUSD | Persistent | Balances, allowances | Long-lived user data |
| sagUSD | Instance | Admin, pending admin, staked token, NAV, cooldown, stake counter | Touched every stake and unstake |
| sagUSD | Persistent | Share balances, pending unstake requests | A request outlives the shares that created it |
| Allocation Engine | Instance | Admin, pending admin, Vault, caps, reserve floor in bps, pool registry | Config, read every allocation |
| Allocation Engine | Persistent | Per-pool exposure and write-off records, and the totals over them | Must persist across settlement, and the write-off records are what the caps and the floor's base are built on |
| Oracle | Instance | Admin, pending admin, reporter set, per-feed guards | Configuration |
| Oracle | Persistent | Latest NAV, its reported timestamp, and the ledger time it was accepted at | The reference every guard is measured against. It was temporary, and an expired reference removes the monotonicity check, the deviation bound and the rate limit at once |

Instance storage is bumped automatically on invocation. Persistent hot data is bumped on user interaction. Cold data such as claimed withdrawals archives naturally. A backend keeper handles periodic bumps for system-critical entries, and for withdrawal claims `bump_claim` is the entry point it calls. Nothing a guard reads lives in temporary storage: an entry that can expire is a guard that can be waited out.

Claim records are where that matters most, because for them the rent is a liveness question rather than a cost. A claim is bumped for 90 days when it is written, and it is only ever written when something happens to it, so a claim waiting on liquidity behind a queue that is allowed to stall is a claim nothing writes to. The book behind it settles at D+15 to D+90, which makes a head claim outliving its TTL an ordinary event rather than an exotic one. An archived persistent entry cannot be read at all, so reading that claim failed and took `settle_withdrawal` and `claim_withdrawal` with it, and the whole queue stopped at the head until somebody paid for an out-of-band `RestoreFootprint`. `bump_claim` needs no authorization because the caller chooses nothing by making it: there is no amount, no recipient and no claim state to touch, the only effect is to postpone an archival, and the caller pays for it. Extending a stranger's TTL is a donation rather than an attack, and it cannot be used to shorten one. It is preventive and not curative, because reading an archived entry is precisely the thing that cannot be done.

## Upgrade path

V1 contracts are immutable. Upgrades require redeployment and migration. V2 may introduce a controlled upgrade proxy with a timelock.
