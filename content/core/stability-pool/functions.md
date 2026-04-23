# Stability Pool — Functions

## User functions

### `deposit(uint256 scaledAmount)`

- **Access**: any non-blocklisted, KYC-verified user.
- **Modifiers**: `nonReentrant`, `whenNotPaused`, `validAmount`, `notBlacklisted`, `onlyKYCVerified`.
- **State changes**:
  1. `lendingPool.updateState()`.
  2. `agToken.safeTransferFrom(msg.sender, address(this), scaledAmount)` — balance-delta.
  3. `agaSP.mint(msg.sender, scaledAmount)` — strict 1:1.
  4. `depositBlock[msg.sender] = block.number`.
  5. `delete withdrawTimelock[msg.sender]` — cancels any pending request.
- **Events**: `Deposit(user, amount, agaSPMinted)`.
- **Errors**: `AmountZero()`, `NotKYCVerified()`, `UserBlacklisted()`.

### `requestWithdraw(uint256 amount)`

- **Behavior**: `amount == 0` cancels pending.
- **State**:
  ```
  timelock.amount           = amount
  timelock.balanceAtRequest = agaSP.balanceOf(msg.sender)
  timelock.indexAtRequest   = lendingPool.getNormalizedIncome()
  timelock.readyAt          = block.timestamp + withdrawTimelockDuration
  timelock.expireAt         = timelock.readyAt + withdrawTimelockDelay
  ```
- **Validation**: `withdrawTimelockDuration > 0`.
- **Events**: `WithdrawQueued(user, amount, readyAt)` or `WithdrawCancelled(user)`.
- **Errors**: `TimelockDisabled()`.

### `withdraw(uint256 agaSPAmount)`

- **Precondition**: not same-block as deposit; timelock ready and not expired; `amount` matches.
- **Interest accrual math**:
  ```
  if indexAtRequest == 0 || currentIndex == indexAtRequest:
      balanceCapped = balanceAtRequest
  else:
      mul = currentIndex.rayDiv(indexAtRequest)
      balanceCapped = balanceAtRequest.rayMul(mul)

  scaledAmount = amount == type(uint256).max ? balanceCapped : amount
  require(scaledAmount <= balanceCapped)
  scaledAmount = min(scaledAmount, agaSP.balanceOf(msg.sender))
  ```
- **State**: burn `agaSP`, transfer `agTOKEN` back, `delete withdrawTimelock`.
- **Events**: `Withdraw(user, amount, agaSPBurned)`.
- **Errors**: `CannotDepositAndWithdrawSameBlock()`, `NoPendingWithdraw()`, `WithdrawTimelockNotReady()`, `WithdrawTimelockExpired()`, `WithdrawTimelockInvalid()`, `WithdrawAmountTooHigh()`.

## Admin functions

### `collectDust(address token, address recipient, uint256 amount)`

- **Access**: `onlyOwner` (multisig with 48h timelock).
- **Safety**: for `agTOKEN`, only the excess (`agToken.balanceOf(this) − agaSP.totalSupply()`) is collectable — protects active deposits.
- **Events**: `DustCollected(token, recipient, amount)`.

### `setWithdrawTimelockDuration(uint256)`, `setWithdrawTimelockDelay(uint256)`, `setManager(address, bool)`, `setLiquidationSplit(LiquidationSplit)`, `setSettlementVault(address)`

All governance-timelocked owner operations.

## Liquidation function

### `liquidateBorrower(address poolAdapter, address vaultAdapter, address user, bytes data, uint256 minSharesOut)`

See [Liquidations](liquidations.md) for the full flow. Modifier: `onlyProxy`, `onlyManager`.

## View functions

| Function                                 | Purpose                                        |
|------------------------------------------|------------------------------------------------|
| `getUserDeposit(user)`                   | `agaSP.balanceOf(user)`.                        |
| `getTotalDeposits()`                     | `agaSP.totalSupply()`.                          |
| `isUserDepositInSameBlock(user)`         | `depositBlock[user] == block.number`.           |
