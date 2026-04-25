# Lending Pool: Functions

Complete function reference. Every signature, access control, state change, validation, event, and error.

## Liquidity provision

### `deposit(uint256 amount)`

- **Modifiers**: `nonReentrant`, `whenNotPaused`.
- **State changes**:
  - `reserve.updateState()`: accrues interest.
  - `netAmount = amount − depositFee`.
  - Pull USDC via **balance-delta accounting** (defends against unknown transfer semantics).
  - `agTOKEN.mint(msg.sender, netAmount)`.
  - `depositBlock[msg.sender] = block.number`.
- **Validation**: `_validateDepositSupplyCap(netAmount)`; `amount > 0`.
- **Events**: `Deposit(user, amount, agTokenMinted)`.
- **Errors**: `SupplyCapExceeded()`, `AmountZero()`.

### `withdraw(uint256 amount)`

- **Access**: any `agTOKEN` holder.
- **Modifiers**: `nonReentrant`, `whenNotPaused`.
- **State changes**:
  - `reserve.updateState()`.
  - `actualAmount = amount == type(uint256).max ? agTOKEN.balanceOf(msg.sender) : amount`.
  - `_ensureLiquidity(actualAmount)`.
  - `agTOKEN.burn(msg.sender, actualAmount)`.
  - Transfer USDC to user.
- **Validation**: `!withdrawalsPaused || msg.sender == stabilityPool`; `agTOKEN.balanceOf(msg.sender) >= actualAmount`.
- **Events**: `Withdraw(user, amount)`.
- **Errors**: `WithdrawalsArePaused()`, `InsufficientBalance()`, `LiquidityShortfall()`.

!!! note

    `withdrawalsPaused` is Pauser-triggered. When set, only the `StabilityPool` can withdraw (required to finalize liquidations).

## Vault position

### `openVaultPosition()`

- **State**: `vaultOpened[msg.sender] = true`; collects `vaultOpeningFee` if > 0 (0 in V1).
- **Validation**: `!vaultOpened[msg.sender]`.
- **Events**: `VaultOpened(user, feePaid)`.
- **Errors**: `VaultPositionAlreadyOpened()`.

## Collateral management

### `depositAsset(address adapter, bytes calldata data)`

- **Access**: users with open vault.
- **Modifiers**: `nonReentrant`, `whenNotPaused`, `onlySupportedAdapter(adapter)`.
- **State changes**:
  - `reserve.updateState()`.
  - `IAssetAdapter(adapter).deposit(msg.sender, data)`: adapter handles oracle freshness, token transfer, internal accounting.
- **Validation**: vault opened; position not under liquidation; adapter registered.
- **Events**: typically `AssetDeposited(user, adapter, data, amount)` from adapter.
- **Errors**: `VaultPositionNotOpened()`, `CannotDepositWhenUnderLiquidation()`, `UnsupportedAdapter()`, adapter-level (`OracleStale()`).

### `withdrawAsset(address adapter, bytes calldata data)`

- **State changes**:
  - `reserve.updateState()`.
  - If position has debt: compute post-withdrawal HF and revert if < threshold.
  - `IAssetAdapter(adapter).withdraw(msg.sender, data)`.
- **HF check formula**:
  ```
  remainingCollateralValue = getAssetValue(user, data) − getWithdrawValue(user, data)
  newHF = remainingCollateralValue × liquidationThreshold × RAY
        / (positionScaledDebt × 10000)
  require(newHF >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD)
  ```
- **Errors**: `WithdrawalWouldLeaveUserUnderCollateralized()`, `CannotWithdrawUnderLiquidation()`.

## Borrow & repay

### `borrow(address adapter, bytes calldata data, uint256 amount)`

- **Access**: vault owners.
- **State changes**:
  - `reserve.updateState()`.
  - `_validateBorrow(adapter, data, amount)`: checks collateral sufficiency, borrow cap, `MIN_BORROW_AMOUNT`.
  - `_ensureLiquidity(amount)`.
  - `DebtToken.mint(user, user, amount, usageIndex, encoded)` → returns `(newIndex, userBalance, userIncrease, totalIncrease)`.
  - `position.positionIndex = reserve.usageIndex`; `position.rawDebtBalance += amount + userIncrease`.
  - `originationFee` (50 bps default) deducted from amount before transfer.
  - `agTOKEN.transferUnderlying(msg.sender, amount − originationFee)`.
  - `reserve.updateInterestRates(0, amount)`.
