# Stability Pool: Overview

The `AgamaStabilityPool` is the protocol's liquidation backstop and the secondary yield venue for lenders. It is an **ERC-4626 vault** with `agYLD` as its underlying asset and `sagYLD` as its share token.

## What is `sagYLD`?

`sagYLD` is the **share** you receive when you stake `agYLD` in the Stability Pool. It is a vault share, not a 1:1 receipt. The share price (`totalAssets / totalSupply`) appreciates over time as the pool earns:

- **Supply APY** through the underlying `agYLD` (which itself accrues interest from borrowers).
- **Liquidation premiums**: when a borrower is liquidated, the SP burns `agYLD` to repay the debt and receives the seized collateral at a 3–8% discount. As that collateral is settled back into USDr by the SettlementVault and redeposited into the SP, `totalAssets()` grows and every `sagYLD` holder's share becomes redeemable for more `agYLD`.

The same mechanism runs in reverse if the pool absorbs bad debt: `totalAssets()` falls and every `sagYLD` holder takes a pro-rata loss. Risk and reward are symmetric.

`sagYLD` has 24 decimals (matching `agYLD`). It is a regular ERC-20 — transferable, but **transferring it during a pending unstake forfeits the queued portion** (see Cooldown below).

## Pool composition

Every participant in the Stability Pool holds `sagYLD` shares and is treated identically by the contract — including the Reserve Fund and the Treasury. There is no privileged tier, no sub-account, no external accounting layer.

| Participant            | Why they're here                                                          |
|------------------------|---------------------------------------------------------------------------|
| Retail stakers         | Earn supply APY + liquidation premiums pro-rata to their `sagYLD`.        |
| Reserve Fund           | Stakes its capital here as a **co-staker**: earns pro-rata, absorbs pro-rata, signals protocol confidence by sharing the same risk surface as retail. |
| Treasury (testnet)     | Stakes a portion of operational reserves to bootstrap pool depth before retail stakers ramp. Same pro-rata treatment as everyone else. |

### Worked example

Total `sagYLD` outstanding: **1,000,000**.

| Holder               | `sagYLD`    | Share  |
|----------------------|------------:|-------:|
| Reserve Fund         |   200,000   |  20%   |
| Treasury             |    50,000   |   5%   |
| Bob                  |    10,000   |   1%   |
| Charlie              |    50,000   |   5%   |
| Other stakers        |   690,000   |  69%   |
| **Total**            | **1,000,000** | **100%** |

A liquidation settles with **80,000 USDr of premium** redeposited into the pool. The premium is not paid out as a separate token; it lifts the `sagYLD` share price. Per holder:

| Holder               | Share  | Premium value at settlement |
|----------------------|-------:|----------------------------:|
| Reserve Fund         |  20%   |   16,000 USDr               |
| Treasury             |   5%   |    4,000 USDr               |
| Bob                  |   1%   |      800 USDr               |
| Charlie              |   5%   |    4,000 USDr               |
| Other stakers        |  69%   |   55,200 USDr               |

This is pure ERC-4626 mechanics: every holder sees their `sagYLD` redeemable for more `agYLD` after settlement, no claim transactions required.

For a deeper walk-through of the yield stack and the honest pro-rata risk story, see [Why participate?](why-stake.md).

## Why `agYLD`, not USDr

If the Stability Pool accepted USDr directly:

- Depositors would lose the supply APY they would otherwise earn by holding `agYLD`.
- The protocol would have two competing pools of USDr (main liquidity + the Stability Pool), complicating accounting and rate dynamics.
- Liquidity in the Lending Pool would shrink, hurting borrowers.

By accepting `agYLD`, depositors continue to earn supply yield through `agYLD` appreciation, while also standing ready to absorb liquidations for an additional premium.

!!! danger

    This is the **single most frequently misunderstood** aspect of the design. If you find yourself thinking "I should deposit USDr into the Stability Pool", re-read this section.

## Cooldown on unstake

Unstaking is a **two-step request-and-claim flow** with a **7-day cooldown** between them.

```text
T+0     requestUnstake(amount)   → shares get earmarked, no burn yet
T+7d    claim(requestId)         → shares burn, agYLD transferred to user
```

The cooldown is configurable on-chain (`cooldownDuration`, default 7 days, governance-tunable).

### Earmarked shares — important

When you call `requestUnstake(amount)`, your shares are **not burned**. They are **earmarked**: still held in your wallet, still counted in `sagYLD.totalSupply()`, **still absorbing liquidations**.

- `earmarkedShares(user)` returns the total amount currently sitting in pending requests for that user.
- The shares only burn at `claim` time, against the share price **at that future block**.

This means:

1. **You keep earning premiums during the cooldown**, because your shares are still in the SP.
2. **You also keep taking losses during the cooldown**, because your shares are still backstopping liquidations.
3. **If you transfer or withdraw your `sagYLD` before claim, the corresponding portion of the request is forfeited.** The earmark mechanism prevents you from double-spending the shares — once they're earmarked, they belong to the queue.

This is deliberate. A safety net you can walk out of in seconds isn't really a safety net. The 7-day lock is the price of having a Stability Pool that actually works during a stress event.

### Settlement extension

If a liquidation is mid-settlement when your cooldown would otherwise unlock, the unlock is automatically pushed out via `settlementExtensionUntil`. You can't escape mid-settlement — the SP needs your shares to absorb until the off-chain redemption clears.

In practice the extension is at most a few days. The view `getRequest(user, id)` returns `unlockAt` already adjusted for any active extension.

### Pending requests

A user can have multiple pending requests at once.

- `pendingCount(user)` — number of open requests.
- `getRequest(user, id)` — full request struct (amount, requestedAt, settlementExtensionUntil, claimed flag).

Each request is independent: one can be claimable while another is still locked.

## Same-block protection

`depositBlock[user]` is recorded on every deposit. Operations that would depend on the deposit (e.g. exiting in the same block) revert. Blocks flash-loan-assisted ephemeral deposits.

## Continue

- [Why participate?](why-stake.md): the yield stack and the honest pro-rata risk story.
- [Functions](functions.md): complete function reference.
- [Liquidations](liquidations.md): the three-stage lifecycle.
