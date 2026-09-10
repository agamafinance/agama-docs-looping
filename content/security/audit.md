# Audit Status

This page tracks the security review of the Agama Soroban contracts. It is updated as the audit progresses, and the final report is published here.

## Current status

| | |
|---|---|
| Stage | Pre-audit. Contracts in development on testnet. |
| Auditor | OtterSec |
| Scope | Vault, agUSD (SEP-41), sagUSD staking, Allocation Engine and its pool adapters, Oracle Adapter |
| Report | Published on this page after remediation |
| Before the audit | Three adversarial reviews, run internally. Every Critical and High closed, tested and redeployed. |

OtterSec is one of the audit firms coordinating with the Stellar Development Foundation through the Soroban Audit Bank. Its Stellar track record includes Soroswap.

## Before the audit: three adversarial reviews

The contracts have not been audited. They have been attacked three times, deliberately, before any external auditor sees them, on the view that an audit is a poor place to discover the obvious problems. All three reviews were run in September 2026. Everything below is in the public repository, finding by finding, with the code that fixes it and the test that fails without it.

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

### The third review: nothing Critical, one High

The third review was pointed at the surface the second round's fixes had added: the concentration caps' new numerator, the recovery path that brings written-off capital home, an unauthenticated call for extending a claim record's lifetime, and the constructor that replaced `initialize` on all seven contracts.

It found nothing at Critical. The claim the second round rested on, that what a write-down cannot buy a recovery cannot buy back, was re-derived from the source rather than re-read, and it holds for a stronger reason than the one originally given: the base the reserve floor is a share of can be lowered only by the two calls that book returning cash, both of which are bounded by the balance the Vault cannot already account for, and every unit of that cash had raised the base by the same amount when it arrived. The order of allocations, write-downs and recoveries does not matter, and neither does where the recovered cash came from.

The one High was not in the new surface at all. `register_pool` proves that a pool adapter names this Engine and this Engine's Vault, and that check ran once, at registration. Half of the condition is a fact about the Engine, and `set_vault` can change it: the pool registry is a map with no way to remove an entry, so the moment the Vault pointer moved, every adapter already registered went on naming the Vault the Engine had just stopped governing. The next allocation released the new Vault's USDC to an adapter that repays the old one, which in this protocol is a superseded Vault where nothing can move USDC at all, and the position could not be unwound either, because the repayment path sends the cash to the old Vault and then asks the new one to confirm it arrived. `allocate`, `deallocate` and `recover` now re-run the check. Every other edge of that wiring was checked on both sides; this was the one checked once.

Only the Allocation Engine changed, so only the Allocation Engine was redeployed. The Vault and both pool adapters were repointed in place through their own setters. Test count went from 149 to 150.

The three Mediums it recorded were left for triage, and the first of them has since been closed. A pool adapter's surplus sweep can be taken by the adapter's own admin as well as by the Engine, which is how an adapter stuck to superseded counterparties is unstuck without a working Engine. Taken that way the cash reaches the Vault and no book moves, and that turns out to be terminal rather than conservative: the surplus is now zero, so the Engine's `recover` is refused by the adapter on the way in, and the Vault call it was going to make has no other caller. The write-down it was going to release then sits in the reserve floor's base for the life of the Vault and on the pool's concentration charge for the life of the Engine. `book_recovery` is that booking on its own, bounded by the balance the Vault holds and cannot account for, the same test every other call into that book already passes.

The second Medium was refused rather than fixed, and the reason is the more useful half. It said an originator repaying the Vault directly leaves the adapter with nothing to transfer, so the repayment path panics and the position reports face value forever. Re-derived from the source, the premise does not hold: USDC leaves an adapter through exactly two calls, one that lowers the booked exposure by precisely what it sends and one that sends only what is above the exposure, and nothing pays an adapter's balance out to an originator at all. An adapter therefore never holds less than it has booked. Adding an entry point onto the Vault's deployed book for a state the code cannot reach would have been attack surface bought with nothing, so what was added instead is a test that asserts the invariant after every call in a sequence that moves it, and fails the day this contract set grows a disbursement path. Test count went from 150 to 155.

### The exploits were submitted, not simulated

Several findings were proved by attacking the superseded contracts, which are still live on the ledger. That makes them evidence about the chain rather than only about the source.

The write-down exploit, run against the superseded Vault and Allocation Engine:

| Step | Result | Transaction |
|---|---|---|
| Allocate everything the 25% floor releases | Idle reserves land exactly on the floor | [`fb2ce4a7`](https://stellar.expert/explorer/testnet/tx/fb2ce4a7d0dc1ea63faef7c5e3aa85775a4a7b3c20019fa9a7f2eb0b2d8020c8) |
| One stroop more | Refused, `ReserveFloorBreached` | Simulated, error code asserted |
| Write the whole position off, no cash moving | The adapter still holds every dollar | [`0a422d69`](https://stellar.expert/explorer/testnet/tx/0a422d6932b615d2a39a6f9593cbb8826a8ca2735c5b5c5029848e75a45f57c6) |
| The identical allocation that was just refused | Accepted. The Vault ends below the floor it promised | [`6820cec4`](https://stellar.expert/explorer/testnet/tx/6820cec478b6b518bf4bcd74f90378a4d5f9c095dfccd638c168013ee46802c7) |

The third review's finding was proved the same way, against an Engine built from the commit before its fix: with the Engine following its Vault to a new generation and the registered adapter left behind, [the allocation went through](https://stellar.expert/explorer/testnet/tx/7583fb3123a6010183220bf903e1321611dae86e33d02df8c114d15042b6402e) and the money landed at an adapter that repays somebody else. The fixed Engine refuses the identical call with `AdapterMismatch`, and [accepts it](https://stellar.expert/explorer/testnet/tx/2a417f6e727bd73f1228c9a3366cb282a55be71288a68df433e43d110705fcac) once the adapter is brought across, so it is a check rather than a wall.

The same sequence against the fixed contracts is refused with `ReserveFloorBreached`. The frozen-queue finding was proved the same way, with a claimant holding no USDC trustline: the undeliverable head claim is [deferred rather than fatal](https://stellar.expert/explorer/testnet/tx/b785c0b7b36a19a6381d0043cb624f4bbaf7d5c1f37dce96b4f4853d69d6fc46), and its owner [collects it out of head order](https://stellar.expert/explorer/testnet/tx/ca28d12b5c2bb23875e828770182737fe7578bbbc0cb9745bad82cdb8d560585) once the trustline exists.

Refusals are shown by simulation with the contract error code asserted, because the CLI will not submit a transaction whose simulation fails. That is sound for a refusal and not sound for authorization, so every authorization property is proved by a submitted transaction signed by the key under test.

### The reviews did not fix as they went

Findings were rated and written up before anything was repaired. The second and third reviews closed everything at Critical and High and deliberately left every Medium and Low unfixed, recorded for triage, so no severity was argued down once the cost of fixing it became apparent. The third wrote its complete findings list, severities included, before a line of the contracts was changed, for the same reason. The reserve-floor Critical is the case that justifies the discipline: it was rated Critical against a module comment that claimed the floor bounded the admin, and the review's conclusion was that the comment was false rather than that the finding was theoretical.

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
