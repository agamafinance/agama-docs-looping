# Audits

## Policy

Agama commissions **two independent audits** before mainnet, covering:

1. All Priority 1 (core) contracts.
2. The adapter pattern and both V1 adapters (AmFi, Nimofast).
3. The Settlement Vault and ReserveFund (Agama-specific).
4. Integration flows (end-to-end).

## Target firms

!!! note

    Final firm selection pending. Target candidates:

    - **Generalist**: OpenZeppelin, Trail of Bits, ChainSecurity.
    - **DeFi specialist**: Spearbit, Cantina, Zellic.

    Preference: one from each category for complementary coverage.

## Timeline

| Milestone              | Target date        |
|------------------------|--------------------|
| Code freeze for audit  | ~8 weeks pre-mainnet |
| Audit window           | 4–6 weeks          |
| Fix + re-audit         | 2–4 weeks          |
| Public report release  | At mainnet         |
| Mainnet launch         | Q4 2026            |

## Differential audit vs RAAC

!!! note

    Agama's core contracts are ported from RAAC's audited codebase. We commission a **differential audit** focusing on:

    - The deltas from RAAC (Settlement Vault, ReserveFund, KYC Registry, adapter implementations).
    - Integration seams between inherited and new code.
    - Rayls-specific assumptions (USDXP semantics, gas costs).

    This approach reduces audit hours while improving coverage on the novel parts.

## Post-audit commitments

- Full audit report published at `/security/audits/report` on this site.
- Bug fixes applied through standard upgrade flow (48h timelock).
- Non-blocking findings addressed in subsequent patches.
- Blocking findings delay mainnet.

## Continuous audit

Post-mainnet:

- **Bug bounty** program on Immunefi (see [Bug Bounty](bug-bounty.md)).
- **Continuous monitoring** via automated invariant checking on live chain state.
- **Annual re-audit** for any core contract changes.