- **Events**: `Borrow(user, amount, originationFee)`.
- **Errors**: `CannotBorrowUnderLiquidation()`, `HealthFactorTooLow()`, `BorrowCapExceeded()`, `AmountBelowMinimum()`, `LiquidityShortfall()`.

### `repay(address adapter, bytes calldata data, uint256 amount)`

- **State changes**:
  - `reserve.updateState()`.
  - `scaledDebt = getPositionScaledDebt(adapter, msg.sender, data)`.
  - `actualRepay = amount == type(uint256).max ? scaledDebt : amount`.
  - `DebtToken.burn(msg.sender, actualRepay, usageIndex, encoded)`.
  - `position.positionIndex = reserve.usageIndex`; `position.rawDebtBalance -= actualRepay`.
  - USDC pulled via balance-delta; transferred to `agTOKEN` contract.
  - `reserve.updateInterestRates(actualRepay, 0)`.
- **Validation**: `!isUnderLiquidation`; if partial, residual must be zero or ≥ `MIN_BORROW_AMOUNT`.
- **Events**: `Repay(payer, onBehalfOf, actualRepay)`.
- **Errors**: `CannotRepayUnderLiquidationWithoutInsurance()`, `ResidualCannotBeRepaid()`, `AmountZero()`.

## Liquidation management

All three functions carry `onlyProxy`: invokable only through `LiquidationProxy`.

### `initiateLiquidation(address adapter, address user, bytes data)`

- **Precondition**: position exists; `!isUnderLiquidation`; HF < `HEALTH_FACTOR_LIQUIDATION_THRESHOLD`.
- **State**: `position.isUnderLiquidation = true`; `liquidationStartTime = block.timestamp`.
- **Events**: `LiquidationInitiated(sender, user, adapter, data)`.
- **Errors**: `UserAlreadyUnderLiquidation()`, `HealthFactorTooHigh()`.

### `closeLiquidation(address adapter, bytes data)`

- **Access**: `msg.sender` must be the position owner.
- **Precondition**: `isUnderLiquidation`; within grace period; position debt == 0 (must have been fully repaid via separate `repay()`).
- **State**: clear flags.
- **Events**: `LiquidationClosed(user, adapter, data)`.
- **Errors**: `NotUnderLiquidation()`, `GracePeriodExpired()`, `DebtNotZero()`.

### `finalizeLiquidation(address adapter, address user, bytes data)`

- **Access**: only `StabilityPool`.
- **Precondition**: `isUnderLiquidation`; grace period expired.
- **State**:
  1. `reserve.updateState()`.
  2. `positionDebt = getPositionScaledDebt(adapter, user, data)`.
  3. `IAssetAdapter(adapter).transferAsset(user, data, stabilityPool)`.
  4. `DebtToken.burn(user, positionDebt, usageIndex, encoded)`.
  5. Clear position: `rawDebtBalance = 0`, flags cleared, `positionIndex = reserve.usageIndex`.
  6. `reserve.updateInterestRates(positionDebt, 0)`.
- **Events**: `LiquidationFinalized(stabilityPool, user, adapter, data, debtCleared, collateralValue)`.
- **Errors**: `NotUnderLiquidation()`, `GracePeriodNotExpired()`.

## View functions

| Function                                                          | Returns                                      |
|-------------------------------------------------------------------|----------------------------------------------|
| `calculateHealthFactor(adapter, user, data)`                      | `uint256` (RAY; `max` if debt = 0)           |
| `getUserCollateralValue(user)`                                    | `uint256` (sum across adapters, informational) |
| `getPositionScaledDebt(adapter, user, data)`                      | `uint256` (debt + accrued interest)          |
| `getPositionsScaledDebt(user)`                                    | `uint256` (sum across positions)             |
| `getPosition(adapter, user, data)`                                | `CollateralPosition`                          |
| `getPositionView(adapter, user, data)`                            | `CollateralPositionView` (synthesized)       |
| `getNormalizedIncome()`                                           | `uint256` (liquidity index)                  |
| `getNormalizedDebt()`                                             | `uint256` (usage index)                      |
| `getReserveState()`                                               | `ReserveData`                                 |
| `supportedAdapter(address)`                                       | `bool`                                        |
