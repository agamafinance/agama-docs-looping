# Stability Pool: Functions

The pool follows the **ERC-4626** vault interface: `agYLD` is the underlying asset, `sagYLD` is the share token. Share price is `totalAssets() / totalSupply()` and lifts as the pool earns supply APY and liquidation premiums (or falls if it absorbs bad debt).

Unstaking is a **two-step request-and-claim** flow with a 7-day cooldown. See [Overview → Cooldown](overview.md#cooldown-on-unstake) for the conceptual story; this page is the API reference.

## Deposit

### `deposit(uint256 assets, address receiver) → uint256 shares`

Standard ERC-4626 deposit. Pulls `agYLD` from `msg.sender`, mints `sagYLD` to `receiver` at the current share price.

- **Modifiers**: `nonReentrant`, `whenNotPaused`.
- **State changes**:
  1. `lendingPool.updateState()`.
  2. `agYLD.safeTransferFrom(msg.sender, address(this), assets)`.
  3. `shares = convertToShares(assets)`; `sagYLD.mint(receiver, shares)`.
  4. `depositBlock[receiver] = block.number`.
- **Events**: `Deposit(sender, owner, assets, shares)` (ERC-4626 standard).
- **Errors**: `AmountZero()`.

## Unstake (2-step)

### `requestUnstake(uint256 shares) → uint256 requestId`

Queue an unstake. **Does not burn shares** — they remain in the user's wallet, still earning premiums and still absorbing liquidations until `claim`.

- **State changes**:
  1. Append a new `Request` struct to the user's queue:
     ```text
     amount                     = shares
     requestedAt                = block.timestamp
     settlementExtensionUntil   = 0  (set later if a settlement is in flight)
     claimed                    = false
     ```
  2. Increment `earmarkedShares[user] += shares`.
  3. Increment `pendingCount[user] += 1`.
- **Validation**: `shares > 0`, `shares ≤ sagYLD.balanceOf(user) - earmarkedShares[user]`.
- **Events**: `UnstakeRequested(user, requestId, shares, unlockAt)`.
- **Note**: a user can have any number of open requests in parallel. They claim independently.

### `claim(uint256 requestId)`

Finalise an unstake. Burns the requested `sagYLD` and transfers `agYLD` at **the current share price** (which may have moved up or down since the request was queued).

- **Precondition**:
  - `block.timestamp ≥ unlockAt`, where `unlockAt = requestedAt + cooldownDuration` and is bumped by `settlementExtensionUntil` if a settlement is in flight.
  - The user still holds at least `request.amount` of `sagYLD`. If they transferred shares away, the claim is reduced pro-rata or zeroed out (forfeit).
- **Settlement math**:
  ```text
  sharesToBurn = min(request.amount, sagYLD.balanceOf(user))
  assets       = convertToAssets(sharesToBurn)   // share price at claim time
  ```
- **State changes**:
  1. Burn `sharesToBurn` of `sagYLD`.
  2. Transfer `assets` of `agYLD` to `user`.
  3. `earmarkedShares[user] -= request.amount`.
  4. `request.claimed = true`.
  5. Decrement `pendingCount[user]`.
- **Events**: `UnstakeClaimed(user, requestId, sharesBurned, assetsOut, forfeited)`.
- **Errors**: `RequestNotFound()`, `RequestAlreadyClaimed()`, `CooldownNotElapsed()`.

### `cancelUnstake(uint256 requestId)`

Cancel a pending request before claim. Releases the earmark, does not pay out.

- **State changes**: `earmarkedShares[user] -= request.amount`, request marked cancelled, `pendingCount[user]` decrements.
- **Events**: `UnstakeCancelled(user, requestId)`.

## Liquidation function

### `liquidateBorrower(address poolAdapter, address vaultAdapter, address user, bytes data, uint256 minSharesOut)`

Permissionless on mainnet. Currently `onlyManager` on testnet. See [Liquidations](liquidations.md) for the full flow.

## Admin functions

### `setCooldownDuration(uint256 secs)`

Governance-timelocked. Default 7 days. Bounded between 1 day and 30 days.

### `setSettlementVault(address)`, `setLiquidationProxy(address)`, `setLiquidationSplit(LiquidationSplit)`

All governance-timelocked owner operations.

### `collectDust(address token, address recipient, uint256 amount)`

- **Access**: `onlyOwner` (multisig with 48h timelock).
- **Safety**: for `agYLD`, only stray balance above `convertToAssets(sagYLD.totalSupply())` is collectable: protects every share holder's redemption claim at the current share price.
- **Events**: `DustCollected(token, recipient, amount)`.

## View functions

| Function | Purpose |
|---|---|
| `totalAssets()` | Total `agYLD` claim across all `sagYLD` holders (ERC-4626). |
| `totalSupply()` | Total `sagYLD` outstanding (includes earmarked shares). |
| `convertToShares(uint256 assets)` | `agYLD` → `sagYLD` at current share price. |
| `convertToAssets(uint256 shares)` | `sagYLD` → `agYLD` at current share price. |
| `earmarkedShares(address user)` | `sagYLD` currently locked in pending unstake requests for `user`. |
| `pendingCount(address user)` | Number of open unstake requests for `user`. |
| `getRequest(address user, uint256 requestId)` | Full request struct: `amount`, `requestedAt`, `settlementExtensionUntil`, `claimed`. |
| `cooldownDuration()` | Current cooldown in seconds (default 604,800 = 7 days). |
| `isUserDepositInSameBlock(address user)` | `depositBlock[user] == block.number`. |
