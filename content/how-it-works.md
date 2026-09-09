# How It Works

One pass through the protocol, from cash to a yield-bearing position and back out, in seven steps. The same walkthrough written for developers, with the exact contract calls, is on [End-to-End Flow](/stellar/flow).

## 1. Getting USDC onto Stellar

Agama takes one asset: native Circle USDC on Stellar, not a wrapped or synthetic version of it. There are three ways to arrive with some.

| Route | What it is |
|---|---|
| Stellar wallet | USDC you already hold on Stellar |
| MoneyGram, through a SEP-24 anchor | Physical cash, at a counter, in 180+ countries |
| CCTP, at Stellar domain 27 | USDC bridged from Ethereum, Arbitrum or Base, burned on one side and minted on the other, with no third-party bridge holding it in between |

## 2. Depositing

You send USDC to the Vault contract and it mints you agUSD, one for one. The USDC stays in the Vault until the Allocation Engine instructs a release. The Vault is the protocol's only custodian: the Engine decides where capital goes but never holds any of it.

agUSD is a plain token with no transfer restriction. You can hold it, send it, trade it, or use it inside another Soroban protocol. What it does not do is earn. It is a claim on a dollar, not a share in the book.

## 3. Staking

Staking agUSD gives you sagUSD, and sagUSD is the position that earns. You receive shares at whatever the exchange rate is when you stake, and the number of shares you hold does not change afterwards.

This is the step people skip and then wonder where the yield went. Holding agUSD is holding a dollar. Holding sagUSD is holding a slice of the credit book.

## 4. Allocating

Deposited USDC does not deploy itself. A Curator decides where it goes, pool by pool, and submits that decision as a transaction to the Allocation Engine.

The Engine does not choose. It checks the call, in the same transaction, and reverts if any of these is true:

- the pool would hold more than its cap allows
- the pools fronted by that originator would together exceed the originator cap
- the pools under that legal regime would together exceed the jurisdiction cap
- the release would leave the Vault holding less free USDC than the reserve floor, which is a share of net assets plus everything ever written off rather than a fixed sum, and is 25% on testnet. Free rather than gross: USDC owed to a queued withdrawal is on the Vault's balance and is not deployable. The Vault checks the same floor itself when it releases the cash

Any one of those failing reverts the whole call, so a refused allocation moves no money and books no exposure. Capital that passes goes into a whitelisted pool through an adapter: a credit vault, or Etherfuse Stablebonds for Stellar-native government bond exposure.

## 5. Earning

Credit pays back on its own schedule. Etherfuse Stablebonds accrue on-chain and redeem instantly. Private credit repays off-chain, on originator terms that run from fifteen to ninety days, and that cash comes back through banking rails, converts to USDC, and returns to the Vault.

Before any of it moves the accounting, the Oracle Adapter checks the reported value against that feed's own limits: how old the number is allowed to be, and how far it is allowed to move since the last report. A feed that is too old does not quietly degrade, it errors. Once the value is validated, distributing the yield raises the sagUSD exchange rate.

That is the whole yield mechanism. Your sagUSD balance stays where it is and each share becomes redeemable for more agUSD. There is nothing to claim and nothing to compound manually.

## 6. Withdrawing

Exiting is deliberately less immediate than depositing, because the assets behind agUSD are credit positions that settle in weeks rather than in blocks. If you are staked, there are two waits, not one.

**Unstaking is itself two steps.** `request_unstake` burns your sagUSD shares straight away and prices them at the rate showing at that moment, which fixes what you are owed in agUSD. `claim` pays it out once the cooldown has elapsed, 60 seconds on testnet. Burning and pricing at request is what stops the cooldown being a free option: you cannot watch the rate for a minute and then decide.

**Then the Vault queue, also two steps.** Requesting a withdrawal burns the agUSD immediately and gives you a numbered claim, and burning up front is what makes the queue mean something, since a position waiting in line cannot also be sold or staked. Claiming pays the USDC, once that claim has reached the front of the line and the Vault holds enough to cover it.

The queue is strictly first in, first out. There is no priority tier, no fast lane, and no admin function that reorders it. It cannot be held up by the claim in front of you either: anyone may call `settle_withdrawal()`, which pays the head claim to the owner recorded on it and takes no argument that could redirect it, and a claim the USDC contract refuses to deliver, because the destination has no trustline or a frozen one, is stepped over and left owed rather than freezing the line. Liquidity reaches it in this order:

1. Free reserves the Vault holds above the reserve floor, which is 25% on testnet
2. New deposits
3. Etherfuse Stablebond redemption, instant and on-chain
4. Private credit repayment, fifteen to ninety days

So the wait depends on where the money currently is. With idle reserves available it is minutes. With reserves at the floor and Stablebonds to redeem it is still minutes. With everything deployed into private credit it is days to weeks. [Threat Model](/security/threat-model) sets out the safeguards and the expected wait per scenario.

## 7. Or leaving without queueing

The queue is not the only exit. agUSD trades against USDC on Soroswap, so anyone who wants out immediately can swap in a single transaction and take the market price instead of waiting for settlement.

That is also what keeps the peg honest in both directions. Above a dollar, mint at 1:1 from the Vault and sell. Below a dollar, buy on Soroswap and redeem through the queue.

## What is live today

agUSD, sagUSD and the six credit vaults are deployed on Stellar Testnet and verifiable on [Stellar Expert](/stellar/deployments). The Vault, the Allocation Engine and the Oracle Adapter are written and tested, and their testnet deployment is scheduled. [End-to-End Flow](/stellar/flow) marks each step of this walkthrough with its status.
