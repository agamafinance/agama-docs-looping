# Lending Pool: Functions

Complete function reference. Every signature, access control, state change, validation, event, and error.

## Liquidity provision

### `deposit(uint256 amount)`

- **Modifiers**: `nonReentrant`, `whenNotPaused`.
- **State changes**:
  - `reserve.updateState()`: accrues interest.
  - `netAmount = amount − depositFee`.
  - Pull USDr via **balance-delta accounting** (defends against unknown transfer semantics).
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
  - Transfer USDr to user.
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
  - USDr pulled via balance-delta; transferred to `agTOKEN` contract.
  - `reserve.updateInterestRates(actualRepay, 0)`.
- **Validation**: `!isUnderLiquidation`; if partial, residual must be zero or ≥ `MIN_BORROW_AMOUNT`.
- **Events**: `Repay(payer, onBehalfOf, actualRepay)`.
- **Errors**: `CannotRepayUnderLiquidationWithoutInsurance()`, `ResidualCannotBeRepaid()`, `AmountZero()`.

## Liquidation

V1 liquidations are **single-step and atomic**. There is no on-chain grace period and no initiate/finalize staging — the whole seizure happens in one transaction. The function is gated by `LIQUIDATION_PROXY_ROLE`, which is held by the `LiquidationProxy` (manager-gated in V1) and by the Stability Pool itself.

### `liquidate(address adapter, address user, bytes calldata data) → (uint256 absorbedAssets, uint256 badDebt)`

- **Access**: `onlyRole(LIQUIDATION_PROXY_ROLE)`. In practice called via `LiquidationProxy.liquidate(...)` → `StabilityPool.liquidateBorrower(...)` → here.
- **Precondition**: `supportedAdapter[adapter]`; `stabilityPool != address(0)`; HF on the (user, adapter) market < 1. The adapter's stale-oracle check inside `getAssetValue` will revert with `OracleStale()` if the price feed has gone past `ORACLE_STALENESS_MAX` (7 days).
- **State**:
  1. `reserve.updateState()`.
  2. `_materializeRedistribution(adapter, user)`.
  3. **V3 isolation**: only the user's debt scoped to `(user, adapter)` is wiped — positions on other markets are untouched.
  4. `IAssetAdapter(adapter).transferAsset(user, data, stabilityPool)` — seized RWA flows to the SP.
  5. `DebtToken.burn(user, scopedDebt, usageIndex, ...)` — the per-market debt counter is zeroed.
  6. Clear the per-market position; `reserve.updateInterestRates(absorbed, 0)`.
- **Returns**: `(absorbedAssets, badDebt)` — `badDebt > 0` when collateral value < debt at seizure (routed through Reserve Fund / redistribution, see [Stability Pool → Liquidations](/stability-pool/liquidations)).
- **Events**: `Liquidated(adapter, user, data, absorbed, badDebt)`.
- **Errors**: `UnsupportedAdapter()`, `StabilityPoolNotSet()`, `HealthFactorTooHigh()`, `OracleStale()` (from the adapter).

> The previous V1 design had a 3-stage flow (`initiateLiquidation` / `closeLiquidation` / `finalizeLiquidation`) with a 72-hour grace period. The current V1 ships **without** that staging — the seizure is instant. The grace was dropped in favour of a single atomic call to keep the audit surface minimal and avoid the partial-state edge cases of a multi-tx liquidation. Borrowers cure by repaying or topping up collateral *before* the manager submits.

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
