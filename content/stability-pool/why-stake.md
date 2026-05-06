# Why participate in the Stability Pool?

Staking `agYLD` in the Stability Pool is the second leg of Bob's flow ([Step 2 in How It Works](/how-it-works#step-2-stake-in-the-stability-pool-optional)). The pitch is mechanical, not promotional: a few extra basis points of yield in exchange for explicit, pro-rata exposure to liquidation absorption. This page lays out what those basis points come from and what the risk surface looks like.

## Higher yield than simple lending

A pure lender earns the supply APY only. A Stability Pool staker earns the supply APY *plus* a pro-rata share of every liquidation bonus, *plus* the RWA-collateral yield that accrues during the ~15-day settlement window of any liquidation the pool absorbs.

| Component                      | Source                                                              | Indicative |
|--------------------------------|---------------------------------------------------------------------|-----------:|
| Supply APY                     | Borrower interest, accrued via `agYLD` appreciation               |     ~7.2%  |
| Liquidation bonus              | Pro-rata share of `excess` redeposited into the SP                  |     ~0.4%  |
| Settlement-window RWA yield    | RWA collateral keeps accruing while held in the Settlement Vault    |     ~0.4%  |
| **Total (steady-state)**       | **`sagYLD` share-price appreciation**                                | **~8.0%**  |

Numbers are illustrative — actual yield depends on liquidation flow and pool capitalization. See [How It Works → Expected Stability Pool yield](/how-it-works#expected-stability-pool-yield) for the sensitivity table. All three components flow through `sagYLD`'s share price; there is no claim transaction, no separate reward token, no off-chain accrual to track.

## Settlement-window RWA yield (the structural bonus)

This is the component most easily missed. When the SP absorbs a liquidation, the seized RWA sits in the Settlement Vault for the ~15-day off-chain redemption cycle ([Liquidations → Why the 15-day window is structural](/stability-pool/liquidations#why-the-15-day-window-is-structural)).

The RWA token is itself yield-bearing during that window. AmFi senior tranche, for example, accrues at ~16% APY whether held by the borrower, the SP, or the Settlement Vault. That accrual lands in the recovered USDr at settlement and flows through `LendingPool.depositOnBehalf(stabilityPool, excess)` into the SP, lifting the share price pro-rata.

Pure lenders never see this yield: they don't carry the asset across the window. SP stakers do. The settlement-window bonus is the structural compensation for that 15-day exposure.

## Reserve Fund as co-staker

The Reserve Fund stakes its capital in the Stability Pool, holding `sagYLD` shares like any retail staker. Two consequences:

- **Pool depth.** The Reserve Fund's stake adds capital to the SP, lowering each retail holder's pro-rata share of any single absorption. Larger pool, thinner per-staker exposure.
- **Confidence signal.** The protocol does not insulate its own buffer from SP risk. The Reserve Fund eats pro-rata losses alongside retail and earns pro-rata bonuses. Skin in the same game.

There is no privileged tier and no separate routing. The Reserve Fund is seeded once (initial grant in V1 testnet) and stakes that capital in the SP. See [Reserve Fund → How the Reserve Fund earns yield](/collectors/reserve-fund#how-the-reserve-fund-earns-yield).

## Treasury as co-staker (V1 testnet)

In V1 testnet, the Treasury also stakes a portion of its operational reserve in the Stability Pool. This is a bootstrap measure for the testnet phase: pool depth from day one, before retail stakers ramp.

Like the Reserve Fund, the Treasury earns pro-rata and absorbs pro-rata. It is governed by the [Treasury policy](/collectors/treasury#purpose-explicit-policy), with any unwind subject to the same governance timelock as other Treasury operations.

## Pro-rata transparency

The pool is one bucket. There are no tranches, no priority classes, no side-pools. Every participant — retail, Reserve Fund, Treasury — holds `sagYLD` shares and is treated identically by the contract.

If you hold X% of `sagYLD.totalSupply()`:

- You earn X% of every liquidation bonus.
- You absorb X% of any bad debt the SP eats.
- Your share price tracks the pool's net economic state, nothing more, nothing less.

### Worked example

Pool composition (illustrative — see [Stability Pool overview](overview.md#worked-example) for the canonical version):

| Holder         | `sagYLD`     | Share  |
|----------------|------------:|-------:|
| Reserve Fund   |   200,000   |  20%   |
| Treasury       |    50,000   |   5%   |
| Bob            |    10,000   |   1%   |
| Charlie        |    50,000   |   5%   |
| Other stakers  |   690,000   |  69%   |
| **Total**      | **1,000,000** | **100%** |

A liquidation settles with **80,000 USDr of excess** redeposited. Distribution:

| Holder         | Share | Bonus credited at settlement |
|----------------|------:|-----------------------------:|
| Reserve Fund   |  20%  |   16,000 USDr-equivalent     |
| Treasury       |   5%  |    4,000 USDr-equivalent     |
| Bob            |   1%  |      800 USDr-equivalent     |
| Charlie        |   5%  |    4,000 USDr-equivalent     |
| Other stakers  |  69%  |   55,200 USDr-equivalent     |
| **Total**      | 100%  | **80,000 USDr**              |

Same math runs in reverse on a loss event. No participant is shielded.

## The honest risk: pro-rata loss exposure

The Stability Pool absorbs liquidations. In the nominal case the pool is repaid in full at settlement and pockets the premium. In the pathological case — redemption returns less USDr than the absorbed debt — the shortfall is socialised across SP stakers through the share-price drop. Because the Reserve Fund is the largest single SP staker, **it absorbs the largest share of any dilution before retail stakers do**. There is no separate `coverShortfall` draw-down in V1; the RF's first-loss role is structural, expressed through its `sagYLD` position. If the SP itself runs out of capacity, the LendingPool falls back to Liquity-style O(1) bad-debt redistribution across active borrowers.

What "socialized" means here, given the ERC-4626 design:

- `totalAssets()` of the SP falls by the absorbed loss.
- `sagYLD` share price drops pro-rata across all holders.
- Every staker (retail, Reserve Fund, Treasury) takes the loss in proportion to their `sagYLD` balance.

There is no preferential class.

### What protects the staker

1. **Reserve Fund as first-loss buffer.** The RF holds the largest single SP stake and therefore absorbs the largest pro-rata share of any dilution before retail stakers do. See [Reserve Fund → Public coverage ratio](/collectors/reserve-fund#public-coverage-ratio).
2. **Yield-bearing collateral throughout the 15-day window.** The seized RWA keeps accruing real-world interest while it sits in the Settlement Vault. See [Liquidations → What protects the staker during those 15 days](/stability-pool/liquidations#what-protects-the-staker-during-those-15-days).
3. **Liquidation bonus as compensation.** The protocol does not give SP stakers exposure for free; the bonus is the price paid for the 15-day carry.
4. **Escape hatch.** If the Manager fails to settle within `staleBatchPeriod` (60 days), holders can claim seized RWA in-kind via [`emergencyDistributeInKind`](/settlement-vault/overview#escape-hatch).
5. **Pool depth.** Reserve Fund and Treasury participation widens the share base, reducing the per-staker exposure on any single event.

## Bottom line

The Stability Pool offers a few extra basis points of yield in exchange for explicit pro-rata exposure to liquidation absorption. The yield comes from three mechanical sources (supply APY, liquidation bonus, settlement-window RWA accrual), every participant is treated identically, and the Reserve Fund + Treasury share the same risk surface as retail. That symmetry is the design's honest expression of the trade.
