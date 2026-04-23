# Interest Rate Model

Standard two-slope kink (Aave / Compound / RAAC). Implemented in `AgamaInterestRateModel.sol` (or inlined in `ReserveLibrary`).

## Formula

```
u = totalBorrowed / totalLiquidity              // utilization, 0..RAY

if u <= OPTIMAL_UTIL:
    borrowRate = BASE_RATE + (u / OPTIMAL_UTIL) × SLOPE_1
else:
    excess     = (u − OPTIMAL_UTIL) / (RAY − OPTIMAL_UTIL)
    borrowRate = BASE_RATE + SLOPE_1 + excess × SLOPE_2

supplyRate = borrowRate × u × (RAY − reserveFactor) / RAY²
```

## V1 parameters

| Parameter        | Value         | Notes                                         |
|------------------|---------------|-----------------------------------------------|
| `BASE_RATE`      | 200 bps (2%)  | Minimum borrow APY                            |
| `SLOPE_1`        | 800 bps (8%)  | 0 → `OPTIMAL_UTIL`                            |
| `SLOPE_2`        | 6000 bps (60%)| Above `OPTIMAL_UTIL` (steep to force repays)  |
| `OPTIMAL_UTIL`   | 80%           | Kink point                                    |
| `reserveFactor`  | 1500 bps (15%)| Share of borrow interest to FeeCollector      |

## Reference values

| Utilization | Borrow APY | Supply APY |
|------------:|-----------:|-----------:|
| 30%         |    5.00%   |    1.28%   |
| 50%         |    7.00%   |    2.98%   |
| 70%         |    9.00%   |    5.36%   |
| 80%         |   10.00%   |    6.80%   |
| 90%         |   40.00%   |   30.60%   |
| 95%         |   55.00%   |   44.39%   |

## Looping viability

For Alice with AmFi senior at 16% yield:

```
Net APY(n loops) ≈ (16% × L(n)) − (borrowAPY × D(n))

where L(n) = 1 + 0.5 + 0.25 + … = 2 − 0.5^n   (with 50% LTV recommended)
      D(n) = 0.5 + 0.25 + 0.125 + … = 1 − 0.5^n
```

| Loops | Leverage L | Debt D | Net APY (at 10% borrow) |
|------:|----------:|------:|------------------------:|
| 1     |    1.50   |  0.50 |              19.0%      |
| 2     |    1.75   |  0.75 |              20.5%      |
| 3     |    1.875  |  0.875|              21.2%      |
| ∞     |    2.0    |  1.0  |              22.0%      |

At 70% LTV (max), terminal leverage = 3.33×, net APY ≈ 26.7% at 10% borrow APY.

!!! warning

    **[Design Review #1](../../challenges.md#irm-calibration)**: supply APY of 6.8% at optimal utilization is a thin spread vs just holding USDXP with XP/Clear. Consider lowering `BASE_RATE` to 150 bps and `SLOPE_1` to 700 bps to give 5.78% supply APY at kink — still competitive for lenders while preserving looping viability.

