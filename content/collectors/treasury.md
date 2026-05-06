# Treasury

`AgamaTreasury` holds operational reserves for Agama. Whitelisted tokens only: direct transfers of non-whitelisted tokens result in permanent loss.

## Purpose (explicit policy)

!!! note

    **Design Review #11**: We commit to an explicit written treasury policy:
    1. Fund ongoing operations (team, audits, infra).
    2. Top up the ReserveFund if its coverage ratio drops below 2%.
    3. Seed mainnet bootstrap liquidity incentives (one-time).
    4. **Stake a portion of operational reserves in the Stability Pool (V1 testnet) to bootstrap pool depth.**

    Any treasury withdrawal outside this policy requires a public governance post published at least 48 hours before execution.

## Stability Pool participation (V1 testnet)

In V1 testnet, the Treasury stakes a portion of its `agYLD` balance in the [Stability Pool](/stability-pool/overview), receiving `sagYLD` shares like any other participant. This is a bootstrap measure: the Stability Pool has meaningful depth from day one, before retail stakers ramp.

**Mechanics.** The Treasury is treated identically to retail stakers and the Reserve Fund — same `sagYLD`, same share price, same pro-rata exposure. There is no privileged tier:

- **Earns** pro-rata supply APY + liquidation bonuses on its staked share.
- **Absorbs** pro-rata losses if the Stability Pool eats bad debt.
- **Unwinds** through the standard `requestWithdraw` / `withdraw` timelock flow when governance decides to redeploy the capital elsewhere.

The Treasury's `sagYLD` position is reported in the monthly transparency report alongside other reserves.

!!! warning

    The V1 testnet allocation will be re-evaluated for mainnet. Whether the Treasury continues to stake on mainnet — and at what fraction — is a governance decision based on observed pool depth from retail stakers.

## Supported tokens (V1)

| Token     | Use                                                                |
|-----------|--------------------------------------------------------------------|
| USDr      | Primary operational reserve.                                       |
| agYLD   | Accrual of supply yield on treasury reserves.                      |
| sagYLD     | V1 testnet: Stability Pool stake for pool-depth bootstrap.         |
| AMFI RWA tokens | Intermediate: held briefly before redemption via Manager.    |

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
- Stability Pool position: `sagYLD` balance and current redeemable `agYLD` value.
- Pending commitments.

All withdrawals are independently verifiable via on-chain `Withdrawn` events.
