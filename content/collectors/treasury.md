# Treasury

`AgamaTreasury` holds operational reserves for Agama. Whitelisted tokens only: direct transfers of non-whitelisted tokens result in permanent loss.

## Purpose (explicit policy)

!!! note

    **Design Review #11**: We commit to an explicit written treasury policy:
    1. Fund ongoing operations (team, audits, infra).
    2. Top up the ReserveFund if its coverage ratio drops below 2%.
    3. Seed mainnet bootstrap liquidity incentives (one-time).

    Any treasury withdrawal outside this policy requires a public governance post published at least 48 hours before execution.

## Supported tokens (V1)

| Token     | Use                                          |
|-----------|----------------------------------------------|
| USDr     | Primary operational reserve.                  |
| agTOKEN   | Accrual of supply yield on treasury reserves. |
| AMFI RWA tokens | Intermediate: held briefly before redemption via Manager. |

## Functions

```solidity
function deposit(address token, uint256 amount) external;

// Implements IDistributionTarget, callable by FeeCollector
function distributeRewards(address token, address recipient, uint256 amount) external;

function withdraw(address token, address to, uint256 amount)
    external onlyRole(MANAGER_ROLE);

function setTokenSupported(address token, bool supported)
    external onlyRole(DEFAULT_ADMIN_ROLE);
```

## Access control

| Role                 | Holder                  | Capability                            |
|----------------------|-------------------------|---------------------------------------|
| `DEFAULT_ADMIN_ROLE` | Owner multisig (timelock) | Grant/revoke roles, manage tokens.  |
| `MANAGER_ROLE`       | Operational multisig    | Withdraw funds (ops budget).         |

## Balance-delta accounting

Every `deposit` measures `balanceOf(this)` before and after the transfer to defend against fee-on-transfer or rebase semantics. Direct transfers are still lost.

## Monthly transparency report

Agama publishes a monthly treasury report off-chain covering:

- Opening / closing balance per token.
- Inflows by fee type.
- Outflows by category (ops / audit / incentives / ReserveFund top-up).
- Pending commitments.

All withdrawals are independently verifiable via on-chain `Withdrawn` events.
