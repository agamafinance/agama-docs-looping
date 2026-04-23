# DebtToken

| Property          | Value                                    |
|-------------------|------------------------------------------|
| Name              | Agama Debt Token                          |
| Symbol            | `aDebt-USDXP`                             |
| Standard          | Custom (scaled, non-transferable)         |
| Transferable      | **No** (soul-bound to borrower)           |
| Mint / burn       | `onlyLendingPool`                         |
| Accounting        | Scaled against `usageIndex`               |

## Scaling math

```
storedRaw       = position.rawDebtBalance
scaledDebt(user) = rawDebtBalance × currentUsageIndex / positionIndex
```

`balanceOf(user)` returns the scaled (interest-inclusive) debt. `scaledBalanceOf(user)` returns the raw pre-scaling balance if external contracts need it.

## Functions

```solidity
function mint(
    address caller,
    address onBehalfOf,
    uint256 amount,
    uint256 index,
    bytes calldata encoded
) external onlyLendingPool
  returns (uint256 newIndex, uint256 newBalance, uint256 userIncrease, uint256 totalIncrease);

function burn(
    address user,
    uint256 amount,
    uint256 index,
    bytes calldata encoded
) external onlyLendingPool;

function scaledBalanceOf(address user) external view returns (uint256);
function balanceOf(address user) external view returns (uint256);  // scaled
function totalSupply() external view returns (uint256);              // scaled
```

## Why non-transferable

Debt is personal. Allowing debt transfer would create griefing vectors (someone sending debt to a stranger's address) and complicate KYC/QI accounting. RAAC keeps debt soul-bound; Agama inherits this.

V2 may introduce a delegated-debt pattern for vault integrations.
