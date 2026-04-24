# Reserve Fund

`AgamaReserveFund` is the protocol's dedicated bad-debt buffer. It accumulates the `reserveFundBps` slice of every liquidation plus a configurable portion of the `reserveFactor` accrual, and is drawn down before any debt redistribution.

## Functions

```solidity
function deposit(address token, uint256 amount) external;

// Only callable by SettlementVault / LendingPool when covering a shortfall
function coverShortfall(uint256 usdxpAmount)
    external onlyLendingPool returns (uint256 covered);

// Governance-only, extra 14-day timelock on top of the standard 48h
function withdrawToTreasury(address token, uint256 amount)
    external onlyRole(DEFAULT_ADMIN_ROLE) withExtraDelay(14 days);
```

## Double-timelock on outflows

Outflows from the ReserveFund (other than `coverShortfall`) are subject to:

1. The standard 48-hour governance timelock (shared with all owner ops).
2. An **additional 14-day delay** baked into `AgamaReserveFund` itself.

This means even a compromised owner multisig cannot drain the buffer in less than ~16 days, giving the community and watchers time to react.

## Public coverage ratio

```
reserveCoverageRatio = ReserveFund.totalAssetValueUSDXP() / LendingPool.totalBorrowed()
```

| Ratio              | Status             | Action                                              |
|--------------------|--------------------|-----------------------------------------------------|
| ≥ 3%               | Healthy            | No action.                                          |
| 2% – 3%            | Watch              | Increase reserveFactor accrual split temporarily.   |
| 1% – 2%            | Low                | Treasury tops up; governance review.                 |
| < 1%               | Critical           | Alert; pause new borrows until restored.            |

!!! warning

    **Design Review #12**: the ReserveFund opens at zero balance at mainnet. For the first N months, the coverage ratio will be thin. We recommend founders seed 100k USDXP at launch to maintain ≥ 1% ratio from day 1.

## Sourcing

The ReserveFund accumulates from:

- `reserveFundBps` of every `LiquidationSplit` (RWA tokens, held until redemption).
- `30%` of `PROTOCOL_REVENUE_TYPE` fees (configurable).
- Direct deposits (team, external parties).
- Excess from `SettlementVault.settleRedemption` routing (V1 policy: 100% excess → ReserveFund).
