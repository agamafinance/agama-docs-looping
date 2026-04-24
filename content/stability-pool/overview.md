# Stability Pool — Overview

The `AgamaStabilityPool` is the protocol's liquidation backstop and the secondary yield venue for lenders. It accepts `agTOKEN` (not USDXP) and issues `agaSP` 1:1.

## Why `agTOKEN`, not USDXP

If the Stability Pool accepted USDXP directly:

- Depositors would lose the supply APY they would otherwise earn by holding `agTOKEN`.
- The protocol would have two competing pools of USDXP (main liquidity + SP), complicating accounting and rate dynamics.
- Liquidity in the Lending Pool would shrink, hurting borrowers.

By accepting `agTOKEN`, depositors continue to earn supply yield through `agTOKEN` appreciation, while also standing ready to absorb liquidations for an additional bonus.

!!! danger

    This is the **single most frequently misunderstood** aspect of the design. If you find yourself thinking "Charlie should deposit USDXP", re-read this section.

## 1:1 peg

`agaSP` is always minted and burned 1:1 against `agTOKEN` at transaction time. Value appreciates because the underlying `agTOKEN` appreciates — there is no internal exchange rate math in the SP. This simplifies accounting and auditing versus Liquity-style rebasing pools.

## Role of managers

Liquidations are not incentivized to third parties. Only a designated `MANAGER_ROLE` (a 2-of-3 operational multisig) can trigger `liquidateBorrower()`. The manager runs an off-chain keeper that monitors health factors, trading keeper decentralization for simpler economics in V1.

!!! warning

    **Design Review**: Manager-gated liquidations avoid MEV griefing but centralize keeper infrastructure. We plan a permissionless keeper network in V2 (Gelato/Chainlink Automation).

## Timelock on withdrawals

Withdrawals require a two-step flow:

1. `requestWithdraw(amount)` — starts a 30-minute timer.
2. `withdraw(amount)` — must execute within 2 days of timer expiry.

This prevents race conditions around liquidations and blocks MEV-style sandwich attacks on large SP exits.

## Same-block protection

`depositBlock[user]` is recorded on every deposit. `withdraw()` reverts if called in the same block. Blocks flash-loan-assisted ephemeral deposits.

## Continue

- [Functions](functions.md) — complete function reference.
- [Liquidations](liquidations.md) — the three-stage lifecycle.
