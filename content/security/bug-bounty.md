# Bug Bounty

!!! note

    Full program terms will be published on [Immunefi](https://immunefi.com/) at mainnet launch. This page is a preview.

## Scope

Target contracts (in scope):

- `AgamaLendingPool`
- `AgamaStabilityPool`
- `AgamaSettlementVault`
- `AgamaFeeCollector`
- `AgamaTreasury`
- `AgamaReserveFund`
- `AgamaKYCRegistry`
- `LiquidationProxy`
- All registered Adapters
- Tokens: `agTOKEN`, `DebtToken`, `agaSP`
- `TimelockController` (OZ-standard, limited scope)

Out of scope:

- UI, subgraph, off-chain keeper infrastructure (separate reports channel).
- Third-party oracles (report to AmFi / Nimofast).
- USDXP itself (report to XP Inc.).
- Rayls chain-level issues (report to Rayls).

## Severity tiers (tentative)

| Severity      | Impact                                              | Target reward           |
|---------------|-----------------------------------------------------|-------------------------|
| Critical      | Loss of any user funds > 1% of TVL, or loss of protocol control | Up to $500k (scales with TVL) |
| High          | Loss of funds < 1% of TVL, permanent griefing      | $50k – $150k            |
| Medium        | Temporary DoS, economic attack with mitigations    | $10k – $50k             |
| Low           | Gas griefing, minor accounting issues              | $1k – $10k              |

Rewards scale with TVL once protocol matures (10% of max reward at $1M TVL, 100% at $100M+).

## Eligibility & rules

- Responsible disclosure required (no public disclosure before fix).
- Duplicate reports paid to the first submitter only.
- Critical findings must include a runnable PoC.
- Must not have participated in audits (to avoid conflicts).

## Submission

At mainnet, bugs are submitted via Immunefi. Before then, responsible disclosures can be sent to `security@agama.fi` (or equivalent channel TBD).
