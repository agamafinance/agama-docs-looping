# Lending Pool: Functions

Complete function reference. Every signature, access control, state change, validation, event, and error.

## Liquidity provision

### `deposit(uint256 amount, address receiver) → uint256 shares`

Standard ERC-4626 deposit. Pulls `amount` USDr from `msg.sender`, mints `agYLD` shares to `receiver` at the current share price.

- **Modifiers**: `nonReentrant`, `whenNotPaused`.
- **State changes**:
  - `reserve.updateState()` accrues interest.
  - Pull USDr via balance-delta accounting (defends against unknown transfer semantics).
  - `shares = convertToShares(amount)`; `_mint(receiver, shares)`.
- **Validation**: `amount > 0`; `totalAssets() + amount ≤ supplyCap` (when `supplyCap` is set).
- **Events**: standard ERC-4626 `Deposit(sender, owner, assets, shares)`.
- **Errors**: `SupplyCapExceeded()`, `AmountZero()`.
- **No deposit fee in V1.** Lenders are not charged on the way in.

### `withdraw(uint256 amount, address receiver, address owner) → uint256 shares`

Standard ERC-4626 withdraw. Burns `agYLD` from `owner`, transfers `amount` USDr to `receiver`.

- **Modifiers**: `nonReentrant`, `whenNotPaused`.
- **State changes**:
  - `reserve.updateState()`.
  - `shares = convertToShares(amount, Math.Rounding.Ceil)`.
  - `_burn(owner, shares)`; transfer USDr to `receiver`.
- **Validation**: `!withdrawalsPaused || msg.sender == stabilityPool`; `shares ≤ balanceOf(owner)`; pool cash ≥ `amount`.
- **Events**: standard ERC-4626 `Withdraw(sender, receiver, owner, assets, shares)`.
- **Errors**: `WithdrawalsArePaused()`, `InsufficientBalance()`, `LiquidityShortfall()`.

!!! note

    `withdrawalsPaused` is Pauser-triggered. When set, only the `StabilityPool` can withdraw (required to keep liquidations functional).

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
- **HF check formula** (per-market — V3 isolation):
  ```
  remainingCollateralValue = adapter.getAssetValue(user, data) − adapter.getWithdrawValue(user, data)
  scopedDebt               = DebtToken.balanceOf(user, adapter)
  newHF = remainingCollateralValue × liquidationThreshold × RAY
        / (scopedDebt × 10000)
  require(newHF >= HF_LIQUIDATION_THRESHOLD)
  ```
  The check uses **per-market debt only** — the user's positions on other adapters do not factor in.
- **Errors**: `HealthFactorTooLow()`, `UnsupportedAdapter()`, `OracleStale()` (from the adapter when its oracle is past `ORACLE_STALENESS_MAX`).

## Borrow & repay

### `borrow(address adapter, bytes calldata data, uint256 amount)`

- **Access**: vault owners (`vaultOpened[msg.sender] == true`).
- **State changes**:
  - `reserve.updateState()`.
  - Per-market HF check using the borrower's collateral on `adapter` and the borrower's debt scoped to `(msg.sender, adapter)`.
  - `_ensureLiquidity(amount)`.
  - **Origination fee** (`originationFeeBps`, default 0) skimmed from `amount` and forwarded to the FeeCollector under `FEE_ORIGINATION`.
  - `DebtToken.mint(msg.sender, adapter, amount, usageIndex)` — debt scoped to `(user, adapter)`. The aggregate `DebtToken.totalSupply()` drives pool-wide utilisation; the per-market `DebtToken.totalSupply(adapter)` is the per-market position size.
  - Transfer `amount − originationFee` of USDr to `msg.sender`.
  - `reserve.updateInterestRates(0, amount)`.
- **Validation**: `supportedAdapter[adapter]`; `amount ≥ MIN_BORROW_AMOUNT`; aggregate borrow ≤ `borrowCap`.
- **Events**: `Borrow(user, adapter, amount, originationFee)`.
- **Errors**: `HealthFactorTooLow()`, `BorrowCapExceeded()`, `AmountBelowMinimum()`, `LiquidityShortfall()`, `UnsupportedAdapter()`, `OracleStale()` (from the adapter).

### `repay(address adapter, bytes calldata data, uint256 amount)`

- **State changes**:
  - `reserve.updateState()`.
  - `scaledDebt = getPositionScaledDebt(adapter, msg.sender, data)`.
  - `actualRepay = amount == type(uint256).max ? scaledDebt : amount`.
  - `DebtToken.burn(msg.sender, actualRepay, usageIndex, encoded)`.
  - `position.positionIndex = reserve.usageIndex`; `position.rawDebtBalance -= actualRepay`.
  - USDr pulled via balance-delta; transferred to `agYLD` contract.
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
