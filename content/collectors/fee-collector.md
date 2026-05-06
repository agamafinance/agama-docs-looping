# Fee Collector

`AgamaFeeCollector` is a **push-based** fee router. Protocol contracts call `collectFee(token, from, amount, feeType)` and the collector forwards the funds to the Treasury **in the same transaction**. There is no per-fee-type accumulator and no two-step distribute call — the design is intentionally minimal in V1.

> The earlier doc described an Aave-style pull-based design with `accumulated[feeType][token]` and a separate `distributeFees` call. The shipped contract dropped that in favour of an immediate forward, which keeps the audit surface minimal and means fees never sit in the collector. Off-chain dashboards still get per-feeType events, so accounting parity is preserved.

## Supported fee types

| Constant | Triggered by |
|---|---|
| `FEE_VAULT_OPENING` | `LendingPool.openVaultPosition` (`vaultOpeningFee`, default 0). |
| `FEE_ORIGINATION` | `LendingPool.borrow` (`originationFeeBps`, default 0). |
| `FEE_PROTOCOL_REVENUE` | Interest reserve accrual driven by `reserveFactorBps` (default 10%). |

## Distribution

100% of every collected fee is forwarded to the **Treasury** in the same transaction the fee is collected. There is no on-contract split between Treasury and Reserve Fund — the Reserve Fund participates in protocol revenue **as a Stability Pool staker**, earning its pro-rata share through `sagYLD` appreciation rather than through a hard-coded fee channel. If Treasury wants to top up the Reserve Fund, that's a governance action, not a parameter on this contract.

## Access control

| Role | Capability |
|---|---|
| `DEFAULT_ADMIN_ROLE` | Full admin: set Treasury address, grant `POOL_ROLE`. |
| `POOL_ROLE` | Call `collectFee` and `settle`. Held by the LendingPool. |

There is no `FEE_MANAGER_ROLE`, `DISTRIBUTOR_ROLE`, or `EMERGENCY_ROLE` in V1.

## Functions

```solidity
/// Pull `amount` of `token` from `from` (which must have approved the
/// collector) and forward to Treasury in the same call.
function collectFee(
    address token,
    address from,
    uint256 amount,
    bytes32 feeType
) external onlyRole(POOL_ROLE);

/// Sweep any idle balance the LendingPool already pushed in via
/// safeTransfer (instead of approve + transferFrom). Tags the swept
/// amount under `feeType` for the dashboard.
function settle(address token, bytes32 feeType) external onlyRole(POOL_ROLE);

/// Update the Treasury recipient (governance-timelocked).
function setTreasury(ITreasuryDeposit _treasury)
    external onlyRole(DEFAULT_ADMIN_ROLE);

/// Whitelist a contract (typically the LendingPool) to call collectFee/settle.
function grantPool(address pool) external onlyRole(DEFAULT_ADMIN_ROLE);
```

## State

```solidity
ITreasuryDeposit public treasury;

/// Lifetime cumulative fees per (feeType, token) — drives the off-chain
/// dashboard. The collector never holds a non-zero balance after a call
/// because every collection forwards immediately.
mapping(bytes32 feeType => mapping(address token => uint256)) public lifetimeFees;
```

## Events

```solidity
event FeeCollected(address indexed token, address indexed from, uint256 amount, bytes32 indexed feeType);
event FeeForwarded(address indexed token, uint256 amount, bytes32 indexed feeType);
event TreasuryUpdated(address indexed treasury);
```

`FeeCollected` fires on every `collectFee` and on every `settle` sweep. `FeeForwarded` fires whenever the collector pushes funds to Treasury — paired 1:1 with `FeeCollected` because the forward is atomic with the collection. The off-chain dashboard subscribes to both and reconciles per `feeType`.
