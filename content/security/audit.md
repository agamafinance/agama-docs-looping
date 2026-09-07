# Audit Status

This page tracks the security review of the Agama Soroban contracts. It is updated as the audit progresses, and the final report is published here.

## Current status

| | |
|---|---|
| Stage | Pre-audit. Contracts in development on testnet. |
| Auditor | OtterSec |
| Scope | Vault, agUSD (SEP-41), sagUSD staking, Allocation Engine and its pool adapters, Oracle Adapter |
| Report | Published on this page after remediation |

OtterSec is one of the audit firms coordinating with the Stellar Development Foundation through the Soroban Audit Bank. Its Stellar track record includes Soroswap.

## Process

1. **Code freeze.** The codebase is frozen at the end of the testnet phase, after a sustained stress-testing campaign, and handed over for audit.
2. **Audit.** External review by OtterSec against the scope above.
3. **Remediation.** Every finding is either remediated or formally acknowledged with a documented rationale. There is no third category.
4. **Publication.** The final report and a remediation log are published on this page before mainnet contracts hold user funds.

## Open source

All Soroban contracts are public at [github.com/agamafinance/agama-soroban](https://github.com/agamafinance/agama-soroban) under Apache-2.0, with no private development phase. The Allocation Engine and Oracle Adapter are committed to the same public repository as they are written, not released after the fact.

## Reporting a vulnerability

If you find a security issue, please do not open a public issue. Contact the team directly so it can be triaged and fixed before disclosure.

## Related

- [Threat Model](/security/threat-model): STRIDE analysis, access control, pausability.
- [Oracle Design](/security/oracle): feed trust models and failure modes.
- [Settlement & NAV](/security/settlement): the off-chain trust assumption stated in full.
