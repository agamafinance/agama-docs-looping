# How It Works

Agama has two actors: **Alice** borrows, **Bob** lends. Bob can optionally stake his lender receipt in the Stability Pool to earn extra yield in exchange for absorbing liquidations.

## Alice — Borrower

| Attribute         | Value                                                 |
|-------------------|-------------------------------------------------------|
| Holds             | RWA tokens (e.g., AmFi senior tranche)                 |
| Deposits          | RWA tokens as collateral                               |
| Borrows           | USDXP                                                  |
| Goal              | Leverage her RWA position without selling              |
| Entry point       | `openVaultPosition()` → `depositAsset()` → `borrow()`  |

Alice holds tokenized private credit — specifically AmFi senior tranche in V1 — and uses Agama to unlock leverage on that position without selling it.

### Typical loop

Alice's leverage cap is not a protocol-enforced number; it's the mathematical limit implied by the LTV. AmFi V1's `MAX_LTV` is 70% — infinite loops at that ceiling converge to ~3.33× leverage. Practically Alice runs at 50% LTV for a healthier health-factor margin, which converges to 2× leverage.

```
Initial position: 1,000,000 AMFI_SENIOR (yield ~16% APY)

Loop 1: deposit 1M    → borrow 500k USDXP (50% LTV) → re-stake at AmFi → gain 500k AMFI
Loop 2: deposit 500k  → borrow 250k USDXP            → re-stake         → gain 250k AMFI
Loop 3: deposit 250k  → borrow 125k USDXP            → re-stake         → gain 125k AMFI

After 3 loops:  1.875M AMFI collateral,  0.875M USDXP debt
Net APY      =  16% × 1.875  −  10% × 0.875
             =  30%          −  8.75%
             =  21.25%
```

Infinite loops at 50% LTV converge to 2× / 1× (collateral / debt), capping net APY at 22%. See [Interest Rate Model → Looping viability](/docs/lending-pool/interest-rate-model#looping-viability) for the full table at 50% and 70% LTV.

## Bob — Lender

Bob is a crypto user seeking RWA-backed yield. He deposits USDXP into the Lending Pool and earns supply APY as borrowers pay interest.

Bob's flow has **two steps**. Step 1 is the baseline lender position; Step 2 is optional and layers on top.

### Step 1 — Lend (required)

| Attribute         | Value                                                 |
|-------------------|-------------------------------------------------------|
| Deposits          | USDXP (into the Lending Pool)                          |
| Receives          | `agTOKEN` (yield-bearing receipt, ERC-4626 / ERC-20)   |
| Yield             | Supply APY — `agTOKEN` appreciates as borrowers pay interest |
| Exit              | Anytime, subject to pool utilization                   |

Bob deposits USDXP, receives `agTOKEN`, done. `agTOKEN` is transferable and composable across Rayls DeFi. See [Lending Pool → What is agTOKEN](/docs/lending-pool/overview#what-is-agtoken) for the full mechanics.

### Step 2 — Stake in the Stability Pool (optional)

Bob can take the `agTOKEN` he just got in Step 1 and stake it in the Stability Pool to become a Stability Provider.

| Attribute         | Value                                                 |
|-------------------|-------------------------------------------------------|
| Deposits          | `agTOKEN` (from Step 1 — **not** USDXP directly)       |
| Receives          | `agaSP` (1:1, non-transferable)                        |
| Yield             | Supply APY (kept via `agTOKEN` exposure) + liquidation bonus |
| Risk              | Absorbs liquidations for ~15 days while Settlement Vault redeems off-chain |
| Withdrawal        | 30-min timelock + 2-day execution window               |

The SP takes **`agTOKEN`, not USDXP** — that's deliberate. Bob keeps earning supply yield during Step 2, while also being positioned to absorb liquidations for an additional bonus. If Step 2 accepted USDXP directly, Bob would lose the supply APY.

## When Alice gets liquidated

If Alice's health factor falls below 1 and she doesn't cure within the 72-hour grace period:

1. **Collateral moves to the SP, debt is wiped.** Alice's RWA tokens transfer to the Stability Pool. Her USDXP debt is burned. She loses the collateral, but owes nothing.
2. **Bob's `agTOKEN` stays whole.** The SP immediately repays the Lending Pool's USDXP by burning some of its own `agTOKEN`. Pure lenders (Step 1 only) are never impacted — their `agTOKEN` keeps appreciating.
3. **Staked Bob absorbs, then recovers.** Bob's `agaSP` represents a claim on the SP's `agTOKEN` pool, which just shrank by the debt amount. For the next ~15 days the SP holds RWA tokens instead of `agTOKEN` while the Settlement Vault redeems them off-chain with the issuer.
4. **Settlement restores the peg.** When USDXP returns from the redemption (~D+15 for AmFi), it's deposited back into the Lending Pool on the SP's behalf, which re-mints `agTOKEN` for the SP. The recovered value typically exceeds the debt — the surplus is the **liquidation bonus**, which flows pro-rata to `agaSP` holders (minus a slice to the Reserve Fund).

Net effect: pure lenders are protected in real time; staked lenders take a temporary balance-sheet exposure and earn the bonus as compensation.

### Expected SP yield

Two components:

1. **Supply APY** via `agTOKEN` appreciation — same as a pure lender.
2. **Liquidation gains** — when borrowers get liquidated, stakers share pro-rata in the seized collateral's recovery value beyond the debt absorbed.

Modelling:

```
Assume: 3% of outstanding loans liquidated per year,
        5% average liquidation bonus captured,
        80% of that bonus net of fees reaches SP depositors.

Annual bonus to SP, expressed as a fraction of the loan book:
  = 3% × 5% × 80%
  = 0.12% of total borrows per year

That bonus is shared among SP stakers, so per-staker yield boost depends on
SP capitalization relative to active borrows (k = SP_size / loans):

  Boost per SP staker = 0.12% / k

Example: SP holds 30% of active borrows  (k = 0.30) → boost ≈ 0.40% per year
         SP holds 10% of active borrows  (k = 0.10) → boost ≈ 1.20% per year

  SP APY ≈ lender APY  +  boost
         = 7.2% (at optimal utilization)  +  0.40% (k = 0.30)
         ≈ 7.6%
```

Two consequences worth noting:

- The boost grows as the SP shrinks relative to the loan book, but so does the per-staker exposure when a liquidation lands. Stakers should size their position with that trade-off in mind.
- The base scenario (3% liquidation rate, 5% bonus) is conservative. RWA stress events compress that further on the upside; long calm periods compress it on the downside. The headline is: SP yield ≈ lender APY + a small bonus stream proportional to liquidation flow.
