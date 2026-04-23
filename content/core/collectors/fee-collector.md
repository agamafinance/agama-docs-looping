# Fee Collector

`AgamaFeeCollector` is a pull-based fee router. Protocol contracts call `collectFee(token, from, amount, feeType)`; the collector accumulates per-`feeType` and distributes on demand via `distributeFees(feeType, token)`.

## Supported fee types

| Constant                     | Triggered by                                           |
|------------------------------|--------------------------------------------------------|
| `OPENING_FEE_TYPE`           | `LendingPool.openVaultPosition` (0 in V1).              |
| `DEPOSIT_FEE_TYPE`           | `LendingPool.deposit` if `depositFee > 0`.              |
| `ORIGINATION_FEE_TYPE`       | `LendingPool.borrow` (50 bps default).                  |
| `PROTOCOL_REVENUE_TYPE`      | Interest reserve accrual (`reserveFactor`).             |

## Distribution targets (V1)

| Target         | Share (V1) |
|----------------|-----------:|
| `Treasury`     | 7000 bps (70%) |
| `ReserveFund`  | 3000 bps (30%) |

Per-fee-type splits are individually configurable; they must sum to 10000 bps. V1 applies the same 70/30 split to all fee types.

## Access control

| Role                  | Capability                                            |
|-----------------------|-------------------------------------------------------|
| `DEFAULT_ADMIN_ROLE`  | Full admin.                                           |
| `FEE_MANAGER_ROLE`    | Configure fee types, supported tokens, targets.       |
| `DISTRIBUTOR_ROLE`    | Trigger `distributeFees`.                             |
| `EMERGENCY_ROLE`      | Pause, emergency withdraw.                            |

## Functions

```solidity
function collectFee(address token, address from, uint256 amount, bytes32 feeType)
    external nonReentrant whenNotPaused returns (bool);

function distributeFees(bytes32 feeType, address token) external onlyRole(DISTRIBUTOR_ROLE);

function setFeeTypeSplit(bytes32 feeType, address[] targets, uint16[] basisPoints)
    external onlyRole(FEE_MANAGER_ROLE);
```

## Critical warning

!!! danger

    `AgamaFeeCollector` is pull-based and **does not track direct token transfers**. Tokens sent directly to the collector (not via `collectFee`) are lost. The Treasury and ReserveFund enforce the same convention.

## Transparency

Every fee collection emits `FeeCollected(token, from, amount, feeType)`. Every distribution emits `FeeDistributed(token, target, amount, feeType)`. These events power an off-chain dashboard showing:

- Cumulative fees per type.
- Distribution history per target.
- Undistributed backlog per fee type.

The dashboard is a V1 deliverable (published alongside mainnet).
