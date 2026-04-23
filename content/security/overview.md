# Security — Overview

Agama's security strategy rests on five pillars:

1. **Inheritance from RAAC**. Core primitives are ported from a production-audited money market. We do not invent our own index math, debt scaling, or SP design.
2. **Continuous invariant testing**. 12 critical invariants checked via Foundry invariant tests throughout development.
3. **External audits**. Two independent firms before mainnet.
4. **Bug bounty**. Immunefi program scaled to TVL.
5. **Transparent governance**. All parameter and upgrade changes route through a 48h timelock with events that any watcher can monitor.

## Coverage targets

| Category           | Target                                                       |
|--------------------|--------------------------------------------------------------|
| Unit tests         | ≥ 95% line + branch coverage on all external functions        |
| Fuzz tests         | Every state-mutating function with random inputs              |
| Invariant tests    | 12 invariants across 4 sequences, min 50k runs                |
| Fork tests         | Full flows on Rayls testnet against real issuer contracts     |
| Static analysis    | Slither + 4naly3er clean on every commit (CI gate)            |
| Formal verification| `ReserveLibrary.updateReserveState`, `finalizeLiquidation`, redistribution math |

## Sections

- [Invariants](invariants.md) — the 12 critical invariants.
- [Threat model](threat-model.md) — risks and mitigations.
- [Audits](audits.md) — audit firms and scope.
- [Bug bounty](bug-bounty.md) — Immunefi program.
- [Incident response](incident-response.md) — playbooks per class.
