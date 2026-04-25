# Interest Rate Model

Standard two-slope kink (Aave / Compound family). Implemented in `AgamaInterestRateModel.sol` (or inlined in `ReserveLibrary`).

## Formulas

**Lender yield:**

```
Lender Yield = Borrow Rate × Utilization × (1 − Reserve Factor)
```

The Reserve Factor (10% in V1) is the cut the protocol takes from the interest paid by borrowers. Everything else flows to lenders proportional to utilization.

**Borrow rate** (two-slope kink):

```
u = totalBorrowed / totalLiquidity

if u ≤ OPTIMAL_UTIL:
    borrowRate = BASE_RATE + (u / OPTIMAL_UTIL) × SLOPE_1
else:
    excess     = (u − OPTIMAL_UTIL) / (1 − OPTIMAL_UTIL)
    borrowRate = BASE_RATE + SLOPE_1 + excess × SLOPE_2
```

## The kink curve

```
  APY
   ▲
55 ┤                                          ╱── 55%   u=95%
   │                                        ╱
   │                                      ╱
40 ┤                                    ●── 40%   u=90%
   │                                  ╱           ← SLOPE_2 (steep, 60%)
30 ┤                                ╱
   │                              ╱
20 ┤                            ╱
   │                          ╱
10 ┤                       ●── 10%          ← kink @ OPTIMAL_UTIL (80%)
 9 ┤                    ●── 9%    u=70%
 7 ┤                 ●── 7%       u=50%
 5 ┤             ●── 5%           u=30%     ← SLOPE_1 (gentle, 8%)
 2 ┤   ●─── 2%                                (BASE_RATE)
   ●──────────────────────────────────────▶  utilization
     0%    30%  50%   70%  80%   90%  95%   100%
```

Below 80% utilization, the gentle slope keeps borrowing affordable. Above 80%, the steep slope prices repayment pressure: utilization is discouraged from climbing further because it becomes expensive.

## V1 parameters

| Parameter        | Value         | Notes                                               |
|------------------|---------------|-----------------------------------------------------|
| `BASE_RATE`      | 200 bps (2%)  | Minimum borrow APY                                  |
| `SLOPE_1`        | 800 bps (8%)  | 0 → `OPTIMAL_UTIL`                                  |
| `SLOPE_2`        | 6000 bps (60%)| Above `OPTIMAL_UTIL`: steep to force repays        |
| `OPTIMAL_UTIL`   | 80%           | Kink point                                          |
| `reserveFactor`  | 1000 bps (10%)| Protocol cut on borrow interest (flows to Collectors) |

## Reference values

| Utilization | Borrow APY | Lender APY |
|------------:|-----------:|-----------:|
| 30%         |    5.00%   |    1.35%   |
| 50%         |    7.00%   |    3.15%   |
| 70%         |    9.00%   |    5.67%   |
| 80%         |   10.00%   |    7.20%   |
| 90%         |   40.00%   |   32.40%   |
| 95%         |   55.00%   |   47.03%   |

Lender APY computed as `Borrow APY × Utilization × (1 − 10%)`.

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
