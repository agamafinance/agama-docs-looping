# Design Review

!!! note

    This page is a self-critical review of the Agama V1 spec. Each item identifies a weakness, articulates its impact, and proposes a concrete mitigation. Items marked **Recommended** should be integrated before audit freeze.

## Executive summary

| # | Theme                                      | Severity | Recommendation              |
|---|---------------------------------------------|----------|-----------------------------|
| 1 | IRM calibration vs RWA yield landscape      | Low      | Optional rebalance          |
| 2 | SP economics are thin                       | Medium   | Reserve factor reallocation |
| 3 | No per-borrower share cap                   | Medium   | Add cap                     |
| 4 | Oracle single point of failure              | High     | Secondary oracle **Recommended** |
| 5 | KYC operator centralization                 | Medium   | Multisig + rate limit **Recommended** |
| 6 | Pauser can't unpause alone                  | Low      | Document intentionally      |
| 7 | Withdrawal timelock race conditions         | Low      | Add analysis + test         |
| 8 | `MIN_BORROW_AMOUNT` too low                 | Medium   | Raise to 1000 USDXP **Recommended** |
| 9 | No time-based supply ramp                   | Low      | Linear ramp at launch       |
| 10 | No emergency withdraw path                  | Medium   | Break-glass after 30d paused |
| 11 | Treasury policy is opaque                   | Medium   | Written policy **Recommended** |
| 12 | No rate-limiting on sudden activity         | Low      | Max-daily-borrow parameter  |

---

## 1. IRM calibration { #irm-calibration }

**Issue**: V1 kink gives 10% borrow APY / 6.8% supply APY at 80% utilization. With AmFi senior at 16% yield, looping is still profitable but supply APY may not feel competitive against holding USDXP at Clear's rates.

**Analysis**:

| Scenario                     | At 80% util                |
|------------------------------|----------------------------|
| Current (2% base, 8% slope)  | Borrow 10.0%, Supply 6.80% |
| Alt A (1.5% base, 7% slope)  | Borrow 8.5%, Supply 5.78%  |
| Alt B (1% base, 6% slope)    | Borrow 7.0%, Supply 4.76%  |

- **Current**: steep enough to discourage 95%+ utilization, may still attract borrowers at modest LTV.
- **Alt A**: friendlier to borrowers, tightens lender yield.
- **Alt B**: aggressive for borrowers, supply APY may be too weak.

**Recommendation**: Keep current as V1 launch default. Monitor usage for 90 days post-mainnet. If utilization stays > 70% consistently, consider Alt A to relieve borrower pressure.

---

## 2. SP economics are thin { #sp-economics }

**Issue**: SP depositors earn supply APY (same as plain lenders) + share of liquidation bonuses. At 3% annual loss rate × 5% bonus × 80% efficiency ≈ 0.12% annual boost. That's a 30-min withdrawal timelock for a 12 bps premium — meaningful but thin.

**Impact**: SP may fail to attract enough deposits to be an effective backstop. If SP < 20% of total borrowed, many liquidations will trigger redistribution.

**Proposed mitigation**: reallocate a portion of `reserveFactor` directly to SP depositors. Example:

- Current: 100% of reserveFactor → FeeCollector (70% Treasury, 30% ReserveFund).
- Proposed: 50% of reserveFactor → FeeCollector (unchanged routing), 50% → SP (as additional `agTOKEN` minted directly to SP).

This doubles SP's effective supply APY from 6.8% → ~10.2% at optimal utilization.

