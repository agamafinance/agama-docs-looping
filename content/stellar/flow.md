# End-to-End Flow

One pass through the protocol, from cash to a yield-bearing position and back out. Each step carries a tag saying whether it is live today or funded by the SCF grant.

<Diagram src="/images/stellar-architecture.svg" alt="Agama on Stellar. Entry rails (Stellar wallet, MoneyGram SEP-24, CCTP domain 27, Bridge) feed USDC into the Agama dApp and the Soroban contract core: Vault Contract, Allocation Engine, Oracle Adapter, agUSD and sagUSD. The Allocation Engine routes into Etherfuse Stablebonds and private credit pools under concentration caps and a minimum idle USDC reserve floor. Soroswap provides an exit without queueing." width="900" caption="The Agama architecture on Stellar: entry rails, the Soroban contract core, the on-chain guards enforced by allocate(), and the allocation targets behind them." />

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

`allocate()` on the [Allocation Engine](/stellar/contracts#allocation-engine) routes capital into a whitelisted pool through a pool adapter. Every pool adapter exposes `allocate`, `deallocate` and `get_exposure`, so the Engine stays pool-agnostic. The call reverts on a cap breach, or if it would push idle reserves below the reserve floor.

## 5. Earn

*(funded by this grant)*

The [Oracle Adapter](/security/oracle) validates NAV against per-feed staleness and deviation bounds, then `distribute_yield()` raises the sagUSD/agUSD exchange rate. No claim step, no rebase.

## 6. Out

*(funded by this grant: the production withdrawal queue)*

`unstake()`, then `request_withdrawal()` burns agUSD and enqueues a FIFO claim. `claim_withdrawal()` pays USDC once Ready.

Liquidity is drawn in order:

1. Idle reserves held above the on-chain reserve floor
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
