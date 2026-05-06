# How It Works

Agama has two actors: **Alice** borrows, **Bob** lends. Bob can optionally stake his lender receipt in the Stability Pool to earn extra yield in exchange for absorbing liquidations.

## Alice, the borrower

| Attribute         | Value                                                 |
|-------------------|-------------------------------------------------------|
| Holds             | A yield-bearing RWA tranche (Senior or Junior)        |
| Deposits          | The tranche as collateral on the matching market      |
| Borrows           | USDr                                                  |
| Goal              | Leverage her RWA position without selling             |
| Entry point       | `openVaultPosition()` → `depositAsset(adapter, …)` → `borrow(adapter, …, amount)` |

Alice holds a tokenised private-credit tranche — say `sRESOLV` (Resolvi Senior) or `jCONDO` (Sector Condo Junior). The token is **yield-bearing** in its own right: holding it accrues real-world interest at a base rate `x%`. Agama lets her stack on-chain leverage on top of that yield without selling the position.

She can also run positions on **multiple markets in parallel**. Borrowing on `sRESOLV` doesn't touch her position on `jCONDO` — debt is isolated per market, so each market has its own health factor and can be liquidated independently. See [Overview → Per-market debt isolation](/overview#per-market-debt-isolation).

### Typical loop

Alice's leverage cap is not a protocol-enforced number; it's the mathematical limit implied by the LTV. A Senior tranche has `MAX_LTV` 75%, so infinite loops at that ceiling converge to ~4× leverage. A Junior tranche caps at 50% LTV (terminal 2×). In practice Alice runs below the cap for a healthier health-factor margin.

```
Initial position: 1,000,000 sRESOLV (yield-bearing, ~12% APY)

Loop 1: deposit 1M    → borrow 500k USDr (50% LTV) → buy 500k sRESOLV via the issuer
Loop 2: deposit 500k  → borrow 250k USDr            → buy 250k sRESOLV
Loop 3: deposit 250k  → borrow 125k USDr            → buy 125k sRESOLV

After 3 loops:  1.875M sRESOLV collateral,  0.875M USDr debt
Net APY      =  12% × 1.875  −  10% × 0.875
             =  22.5%        −  8.75%
             =  13.75%
```

> **On the stablecoin side.** Rayls has no native USDC issuance, so Agama's reserve asset is **`USDr`**, the Rayls native dollar stablecoin, **1:1 backed by USDC held in reserve**. USDr is economically equivalent to USDC; the wrapping is a network artifact.
>
> **On the AmFi side.** Tranche tokens are denominated in `ABRL` (BRL-pegged stablecoin issued by AmFi, 1:1 backed by Brazilian Real bank reserves). AmFi accepts USDC from institutional subscribers and handles the USDC→ABRL conversion on its own platform.
>
> **Alice's actual flow.** She borrows USDr on Agama, redeems it for USDC at parity, sends USDC to AmFi, receives the tranche tokens, redeposits them as collateral on the matching market. The cross-currency exposure is real: her collateral is BRL-denominated and her debt is USD-denominated, so USD/BRL FX is a structural input to her health factor.

