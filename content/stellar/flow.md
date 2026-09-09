# End-to-End Flow

One pass through the protocol, from cash to a yield-bearing position and back out. Each step carries a tag saying whether it is live today or funded by the SCF grant.

<Diagram src="/images/stellar-architecture.svg" alt="Agama on Stellar. Entry rails (Stellar wallet, MoneyGram SEP-24, CCTP domain 27, Bridge) feed USDC into the Agama dApp and the Soroban contract core: Vault Contract, Allocation Engine, Oracle Adapter, agUSD and sagUSD. The Allocation Engine routes into Etherfuse Stablebonds and private credit pools under concentration caps and a reserve floor requiring a minimum share of net assets to stay in the Vault as free USDC. Soroswap provides an exit without queueing." width="900" caption="The Agama architecture on Stellar: entry rails, the Soroban contract core, the on-chain guards enforced by allocate(), and the allocation targets behind them." />

## 1. In

*(funded by this grant: CCTP bridge and SEP-24 anchor integration)*

USDC reaches Stellar from a Stellar wallet, from another chain over [CCTP](/stellar/integrations) at Stellar domain 27, or from physical cash through a MoneyGram SEP-24 anchor.

## 2. Deposit

*(agUSD is live today, the Vault contract is funded by this grant)*

`deposit()` on the Vault takes the USDC and mints agUSD 1:1, a plain SEP-41 token with no transfer restrictions.

## 3. Stake

*(live today)*

`stake()` returns sagUSD shares at the current exchange rate. agUSD alone earns nothing; sagUSD is the yield-bearing position.

## 4. Allocate

*(funded by this grant)*

`allocate()` on the [Allocation Engine](/stellar/contracts#allocation-engine) routes capital into a whitelisted pool through a pool adapter. Every pool adapter exposes `allocate`, `deallocate`, `write_down`, `recover_surplus`, `get_exposure`, `engine` and `vault`, so the Engine stays pool-agnostic. The call reverts on a cap breach, measured on what a pool holds plus what has been written off against it and not recovered, or if it would leave free reserves below `reserve_floor_bps()` of `floor_base()`, which is net assets plus the same write-offs. All four limits are basis points, and the floor is 2500 bps on testnet. The Vault applies the floor again on its own numbers when it releases, so the limit does not depend on the Engine being the contract it claims to be.

## 5. Earn

*(funded by this grant)*

The [Oracle Adapter](/security/oracle) validates NAV against per-feed staleness and deviation bounds, then `distribute_yield()` raises the sagUSD/agUSD exchange rate. No claim step, no rebase.

## 6. Out

*(funded by this grant: the production withdrawal queue)*

Two queues, in order.

`request_unstake()` burns the sagUSD shares and prices them at the current rate, then `claim()` pays the agUSD out once `cooldown()` has elapsed, 60 seconds on testnet. There is no single `unstake()` call: pricing at request rather than at claim is what stops the cooldown being a free option on the exchange rate.

Then `request_withdrawal()` burns the agUSD and enqueues a FIFO claim, and `claim_withdrawal()` pays USDC once that claim is Ready. `settle_withdrawal()` lets anyone pay the head claim to its recorded owner, and a claim the USDC contract refuses to deliver is deferred and stepped over rather than freezing the queue. `claim_status()` reports which of Pending, Ready or Claimed a claim is in, computed from the queue position and the Vault's idle reserves rather than stored.

Liquidity is drawn in order:

1. Free reserves held above the on-chain reserve floor, 2500 bps of net assets on testnet
2. New deposits
3. Etherfuse Stablebond redemption, instant and on-chain
4. Private credit repayment, D+15 to D+90

See [Threat Model](/security/threat-model) for the queue safeguards and expected wait per scenario.

## 7. Or exit without queueing

*(funded by this grant: Soroswap Router integration)*

Swap agUSD for USDC on Soroswap in a single Soroban transaction.

## What is live and what the grant builds

Live on Stellar Testnet today and verifiable on [Stellar Expert](/stellar/deployments): agUSD, sagUSD and the six credit vault contracts curated with Qiro and Tenka. Everything else in this flow is what the grant builds.

The two modules SCF named are both in step 4: the Allocation Engine and its pool adapters, Etherfuse and private credit. Step 5 is the Oracle Adapter, a separate module that values those positions.
