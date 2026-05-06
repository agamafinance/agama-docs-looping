# Reserve Fund

`AgamaReserveFund` is the protocol's bad-debt buffer. Functionally it is a **dedicated Stability Pool staker** with the largest single position in the SP — it absorbs liquidations pro-rata and earns liquidation premiums alongside every other staker. It is not a liquid USDr reserve; it cannot be drawn down on demand.

## Lifecycle

The Reserve Fund follows three phases:

1. **Seed (one-shot, admin)** — `seed(amount)` is callable by admin exactly once. It pulls USDr from the admin wallet (funded by the Rayls launch grant, target 100k USDr at TGE), deposits into the LendingPool to mint `agYLD`, then stakes the resulting `agYLD` into the Stability Pool to mint `sagYLD`.
2. **Top-ups (push, governance-gated)** — `deposit(USDr, amount)` is callable by any address with `DEPOSITOR_ROLE`. Pulls USDr and auto-stakes the same way the seed does. There is no liquid-hold mode.
3. **Unstake (governance, subject to SP cooldown)** — `requestUnstakeFromSP(sagYLDAmount)` queues an unstake against the Stability Pool. The RF then waits the same 7-day cooldown as any other staker, during which its earmarked shares **continue absorbing liquidations**. After cooldown, `claimUnstakeFromSP(requestId, recipient)` (returns `agYLD`) or `claimAndUnwrapToAddress(requestId, to)` (unwraps to USDr) finalises the exit.

> The earlier doc described a `coverShortfall(usdrAmount)` function callable by the LendingPool. That function does **not** exist. In V1, the RF protects the protocol *passively*: when the SP runs out of capacity, the LendingPool falls back to the Liquity O(1) bad-debt redistribution across active borrowers. Because the RF is the largest single SP staker, it absorbs the largest share of any SP dilution before the redistribution path is reached. There is no transactional draw-down.

## Functions

```solidity
/// One-shot at TGE. Pulls USDr from admin, deposits into LP, stakes into SP.
function seed(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE);

/// Push entrypoint for ongoing inflows. Auto-stakes the same way seed does.
function deposit(address token, uint256 amount) external onlyRole(DEPOSITOR_ROLE);

/// Queue an unstake (subject to the SP's 7-day cooldown).
function requestUnstakeFromSP(uint256 sagYLDAmount)
    external onlyRole(GOVERNOR_ROLE)
    returns (uint256 requestId);

/// Claim after cooldown — agYLD goes to `recipient`.
function claimUnstakeFromSP(uint256 requestId, address recipient)
    external onlyRole(GOVERNOR_ROLE)
    returns (uint256 agYLDOut);

/// Full-exit variant — claims then unwraps agYLD into USDr to `to`.
function claimAndUnwrapToAddress(uint256 requestId, address to)
    external onlyRole(GOVERNOR_ROLE);

/// Whitelist a new top-up source (e.g. Treasury, a settlement-time hook).
function grantDepositor(address account)
    external onlyRole(DEFAULT_ADMIN_ROLE);

/// Public view — the RF's sagYLD balance, used by dashboards.
function coverageBalance() external view returns (uint256);
```

## Public coverage ratio

```text
reserveCoverageRatio = ReserveFund.coverageBalance()   // sagYLD held by RF
                     × StabilityPool.convertToAssets(1e18)  // sagYLD → agYLD
                     × LendingPool.convertToAssets(1e18)    // agYLD → USDr
                     ÷ LendingPool.totalDebt()              // outstanding borrows
```

| Ratio | Status | Action |
|---|---|---|
| ≥ 3% | Healthy | No action. |
| 2 – 3% | Watch | Treasury top-up via `deposit` queued. |
| 1 – 2% | Low | Treasury tops up; governance review. |
| < 1% | Critical | Alert; pause new borrows until restored. |

The denominator (`totalDebt`) is the protocol-wide debt across all 6 markets (`DebtToken.totalSupply()`). The off-chain dashboard computes this every block; the contract does not enforce a threshold.

## Sourcing

The Reserve Fund grows through:

- **One-time TGE seed** (target 100k USDr from the launch grant).
- **Treasury top-ups** via `deposit`, gated by `DEPOSITOR_ROLE` (typically granted to Treasury and to a governance-controlled keeper).
- **Pro-rata SP yield**: the RF holds `sagYLD`, so every liquidation premium that lifts the `sagYLD` share price compounds into the RF's coverage automatically.

V1 policy explicitly does **not** route a slice off `LiquidationSplit` to the Reserve Fund. The `LiquidationSplit` struct in V1 has only two fields — `treasuryBps` and `redeemBps` — and the entire `redeemBps` portion (default 9800) is redeposited into the SP via `LendingPool.depositOnBehalf(stabilityPool, …)`. The RF earns its slice of liquidations exclusively through its `sagYLD` stake, just like any other staker. There is no double-funding rail.

## How the Reserve Fund earns yield

The Reserve Fund stakes USDr into the SP at construction and never holds an idle balance. It earns:

- **Lender APY** through the underlying `agYLD` (the asset of the SP vault, which itself accrues `liquidityIndex` interest).
- **Liquidation premiums** through `sagYLD` share-price appreciation each time the SP absorbs a liquidation and the SettlementVault redeposits the recovered USDr.

```text
TGE flow:
  Admin wallet  ──seed(amount)──►  ReserveFund
                                   │  USDr received
                                   ▼
                           LendingPool.deposit() ──► agYLD held by RF
                                   │
                                   ▼
                          StabilityPool.deposit() ──► sagYLD held by RF
```

This has two effects worth calling out:

1. **The buffer compounds.** The RF's USDr-equivalent value scales alongside SP yield, so coverage grows with activity — without taking a slice off every liquidation.
2. **Skin-in-the-game signal.** The RF co-absorbs risk with retail stakers rather than sitting on the sidelines. If liquidations sour, the RF takes the same pro-rata loss as everyone else.
