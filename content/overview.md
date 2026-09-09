# Overview

**A synthetic dollar backed by real-world private credit and bonds.**

Agama turns USDC into a yield-bearing position in curated real-world credit, without a fund subscription, a lock-up negotiation, or underwriting a single deal blind. Deposit USDC into the Vault, receive agUSD, stake it for sagUSD, and a Curator deploys the capital into vetted credit vaults under limits the contracts enforce.

## The problem

Private credit and bonds pay real yield, but that yield sits behind slow, manual, fund-style access: subscription paperwork, minimum tickets, and settlement cycles measured in weeks. On-chain capital has no fast way in, and no way to spread across several deals without doing that paperwork many times over.

The other half of the problem is the one that gets less attention. Once capital is pooled, somebody has to decide where it goes, and in most structures that decision is a policy document. Agama makes it a contract call that can be refused.

## Architecture in one picture

<Diagram src="/images/architecture.svg" alt="LPs deposit USDC into the Vault Contract, which mints agUSD 1:1 and runs a two-step FIFO withdrawal queue. agUSD stakes into sagUSD, a share-based position. The Allocation Engine releases idle USDC into credit vaults and Etherfuse Stablebonds only when allocate() passes four on-chain checks: a cap per pool, per originator and per jurisdiction, plus a reserve floor requiring a minimum share of net assets to stay in the Vault as free USDC. The Oracle Adapter feeds validated NAV back to the Vault." width="820" caption="USDC in, agUSD out, sagUSD for the yield, and an Allocation Engine that holds nothing and enforces the limits." />

## Components

The protocol has four parts.

1. **Credit vaults.** Six are live on Stellar Testnet, curated with [Qiro](https://www.qiro.fi/investor) and [Tenka](https://tenka.fi/), each an independent Soroban contract with its own share token. They are where deposited capital earns: short-term payment receivables, diversified credit funds, institutional lender financing, asset-backed senior and mezzanine tranches. See [Credit Vaults](/credit-vaults/overview).

2. **agUSD.** A synthetic dollar. The Vault mints it 1:1 against USDC and is the only address allowed to mint it. Burning is the holder's own: `burn` and `burn_from` are the standard SEP-41 paths, and the Vault uses that same path when it burns a withdrawer's agUSD. Supply can only go up through the Vault, and down through anyone holding the token. It is a plain SEP-41 token with no transfer restriction, so other Soroban protocols can hold it and compose with it. agUSD on its own earns nothing. See [agUSD](/agusd/overview).

3. **sagUSD.** Stake agUSD and receive sagUSD shares at the current exchange rate. Yield arrives by raising that rate, not by changing balances, so there is no claim step and no rebase. See [sagUSD](/sagusd/overview).

4. **The Allocation Engine.** The contract between the Vault and the credit vaults. In V1 a Curator directs it: a person chooses the pool and the amount and calls `allocate()`. What the Engine contributes is refusal. Every call is checked in the same transaction against a cap per pool, a cap per originator, a cap per jurisdiction, and a reserve floor, and any one of them failing reverts the whole call. All four are measured in basis points of net assets, and the floor is 2500 bps on testnet. The Vault holds its own copy of the floor and applies it again when it releases the cash, because the Engine is only an address the Vault authorizes. See [Soroban Contracts](/stellar/contracts#allocation-engine).

## What the contracts enforce, rather than the policy

Three properties are worth stating precisely, because each is a line of Rust rather than a commitment.

| Property | How it is enforced |
|---|---|
| No single pool, originator or jurisdiction takes the book | `allocate()` measures the resulting exposure against net assets and reverts on a breach |
| Fast-exit liquidity scales with the book | The reserve floor: an allocation reverts if the call would leave the Vault holding less free USDC than `floor_bps` of net assets, 2500 bps on testnet, checked by the Engine and again by the Vault |
| A queued withdrawal cannot be lent out | Queued claims are tracked on-chain and subtracted from free reserves and net assets before any limit is computed |
| A queue cannot be stalled | `settle_withdrawal()` is permissionless and pays the head claim to its recorded owner |
| The withdrawal queue cannot be reordered | Claims are paid strictly in request order, and there is no admin path around it |

An Engine that has been deployed but not configured cannot deploy capital at all: every cap starts at zero and the reserve floor starts at 10000 bps, which is 100%. Opening it up is an explicit admin action that emits an event.

## Where the yield comes from

The return is paid by real-world borrowers, private credit obligors and bond issuers, not by protocol emissions or by other depositors. Repayments settle off-chain through banking rails, come back on-chain as USDC, return to the Vault, and reach holders as a higher sagUSD exchange rate. That off-chain leg is the part of the system that carries the most trust, and it is documented in full in [Settlement & NAV](/security/settlement) and [Risks](/risks).

## Getting started

- **New here**: [How It Works](/how-it-works) walks the full path, from cash to a yield-bearing position and back out.
- **Looking at the credit side**: [Credit Vaults](/credit-vaults/overview).
- **Looking at the tokens**: [agUSD](/agusd/overview) and [sagUSD](/sagusd/overview).
- **Looking at the contracts**: [Soroban Contracts](/stellar/contracts) and [Deployments](/stellar/deployments).
