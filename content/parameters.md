# Parameters

Every configurable knob in Agama V1. Values marked **✅** under Governance are changeable by the owner multisig through the 48h timelock.

## Lending Pool (global)

| Parameter                                | V1 Default    | Governance | Notes                                  |
|------------------------------------------|---------------|:----------:|----------------------------------------|
| `supplyCap`                              | 10M USDXP     | ✅          | Per-reserve deposit ceiling.            |
| `borrowCap`                              | 10M USDXP     | ✅          | Total outstanding debt ceiling.         |
| `depositFee`                             | 0 bps         | ✅          | Pull at deposit; V1 = 0.                |
| `vaultOpeningFee`                        | 0 USDXP       | ✅          | Pull at `openVaultPosition`; V1 = 0.    |
| `originationFee`                         | 50 bps (0.5%) | ✅          | Deducted from borrow amount.            |
| `reserveFactor`                          | 1500 bps (15%)| ✅          | Borrow interest to Collector.            |
| `MIN_BORROW_AMOUNT`                      | 100 USDXP     | ❌          | Dust prevention, immutable.             |
| `liquidationGracePeriod`                 | 72 hours      | ✅          | RAAC default.                           |
| `HEALTH_FACTOR_LIQUIDATION_THRESHOLD`    | 1e27 (RAY)    | ❌          | Hardcoded 1.0 in RAY.                    |
| `withdrawalsPaused`                      | false         | ✅ (Pauser) | Emergency.                              |
| `canPaybackDebt` (repayOnBehalf)         | false         | ✅          | V1 disabled.                            |
| `usdxpOracle`                            | address(0)    | ✅          | Reserved for V2.                        |

!!! warning

    **Design Review #8**: `MIN_BORROW_AMOUNT = 100 USDXP` is likely too low for RWA. Off-chain redemption fixed costs make small-dollar liquidation uneconomical. Recommend raising to 1000 USDXP or per-adapter calibration.

## Per-adapter risk

| Parameter                | AmFi     | Nimofast | Notes                                    |
|--------------------------|---------:|---------:|------------------------------------------|
| `MAX_LTV`                | 7000 bps | 6500 bps | Borrow threshold in basis points.         |
| `LIQUIDATION_THRESHOLD`  | 8000 bps | 7500 bps | LLTV in basis points.                     |
| `LIQUIDATION_BONUS`      |  500 bps |  700 bps | Seized above debt, basis points.          |
| `ORACLE_STALENESS_MAX`   | 48 hours | 48 hours | Max oracle age.                           |

## Interest Rate Model

| Parameter        | Value        | Notes                                   |
|------------------|-------------:|-----------------------------------------|
| `BASE_RATE`      |  200 bps (2%)| Minimum borrow APY                      |
| `SLOPE_1`        |  800 bps (8%)| 0 → `OPTIMAL_UTIL`                      |
| `SLOPE_2`        | 6000 bps (60%)| Above `OPTIMAL_UTIL` (steep)           |
| `OPTIMAL_UTIL`   | 80%          | Kink point                              |

## Stability Pool

| Parameter                  | Value      |
|----------------------------|-----------:|
| `withdrawTimelockDuration` | 30 minutes |
| `withdrawTimelockDelay`    | 2 days     |

## Settlement Vault

| Parameter           | Value       |
|---------------------|------------:|
| `treasuryBps`       |   200 (2%)  |
| `burnBps`           |   300 (3%)  |
| `redeemBps`         |  9500 (95%) |
| `inKindBps`         |     0 (0%)  |
| `staleBatchPeriod`  |  60 days    |

## Fee Collector distributions (V1)

| Fee Type                   | Treasury | Reserve Fund |
|----------------------------|---------:|-------------:|
| `OPENING_FEE_TYPE`         | 70%      | 30%          |
| `DEPOSIT_FEE_TYPE`         | 70%      | 30%          |
| `ORIGINATION_FEE_TYPE`     | 70%      | 30%          |
| `PROTOCOL_REVENUE_TYPE`    | 70%      | 30%          |

## Timelocks

| Parameter                         | Value      |
|-----------------------------------|-----------:|
| Upgrade / parameter timelock      | 48 hours   |
| ReserveFund withdraw extra delay  | 14 days    |
| Stale batch escape hatch          | 60 days    |
| Liquidation grace period          | 72 hours   |
| SP withdraw timelock              | 30 minutes |
| SP withdraw execution window      | 2 days     |
