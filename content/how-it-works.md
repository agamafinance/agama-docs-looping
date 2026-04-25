# How It Works

Agama has two actors: **Alice** borrows, **Bob** lends. Bob can optionally stake his lender receipt in the Stability Pool to earn extra yield in exchange for absorbing liquidations.

## Alice, the borrower

| Attribute         | Value                                                 |
|-------------------|-------------------------------------------------------|
| Holds             | A yield-bearing RWA token (e.g. AmFi senior tranche)  |
| Deposits          | The RWA token as collateral                           |
| Borrows           | USDr                                                 |
| Goal              | Leverage her RWA position without selling             |
| Entry point       | `openVaultPosition()` → `depositAsset()` → `borrow()` |

Alice holds tokenized private credit (specifically the AmFi senior tranche in V1). The token is **yield-bearing** in its own right: holding it accrues real-world interest at a base rate `x%`. Agama lets her stack on-chain leverage on top of that yield without selling the position.

### Typical loop

Alice's leverage cap is not a protocol-enforced number; it's the mathematical limit implied by the LTV. AmFi V1's `MAX_LTV` is 70%, so infinite loops at that ceiling converge to ~3.33× leverage. In practice Alice runs at 50% LTV for a healthier health-factor margin, which converges to 2× leverage.

```
Initial position: 1,000,000 AMFI_SENIOR (yield-bearing, ~16% APY)

Loop 1: deposit 1M    → borrow 500k USDr (50% LTV) → buy 500k AMFI_SENIOR via AmFi
Loop 2: deposit 500k  → borrow 250k USDr            → buy 250k AMFI_SENIOR
Loop 3: deposit 250k  → borrow 125k USDr            → buy 125k AMFI_SENIOR

After 3 loops:  1.875M AMFI collateral,  0.875M USDr debt
Net APY      =  16% × 1.875  −  10% × 0.875
             =  30%          −  8.75%
             =  21.25%
```

> **On the stablecoin side.** Rayls has no native USDC issuance, so Agama's reserve asset is **`USDr`**, the Rayls native dollar stablecoin, **1:1 backed by USDC held in reserve**. USDr is economically equivalent to USDC; the wrapping is a network artifact.
>
> **On the AmFi side.** AmFi senior tranche tokens are denominated in `ABRL` (BRL-pegged stablecoin issued by AmFi, 1:1 backed by Brazilian Real bank reserves). AmFi accepts USDC from institutional subscribers and handles the USDC→ABRL conversion on its own platform.
>
> **Alice's actual flow.** She borrows USDr on Agama, redeems it for USDC at parity, sends USDC to AmFi, receives `AMFI_SENIOR` tokens, redeposits them as collateral. The cross-currency exposure is real: her collateral is BRL-denominated and her debt is USD-denominated, so USD/BRL FX is a structural input to her health factor.

