# Audit Status

This page tracks the security review of the Agama Soroban contracts. It is updated as the audit progresses, and the final report is published here.

## Current status

| | |
|---|---|
| Stage | Pre-audit. Contracts in development on testnet. |
| Auditor | OtterSec |
| Scope | Vault, agUSD (SEP-41), sagUSD staking, Allocation Engine and its pool adapters, Oracle Adapter |
| Report | Published on this page after remediation |
| Before the audit | Two adversarial reviews, run internally. Every Critical and High closed, tested and redeployed. |

OtterSec is one of the audit firms coordinating with the Stellar Development Foundation through the Soroban Audit Bank. Its Stellar track record includes Soroswap.

## Before the audit: two adversarial reviews

The contracts have not been audited. They have been attacked twice, deliberately, before any external auditor sees them, on the view that an audit is a poor place to discover the obvious problems. Both reviews were run in September 2026. Everything below is in the public repository, finding by finding, with the code that fixes it and the test that fails without it.

### The first review: nine findings

Nine findings, three Critical, two High and four Medium. All nine are closed.

The three Criticals were a bare NAV setter on sagUSD that let the staking admin reprice every share without moving the agUSD behind it; a Vault that delegated its own solvency check to whatever Allocation Engine it happened to point at; and a reserve floor that counted queued withdrawals as free liquidity, so the protocol treated money it already owed as money it could deploy. The two Highs were a single unclaimed withdrawal freezing the queue for everyone behind it, and a credit loss that could not be recognised on-chain at all.

Test count went from 100 to 125. Seven contracts changed, none of them upgradeable, so the entire stack was redeployed. The fixes were then proved against that live deployment with 58 assertions, each state change submitted as a real transaction.

### The second review: two Criticals, and one the first review created

The second review was pointed at the surface the first review had just added: the new permissionless settlement path, the new write-down, the four new accounting quantities that every cap and both floors now read, admin rotation across seven contracts, and the oracle's new band and rate limit.

It found two Criticals and nothing at High. Both were in code the first review had itself written, and one of them existed only because of a first-round fix.

That one is worth stating precisely, because it is the honest lesson of the exercise. The first review's fix for "a credit loss cannot be recognised" added a write-down that lowers recorded exposure with no cash moving. Its fix for the reserve floor had made that floor a share of net assets, and net assets include deployed capital. The two are individually correct and jointly a hole: every write-down handed back releasable headroom worth the floor's own percentage of itself. Allocate to the floor, write the position off, allocate to the new floor, repeat. On the test fixture, a floor that was supposed to hold 250 USDC ended up holding a single stroop, while the adapter still held 999.9999999 of the original 1000 USDC. The floor now measures against net assets plus cumulative recognised losses, a base that a write-down cannot lower.

The second Critical reopened a first-review finding by a different mechanism. Withdrawal payouts used a hard transfer, and the Vault's USDC is a Stellar Asset Contract over a classic asset, which refuses delivery to an account with no trustline, a frozen trustline, a limit below the amount, or no account at all. A refused delivery trapped the whole invocation, the FIFO head never advanced, and the queue froze permanently for everyone. Triggering it deliberately cost one dollar and two transactions. Payouts now defer an undeliverable claim, advance the head past it, keep its cash reserved against outstanding liabilities, and let its owner collect later out of order.

The second review also recorded six Medium and seven Low findings, none of them fixed at the time. Every Medium was closed in a third pass, which re-derived each one from the code rather than trusting the write-up: two of them turned out not to say quite what the summary said. Nothing was declined. Test count went from 125 to 130 and then to 149.

### The exploits were submitted, not simulated

Several findings were proved by attacking the superseded contracts, which are still live on the ledger. That makes them evidence about the chain rather than only about the source.

The write-down exploit, run against the superseded Vault and Allocation Engine:

| Step | Result | Transaction |
|---|---|---|
| Allocate everything the 25% floor releases | Idle reserves land exactly on the floor | [`fb2ce4a7`](https://stellar.expert/explorer/testnet/tx/fb2ce4a7d0dc1ea63faef7c5e3aa85775a4a7b3c20019fa9a7f2eb0b2d8020c8) |
| One stroop more | Refused, `ReserveFloorBreached` | Simulated, error code asserted |
| Write the whole position off, no cash moving | The adapter still holds every dollar | [`0a422d69`](https://stellar.expert/explorer/testnet/tx/0a422d6932b615d2a39a6f9593cbb8826a8ca2735c5b5c5029848e75a45f57c6) |
| The identical allocation that was just refused | Accepted. The Vault ends below the floor it promised | [`6820cec4`](https://stellar.expert/explorer/testnet/tx/6820cec478b6b518bf4bcd74f90378a4d5f9c095dfccd638c168013ee46802c7) |

The same sequence against the fixed contracts is refused with `ReserveFloorBreached`. The frozen-queue finding was proved the same way, with a claimant holding no USDC trustline: the undeliverable head claim is [deferred rather than fatal](https://stellar.expert/explorer/testnet/tx/b785c0b7b36a19a6381d0043cb624f4bbaf7d5c1f37dce96b4f4853d69d6fc46), and its owner [collects it out of head order](https://stellar.expert/explorer/testnet/tx/ca28d12b5c2bb23875e828770182737fe7578bbbc0cb9745bad82cdb8d560585) once the trustline exists.

Refusals are shown by simulation with the contract error code asserted, because the CLI will not submit a transaction whose simulation fails. That is sound for a refusal and not sound for authorization, so every authorization property is proved by a submitted transaction signed by the key under test.

### The reviews did not fix as they went

Findings were rated and written up before anything was repaired. The second review closed its two Criticals and deliberately left every Medium and Low unfixed, recorded for triage, so no severity was argued down once the cost of fixing it became apparent. The reserve-floor Critical is the case that justifies the discipline: it was rated Critical against a module comment that claimed the floor bounded the admin, and the review's conclusion was that the comment was false rather than that the finding was theoretical.

None of this is a substitute for the external audit. It is what the contracts look like going into one.

## Process

1. **Code freeze.** The codebase is frozen at the end of the testnet phase, after a sustained stress-testing campaign, and handed over for audit.
2. **Audit.** External review by OtterSec against the scope above.
3. **Remediation.** Every finding is either remediated or formally acknowledged with a documented rationale. There is no third category.
4. **Publication.** The final report and a remediation log are published on this page before mainnet contracts hold user funds.

## Open source

All Soroban contracts are public at [github.com/agamafinance/agama-soroban](https://github.com/agamafinance/agama-soroban) under Apache-2.0, with no private development phase. The Allocation Engine and Oracle Adapter are committed to the same public repository as they are written, not released after the fact.

The reviews are in the same place. Each one is a merged pull request carrying the full finding list, the severities, the exploit and the remediation: [the first review](https://github.com/agamafinance/agama-soroban/pull/9), [the second](https://github.com/agamafinance/agama-soroban/pull/10), and [the pass that closed its Mediums](https://github.com/agamafinance/agama-soroban/pull/11). Every superseded contract stays listed in [`deployments/testnet.json`](https://github.com/agamafinance/agama-soroban/blob/main/deployments/testnet.json) with the reason it was retired.

## Reporting a vulnerability

If you find a security issue, please do not open a public issue. Contact the team directly so it can be triaged and fixed before disclosure.

## Related

- [Threat Model](/security/threat-model): STRIDE analysis, access control, pausability.
- [Oracle Design](/security/oracle): feed trust models and failure modes.
- [Settlement & NAV](/security/settlement): the off-chain trust assumption stated in full.
- [Deployments](/stellar/deployments): the superseded contracts and what each review replaced.
