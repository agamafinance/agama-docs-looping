# Stability Pool: Overview

The `AgamaStabilityPool` is the protocol's liquidation backstop and the secondary yield venue for lenders. It accepts `agTOKEN` (not USDC) and issues `agaSP` 1:1.

## What is `agaSP`?

`agaSP` is the **receipt** you get when you stake `agTOKEN` in the Stability Pool. Strict 1:1 with the `agTOKEN` you deposit. **Soulbound (non-transferable)**: it represents your personal claim on the Stability Pool and isn't tradable.

Because `agaSP` is backed by `agTOKEN`, you keep earning the supply APY while you're staked. On top, you receive a pro-rata share of liquidation bonuses when borrowers get liquidated.

There is no internal exchange-rate math: the Stability Pool doesn't rebase or scale balances. Your `agaSP` value moves only because the underlying `agTOKEN` appreciates (and momentarily dips during a liquidation event before settlement restores the peg).

## Why `agTOKEN`, not USDC

If the Stability Pool accepted USDC directly:

- Depositors would lose the supply APY they would otherwise earn by holding `agTOKEN`.
- The protocol would have two competing pools of USDC (main liquidity + the Stability Pool), complicating accounting and rate dynamics.
- Liquidity in the Lending Pool would shrink, hurting borrowers.

By accepting `agTOKEN`, depositors continue to earn supply yield through `agTOKEN` appreciation, while also standing ready to absorb liquidations for an additional bonus.

!!! danger

    This is the **single most frequently misunderstood** aspect of the design. If you find yourself thinking "I should deposit USDC into the Stability Pool", re-read this section.

## Role of managers

Liquidations are not incentivized to third parties. Only a designated `MANAGER_ROLE` (a 2-of-3 operational multisig) can trigger `liquidateBorrower()`. The manager runs an off-chain keeper that monitors health factors, trading keeper decentralization for simpler economics in V1.

!!! warning

    **Design Review**: Manager-gated liquidations avoid MEV griefing but centralize keeper infrastructure. We plan a permissionless keeper network in V2 (Gelato/Chainlink Automation).

## Timelock on withdrawals

Withdrawals require a two-step flow:

1. `requestWithdraw(amount)` starts a 30-minute timer.
2. `withdraw(amount)` must execute within 2 days of timer expiry.

This prevents race conditions around liquidations and blocks MEV-style sandwich attacks on large Stability Pool exits.

## Same-block protection

`depositBlock[user]` is recorded on every deposit. `withdraw()` reverts if called in the same block. Blocks flash-loan-assisted ephemeral deposits.

## Continue

- [Functions](functions.md): complete function reference.
- [Liquidations](liquidations.md): the three-stage lifecycle.