Infinite loops at 50% LTV converge to 2× / 1× (collateral / debt), capping net APY at 22%. See [Interest Rate Model → Looping viability](/docs/lending-pool/interest-rate-model#looping-viability) for the full table at 50% and 70% LTV.

## Bob, the lender

Bob is a crypto user seeking RWA-backed yield. He deposits USDr into the Lending Pool and earns supply APY as borrowers pay interest.

Bob's flow has **two steps**. Step 1 is the baseline lender position; Step 2 is optional and layers on top.

### Step 1. Lend (required)

| Attribute  | Value                                                  |
|------------|--------------------------------------------------------|
| Deposits   | USDr (into the Lending Pool)                          |
| Receives   | `agTOKEN` (yield-bearing receipt, ERC-4626 / ERC-20)   |
| Yield      | Supply APY. `agTOKEN` appreciates as borrowers pay interest |
| Exit       | Anytime, subject to pool utilization                   |

Bob deposits USDr, receives `agTOKEN`, done. `agTOKEN` is transferable and composable across Rayls DeFi. See [Lending Pool → What is agTOKEN](/docs/lending-pool/overview#what-is-agtoken) for the full mechanics.

### Step 2. Stake in the Stability Pool (optional)

Bob can take the `agTOKEN` he just got in Step 1 and stake it in the Stability Pool to become a Stability Provider.

| Attribute     | Value                                                                          |
|---------------|--------------------------------------------------------------------------------|
| Deposits      | `agTOKEN` (from Step 1, not USDr directly)                                    |
| Receives      | `agaSP` (1:1, non-transferable)                                                |
| Yield         | Supply APY (kept via `agTOKEN` exposure) + liquidation bonus                   |
| Risk          | Absorbs liquidations for ~15 days while Settlement Vault redeems off-chain     |
| Withdrawal    | 30-min timelock + 2-day execution window                                       |

The Stability Pool takes **`agTOKEN`, not USDr**. That's deliberate: Bob keeps earning supply yield while staked, *and* is positioned to absorb liquidations for an additional bonus. If the Stability Pool accepted USDr directly, Bob would lose the supply APY.

## When Alice gets liquidated

If Alice's health factor falls below 1 and she doesn't cure within the 72-hour grace period:

1. **Collateral leaves Alice's vault.** Her RWA is held by the asset adapter (e.g. `AmFiAdapter`), not by the Lending Pool itself. The adapter transfers the RWA tokens directly to the Stability Pool. Her USDr debt is burned. She loses the collateral, but owes nothing.
2. **Bob's `agTOKEN` stays whole.** The Stability Pool immediately repays the Lending Pool's USDr by burning some of its own `agTOKEN`. Pure lenders (Step 1 only) are never impacted; their `agTOKEN` keeps appreciating as if nothing happened.
3. **Staked Bob absorbs, then recovers.** Bob's `agaSP` represents a claim on the Stability Pool's `agTOKEN` pool, which just shrank by the debt amount. For ~15 days the Stability Pool holds RWA tokens instead of `agTOKEN` while the Settlement Vault redeems them off-chain with the issuer.
4. **Settlement restores the peg.** When USDr returns from the redemption (~D+15 for AmFi), it's deposited back into the Lending Pool on the Stability Pool's behalf, which re-mints `agTOKEN` for the Stability Pool. The recovered value typically exceeds the debt; the surplus is the **liquidation bonus**, which flows pro-rata to `agaSP` holders (minus a slice routed to the Reserve Fund).

Net effect: pure lenders are protected in real time; staked lenders take a temporary balance-sheet exposure and earn the bonus as compensation.

### Expected Stability Pool yield

Two components:

1. **Supply APY** via `agTOKEN` appreciation, same as a pure lender.
2. **Liquidation bonus**, paid out when borrowers get liquidated and stakers share pro-rata in the seized collateral's recovery value beyond the debt absorbed.

Modelling:

```
Assume: 3% of outstanding loans liquidated per year,
        5% average liquidation bonus captured on those events,
        80% of that bonus net of fees reaches Stability Pool stakers.

Annual bonus to the Stability Pool, expressed as a fraction of the loan book:
  = 3% × 5% × 80%
  = 0.12% × loan_book per year
```

That bonus is split among Stability Pool stakers proportional to their stake. Define the pool's capitalization ratio:

```
k  =  SP_capital / loan_book
```

Per-staker yield boost is `0.12% / k`. Per-staker exposure during a single liquidation event also scales with `1 / k` (a thinner pool absorbs each event with thinner shoulders). The yield premium and the loss exposure move together; **the boost is compensation for concentration risk, not a free lunch**.

| `k` (Stability Pool / borrows) | Annual yield boost | Drawdown on a 1%-of-borrows liquidation |
|:------------------------------:|-------------------:|----------------------------------------:|
| 1.00 (parity)                  |          **0.12%** |                                  ~1.0%  |
| 0.30                           |          **0.40%** |                                  ~3.3%  |
| 0.10                           |          **1.20%** |                                  ~10%   |

The drawdown is temporary: the Settlement Vault refills the pool over the ~15-day redemption cycle, and the Reserve Fund covers any shortfall (so principal is generally protected, even if the on-chain `agaSP` value dips before settlement).

The base scenario (3% liquidation rate, 5% bonus) is conservative. RWA stress events can compress that further on the upside; long calm periods compress it on the downside. Headline: **Stability Pool yield ≈ lender APY + bonus_stream**, where the bonus stream scales with liquidation flow and the pool's capitalization choice.
