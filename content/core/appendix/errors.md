# Appendix B — Error Catalog

Grouped by contract. All errors are custom errors (`error Name()`), not revert strings.

## LendingPool

- `SupplyCapExceeded()`
- `BorrowCapExceeded()`
- `AmountZero()`
- `AmountBelowMinimum()`
- `WithdrawalsArePaused()`
- `InsufficientBalance()`
- `LiquidityShortfall()`
- `VaultPositionAlreadyOpened()` · `VaultPositionNotOpened()`
- `CannotDepositWhenUnderLiquidation()` · `CannotWithdrawUnderLiquidation()` · `CannotBorrowUnderLiquidation()`
- `WithdrawalWouldLeaveUserUnderCollateralized()`
- `CannotRepayUnderLiquidationWithoutInsurance()`
- `GracePeriodExpired()` · `GracePeriodNotExpired()`
- `UserAlreadyUnderLiquidation()` · `NotUnderLiquidation()`
- `HealthFactorTooLow()` · `HealthFactorTooHigh()`
- `DebtNotZero()`
- `ResidualCannotBeRepaid()`
- `UnsupportedAdapter()`
- `NotKYCVerified()`
- `UserBlacklisted()`

## StabilityPool

- `TimelockDisabled()`
- `NoPendingWithdraw()`
- `WithdrawTimelockNotReady()` · `WithdrawTimelockExpired()` · `WithdrawTimelockInvalid()`
- `CannotDepositAndWithdrawSameBlock()`
- `WithdrawAmountTooHigh()`
- `InvalidAmount()`
- `CollateralAndParameterDataMismatch()`
- `AdaptersAssetMismatch()`
- `InvalidAddress()`
- `ApprovalFailed()`
- `NotManager()`

## Adapters

- `NotQualifiedInvestor()`
- `OracleStale()`
- `OraclePriceInvalid()`
- `InsufficientCollateral()`
- `NotLendingPool()`

## SettlementVault

- `BatchNotQueued()`
- `BatchAlreadySettled()`
- `BatchNotStale()`
- `SnapshotMissing()`
- `SplitInvalid()`  (sum ≠ 10000)
- `NotStabilityPool()`
- `NotManager()`

## ReserveFund

- `BufferInsufficient()`
- `NotLendingPool()`
- `WithdrawDelayNotElapsed()`

## FeeCollector / Treasury

- `UnsupportedToken()`
- `InsufficientBalance()`
- `SplitInvalid()`
- `ZeroAddress()`