**Trade-off**: slower ReserveFund accumulation. Acceptable if offset by Treasury seeding (see #12).

---

## 3. No per-borrower share cap { #max-borrower-share }

**Issue**: Nothing prevents a single borrower from taking 80%+ of pool liquidity. If they default catastrophically, SP cannot absorb.

**Proposed mitigation**: add `maxBorrowerSharePct` parameter. `borrow()` reverts if the new total debt of this borrower would exceed X% of total liquidity. V1 default: 20%.

**Trade-off**: institutional borrowers may want higher. Handled via per-address whitelist override.

---

## 4. Oracle single point of failure { #oracle-single-point-of-failure }

**Issue**: Each adapter depends on a single oracle from its issuer. If the oracle's signing key is compromised or the contract has a bug, prices can be manipulated.

**Proposed mitigation**: require every adapter to consult **two** price sources:

- **Primary**: issuer's oracle (as today).
- **Secondary**: one of:
  - A time-delayed copy of the primary (e.g., 1h-delayed, acts as a sanity check).
  - A NAV attestation from a second signing key at the issuer (hot/cold key separation).
  - An external data provider if one exists (Chainlink, Redstone).

Adapter rejects transactions if primary and secondary disagree by > 5%.

**Status**: **Recommended** before mainnet. Agree mechanics with AmFi and Nimofast.

---

## 5. KYC operator centralization { #kyc-operator-centralization }

**Issue**: A single EOA can mass-verify attacker addresses. While it cannot move funds, it can enable exploit addresses to interact with the protocol.

**Proposed mitigation** (combined):

1. **Rate limit on-chain**: `setVerified` reverts if more than N (e.g., 100) calls within a 24h window.
2. **Multisig**: move `KYC_OPERATOR_ROLE` to a 2-of-3 multisig.
3. **Mass invalidation helper**: `kycRegistry.invalidateSince(uint256 timestamp)` callable by governance resets all verifications newer than `timestamp`.

**Status**: **Recommended** before mainnet. Minimal implementation cost.

---

## 6. Pauser cannot unpause while owner compromised

**Issue**: Pauser multisig can pause but not unpause (current design). If owner is compromised during a pause event, protocol is stuck paused.

**Proposed mitigation**: give Pauser the authority to also unpause, **but only if `block.timestamp > pausedAt + 30 days`**. This is a break-glass to recover from double-compromise without giving Pauser full mode-switching authority.

**Decision**: low priority. Document intentional behavior. Consider for V2.

---

## 7. Withdrawal timelock race { #withdraw-timelock }

**Issue**: If Charlie queues a withdrawal, and a liquidation triggers against the SP during his 30-min window, does Charlie still get paid at pre-liquidation peg or post-liquidation (underwater) peg?

**Analysis**: `requestWithdraw` snapshots `balanceAtRequest` and `indexAtRequest`. Subsequent liquidations burn SP `agTOKEN` but don't touch these snapshots. The `withdraw` call honors the snapshot — meaning Charlie gets what was rightfully his at request time.

**Implication**: Charlie can front-run liquidations by requesting withdrawal early. This is actually desirable — it means depositors can't be involuntarily trapped.

**Action**: write explicit test proving this behavior. No change to design.

---

## 8. `MIN_BORROW_AMOUNT` too low { #min-borrow-too-low }

**Issue**: At 100 USDXP minimum, positions smaller than that can exist temporarily (via loops or repay paths). Liquidating a 100 USDXP position yields ~5 USDXP bonus, less than the off-chain redemption fixed cost (manager time, AmFi redemption fee). Economically unliquidatable.

**Proposed mitigation**: raise to **1000 USDXP** minimum, or tune per adapter (AmFi: 1k, Nimofast: 5k).

**Status**: **Recommended** before mainnet. Low implementation cost.

---

## 9. Time-based supply ramp

**Issue**: 10M USDXP cap at mainnet launch. Protocol has no operating history — dumping 10M of capacity on day 1 invites attention without the backstop being proven.

**Proposed mitigation**: linear ramp. `effectiveSupplyCap = min(supplyCap, launchCap + rampRate × (now − launchTimestamp))`. Example: start at 1M, +500k per week, reaching 10M at week 18.

**Decision**: ops call. Not implemented today — can be added governance-side by dynamically adjusting `supplyCap` each week without any contract change.

---

## 10. No emergency withdraw path { #emergency-withdraw }

**Issue**: If the protocol is paused due to an exploit, lenders are stuck. There is no worst-case "I accept some loss to exit now" path.

**Proposed mitigation**: `emergencyWithdraw()` callable only if:
- `pausedAt + 30 days < block.timestamp`, AND
- Governance has declared an irrecoverable event (`declareIrrecoverableEvent(reason)`).

Lenders can exit at a discount determined by `agTOKEN` total assets divided by total supply (so they bear the bad-debt share pro-rata).

**Decision**: design for V1, implement if audit load permits. Otherwise V2.

---

## 11. Treasury policy is opaque { #treasury-policy }

**Issue**: "Treasury" receives 70% of all fees but the doc doesn't specify what it funds. This is a governance transparency gap.

**Proposed mitigation**: written treasury policy integrated into [Treasury page](core/collectors/treasury.md#purpose-explicit-policy):

1. Fund ongoing operations (team, audits, infra).
2. Top up the ReserveFund if its coverage ratio drops below 2%.
3. Seed mainnet bootstrap liquidity incentives (one-time).

Any withdrawal outside these buckets requires a public governance post ≥ 48h before execution.

**Status**: **Recommended**. Integrated into current docs.

---

## 12. No rate-limiting on sudden activity

**Issue**: 50% of the pool getting borrowed in one block is suspicious. No automatic throttling.

**Proposed mitigation**: `maxDailyBorrowPct` parameter. Rolling 24h window of total borrows. `borrow()` reverts if new borrow would push past `totalLiquidity × maxDailyBorrowPct`. Default: 25% per day.

**Trade-off**: legitimate large borrowers (institutions) may be throttled. Acceptable — they can split over 2 days or coordinate with ops.

**Decision**: V2. Adds significant storage complexity for a risk that's primarily visible at very large TVL.

---

## USDXP model resolution { #usdxp-model }

The V1 handling of USDXP was originally flagged as an open question. Resolution:

**Decision**: Trust 1:1 with balance-delta accounting + off-chain Pauser monitoring.

See [Tokens → USDXP](core/tokens/usdxp.md) for the full reasoning and [Governance](core/governance.md) for the Pauser runbook.

Key points:
- USDXP is a regulated custodian stablecoin (XP Inc.), not an algorithmic one.
- Depeg risk is structurally very low.
- No USDXP oracle exists on Rayls yet.
- Balance-delta accounting defends against unknown transfer semantics.
- Storage slot reserved for V2 oracle integration.

---

## LiquidationSplit calibration { #liquidation-split }

V1 defaults: `treasuryBps = 200, burnBps = 300, redeemBps = 9500, inKindBps = 0`.

**Rationale** (from modeling):

- **Scenario A (clean liquidation)**: recovery of ~95% × oracle value × (1 − redeem fee) ≈ 94% of seized value. Sufficient to restore SP peg with small surplus to ReserveFund.
- **Scenario B (price kept dropping)**: recovery < 100% of debt absorbed → ReserveFund absorbs shortfall.
- **Scenario C (senior tranche default — tail event)**: LiquidationSplit does not save us; ReserveFund + redistribution kick in.

`inKindBps = 0` because V1 retail SP depositors are not AmFi QIs and cannot hold / redeem RWA tokens.

**Recalibration trigger**: after first 10 mainnet liquidations, review realized redemption fees and peg gap closure rates.
