# End-to-End Flow

One pass through the protocol, from cash to a yield-bearing position and back out.

## 1. In

A user brings USDC to Stellar three ways: directly from a Stellar wallet, from another chain over [CCTP](/stellar/integrations) at Stellar domain 27, or from physical cash through a MoneyGram SEP-24 anchor.

## 2. Deposit

The user calls `deposit()` on the Vault contract. The Vault takes the USDC and mints **agUSD** 1:1. agUSD is a plain SEP-41 token, transferable and composable, with no transfer restrictions.

## 3. Stake

The user calls `stake()` on the sagUSD contract and receives **sagUSD** shares at the current exchange rate. Holding agUSD alone earns nothing. sagUSD is the yield-bearing position.

## 4. Allocate

The Curator calls `allocate()` on the Allocation Engine, which routes vault capital into a whitelisted pool through an adapter. Every adapter exposes the same three functions, `allocate`, `deallocate` and `get_exposure`, so the Engine does not need to know what kind of pool it is talking to.

The call reverts if it would breach a concentration cap, or if it would push idle reserves below the on-chain reserve floor.

## 5. Earn

The pool generates yield. The Oracle Adapter validates the reported NAV against per-feed staleness and deviation bounds, then the yield distributor calls `distribute_yield()`, which raises the sagUSD/agUSD exchange rate.

No claim step and no rebase. The holder's position is simply worth more agUSD than it was.

## 6. Out

The user calls `unstake()` to return to agUSD, then `request_withdrawal()`, which burns the agUSD and enqueues a FIFO claim. When the claim is Ready, `claim_withdrawal()` pays USDC.

Liquidity is drawn in order:

1. Idle reserves held above the on-chain reserve floor
2. New deposits
3. Etherfuse Stablebond redemption, instant and on-chain
4. Private credit repayment, as it settles

## 7. Exit without queueing

A user who does not want to wait swaps agUSD for USDC on Soroswap instead, in a single Soroban transaction.

## What is live today

Steps 1, 2, 3 and the whole token layer are deployed on Stellar Testnet and verifiable on [Stellar Expert](/stellar/deployments).

Steps 4 and 5, the Allocation Engine, its adapters and the Oracle Adapter, plus the production withdrawal queue in step 6, are the modules currently under development.