See [Interest Rate Model → Looping viability](/lending-pool/interest-rate-model#looping-viability) for the loop-by-loop table at different LTV settings, including the Senior 75% ceiling and Junior 50% ceiling.

## Bob, the lender

Bob is a crypto user seeking RWA-backed yield. He deposits USDr into the Lending Pool and earns supply APY as borrowers pay interest.

Bob's flow has **two steps**. Step 1 is the baseline lender position; Step 2 is optional and layers on top.

### Step 1. Lend (required)

| Attribute  | Value                                                  |
|------------|--------------------------------------------------------|
| Deposits   | USDr (into the Lending Pool)                          |
| Receives   | `agYLD` (yield-bearing receipt, ERC-4626 / ERC-20)     |
| Yield      | Supply APY. `agYLD` appreciates as borrowers pay interest |
| Exit       | Anytime, subject to pool utilization                   |

Bob deposits USDr, receives `agYLD`, done. `agYLD` is transferable and composable across Rayls DeFi. See [Lending Pool → What is agYLD](/lending-pool/overview#what-is-agyld) for the full mechanics.

### Step 2. Stake in the Stability Pool (optional)

Bob can take the `agYLD` he just got in Step 1 and stake it in the Stability Pool to become a Stability Provider.

| Attribute     | Value                                                                          |
|---------------|--------------------------------------------------------------------------------|
| Deposits      | `agYLD` (from Step 1, not USDr directly)                                       |
| Receives      | `sagYLD` (ERC-4626 share)                                                      |
| Yield         | Supply APY (kept via `agYLD` exposure) + liquidation premiums                  |
| Risk          | Absorbs liquidations for ~15 days while Settlement Vault redeems off-chain     |
| Unstake       | **7-day cooldown** (`requestUnstake` → wait → `claim`). Pending shares stay earmarked and continue absorbing liquidations during cooldown. |

The Stability Pool takes **`agYLD`, not USDr**. That's deliberate: Bob keeps earning supply yield while staked, *and* is positioned to absorb liquidations for an additional premium. If the Stability Pool accepted USDr directly, Bob would lose the supply APY.

The cooldown trade-off is also deliberate. Letting Bob exit the second he sees trouble would empty the SP exactly when the protocol needs it. So a `requestUnstake` queues his shares for 7 days, during which they keep working — earning premiums but also still absorbing liquidations. See [Stability Pool → Cooldown on unstake](/stability-pool/overview#cooldown-on-unstake) for the full mechanics, including the earmark behaviour and the settlement extension.

## When Alice gets liquidated

If Alice's health factor on a market falls below 1 and the manager-keeper submits a liquidation before she cures (no on-chain grace period in V1 — the seizure is single-step and atomic):

1. **Collateral leaves Alice's vault.** Her RWA is held by the asset adapter (e.g. `AmFiAdapter`), not by the Lending Pool itself. The adapter transfers the RWA tokens directly to the Stability Pool. Her USDr debt is burned. She loses the collateral, but owes nothing.
2. **Bob's `agYLD` stays whole.** The Stability Pool immediately repays the Lending Pool's USDr by burning some of its own `agYLD`. Pure lenders (Step 1 only) are never impacted; their `agYLD` keeps appreciating as if nothing happened.
3. **Staked Bob absorbs, then recovers.** Bob's `sagYLD` represents a claim on the Stability Pool's `agYLD` pool, which just shrank by the debt amount. For ~15 days the Stability Pool holds RWA tokens instead of `agYLD` while the Settlement Vault redeems them off-chain with the issuer.
4. **Settlement restores the peg.** When USDr returns from the redemption (~D+15 for AmFi), it's deposited back into the Lending Pool on the Stability Pool's behalf, which re-mints `agYLD` for the Stability Pool. The recovered value typically exceeds the debt; the surplus is the **liquidation premium**, which flows pro-rata to all `sagYLD` holders, including the Reserve Fund as a co-staker. All participants earn proportionally to their share of `sagYLD` — there is no privileged slice routed elsewhere.

Net effect: pure lenders are protected in real time; staked lenders take a temporary balance-sheet exposure and earn the bonus as compensation.

### Expected Stability Pool yield

Two components:

1. **Supply APY** via `agYLD` appreciation, same as a pure lender.
2. **Liquidation premium**, paid out when borrowers get liquidated and stakers share pro-rata in the seized collateral's recovery value beyond the debt absorbed.

Modelling:

```
Assume: 3% of outstanding loans liquidated per year,
        5% average liquidation premium captured on those events,
        80% of that premium net of fees reaches Stability Pool stakers.

Annual premium to the Stability Pool, expressed as a fraction of the loan book:
  = 3% × 5% × 80%
  = 0.12% × loan_book per year
```

That premium is split among Stability Pool stakers proportional to their stake. Define the pool's capitalisation ratio:

```
k  =  SP_capital / loan_book
```

Per-staker yield boost is `0.12% / k`. Per-staker exposure during a single liquidation event also scales with `1 / k` (a thinner pool absorbs each event with thinner shoulders). The yield premium and the loss exposure move together; **the boost is compensation for concentration risk, not a free lunch**.

| `k` (Stability Pool / borrows) | Annual yield boost | Drawdown on a 1%-of-borrows liquidation |
|:------------------------------:|-------------------:|----------------------------------------:|
| 1.00 (parity)                  |          **0.12%** |                                  ~1.0%  |
| 0.30                           |          **0.40%** |                                  ~3.3%  |
| 0.10                           |          **1.20%** |                                  ~10%   |

The drawdown is temporary: the Settlement Vault refills the pool over the ~15-day redemption cycle, and the Reserve Fund covers any shortfall (so principal is generally protected, even if the on-chain `sagYLD` value dips before settlement).

The base scenario (3% liquidation rate, 5% premium) is conservative. RWA stress events can compress that further on the upside; long calm periods compress it on the downside. Headline: **Stability Pool yield ≈ lender APY + premium_stream**, where the premium stream scales with liquidation flow and the pool's capitalisation choice.
