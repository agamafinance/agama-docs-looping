# Risks

Agama V1 is a lending protocol over off-chain-redeemable RWA collateral. The risk surface is wider than a pure crypto-collateral DeFi venue: any participant should read this page before depositing, borrowing, or staking. Risks are listed in approximate order of relevance for a typical V1 user.

## Smart contract risk

Every interaction is bounded by the correctness of the on-chain code. V1 covers:

- The `LendingPool`, `StabilityPool`, `SettlementVault`, `Treasury`, `ReserveFund`, `FeeCollector`.
- The `agYLD` and `sagYLD` ERC-20/-4626 share contracts.
- The `LiquidationProxy` and the `AmFiAdapter` for V1's only collateral type.

Mitigations:

- Multi-firm audit before mainnet (results published in the public audit report).
- Owner operations gated by a 48-hour governance timelock, with an additional 14-day delay on Reserve Fund outflows ([Reserve Fund → Double-timelock](/collectors/reserve-fund#double-timelock-on-outflows)).
- Pausable lending and Stability Pool entrypoints under `whenNotPaused`.

Residual risk: novel bugs not surfaced in audit. Users should size positions accordingly.

## Issuer / RWA settlement risk

V1's only collateral is the AmFi senior tranche, which is **redeemed off-chain with the issuer**. The Settlement Vault carries timing and counterparty risk during the redemption window:

- **Timing.** AmFi quotes D+15 on senior-tranche redemptions. Longer queues are possible during issuer stress; the Settlement Vault's escape hatch (`staleBatchPeriod = 60 days`) is the on-chain fallback.
- **Counterparty.** AmFi could refuse to redeem, fail to redeem, or redeem at a price below the on-chain mark. A material redemption shortfall draws down the Reserve Fund first; only what remains is socialized via `redistributeBadDebt`.
- **Recovery rate.** AmFi's published settlement history on senior tranches shows recovery >95% on the >15-day window. This is historical and not a guarantee.

Mitigations: the 15-day window is a structural property of V1 (see [Liquidations → Why the 15-day window is structural](/stability-pool/liquidations#why-the-15-day-window-is-structural)). The Reserve Fund and Stability Pool depth are the two on-chain buffers against issuer underperformance.

## Oracle risk

Collateral prices are sourced from per-adapter oracles (AmFi-published NAV in V1). Oracle compromise — stale data, manipulated feeds, or issuer-side reporting errors — translates directly into incorrect health factors and either premature or delayed liquidations.

Mitigations:

- Adapter-level staleness checks; positions revert rather than transact against stale data.
- USDr is treated as 1:1 with USDC by trust assumption (no on-chain USDr oracle on Rayls yet); see the [Introduction → V1 scope](/introduction#v1-scope) note.

Residual risk: an issuer-side NAV mark that diverges from realizable redemption value will materialize as a settlement shortfall, not a liquidation-time loss.

## Liquidity risk

Two distinct surfaces:

- **Borrower-facing.** Lending pool utilization can spike, raising borrow rates and forcing borrowers to repay or risk liquidation. This is normal lending-market behavior, not a bug.
- **Lender-facing.** Pure lenders can withdraw any time subject to pool utilization. If utilization is at 100%, withdrawal blocks until a borrow is repaid or new liquidity arrives.
- **SP-staker-facing.** The 30-minute timelock plus 2-day execution window introduces a deliberate friction on Stability Pool exits; this is the cost of MEV protection.

## Manager risk

V1 liquidations are **manager-gated**: only a designated `MANAGER_ROLE` (a 2-of-3 operational multisig) can call `liquidateBorrower` and `settleRedemption`. This trades keeper decentralization for simpler economics in V1.

Failure modes and on-chain mitigations:

- **Manager inactivity on a liquidatable position.** No on-chain remedy in V1; the position remains accruing debt until the manager acts.
- **Manager inactivity on a queued settlement batch.** After `staleBatchPeriod` (60 days), `sagYLD` holders can claim seized RWA in-kind via [`emergencyDistributeInKind`](/settlement-vault/overview#escape-hatch).
- **Manager-side mis-execution.** Settlement is balance-delta-checked: the Settlement Vault only credits the SP for USDr that actually arrived. Manager cannot fabricate inflows.

V2 plans a permissionless keeper network (Gelato or Chainlink Automation) to retire this risk vector.

## Stability Pool risk

The Stability Pool is the protocol's first-loss layer for liquidation absorption. Stakers explicitly carry pro-rata exposure to:

- **Settlement shortfall.** If redemption returns less USDr than the absorbed debt, the Reserve Fund covers first; remainder hits SP `sagYLD` holders pro-rata.
- **Bad-debt redistribution.** A loss large enough to deplete both the SP and the Reserve Fund triggers `redistributeBadDebt` across remaining active borrowers; this is a last-resort path and is not expected in normal operation.

The full pro-rata loss model is laid out in [Why participate? → The honest risk](/stability-pool/why-stake#the-honest-risk-pro-rata-loss-exposure).

## Regulatory risk

AmFi senior tranche tokens represent claims on Brazilian private credit. Regulatory action against AmFi, the underlying receivables, or the cross-border flow (USDC → ABRL on AmFi's platform) could:

- Pause new AmFi subscriptions or redemptions.
- Force AmFi to honor redemptions in BRL rather than USD-equivalent stablecoins.
- Trigger token freezes at the issuer level.

Mitigations: V1 is deliberately scoped to one issuer/asset class to make this risk legible. Future asset classes will be added through governance, with risk parameters re-calibrated per issuer.

## FX risk

Alice's collateral (AMFI senior tranche) is BRL-denominated; her debt is USD-denominated. USD/BRL FX moves directly affect her health factor:

- BRL weakening against USD shrinks the USD-equivalent value of her collateral and pushes her toward liquidation.
- BRL strengthening helps her position but is not a hedge against other risks.

This is a **structural** input to looping economics in V1 — see [How It Works → Alice's actual flow](/how-it-works#typical-loop) for the cross-currency exposure note. There is no on-chain FX hedge in V1; loopers carry the risk.

## Stablecoin / wrapping risk

V1's reserve stablecoin is USDr, the Rayls-native dollar stablecoin, 1:1 backed by USDC held in reserve. Risks:

- USDC depeg (Circle-side).
- USDr-USDC bridge depeg (Rayls-side).
- USDr issuance or redemption pause on Rayls.

USDr is treated as 1:1 with USDC by trust assumption in V1 because no on-chain USDr oracle exists on Rayls yet. A material USDr depeg would propagate through the entire protocol.

## Insurance not in V1

V1 does not offer a borrower insurance pathway (prepaid premium for grace-period extension or partial-loss coverage). This is a deliberate V1 scope cut:

- Smaller audit surface.
- Simpler liquidation logic.
- Cork Protocol (V2) will provide credit insurance at a higher layer.

If you need insurance-style protection on a position, V1 does not provide it; size accordingly.

## Summary

Agama V1 is intentionally narrow: one issuer, one asset class, one stablecoin, manager-gated liquidations, no insurance, off-chain redemption. Each narrowing reduces audit surface but concentrates risk on the remaining axes (issuer, manager, FX, oracle). A V1 user should be comfortable with all of them before depositing.
