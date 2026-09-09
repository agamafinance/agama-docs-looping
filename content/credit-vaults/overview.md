# Credit Vaults

Credit vaults are where deposited USDC goes to work. Each one funds a specific real-world credit strategy, and each is an independent Soroban contract with its own share token, so exposure to it is a position the protocol holds and anyone can read on-chain.

## The six live vaults

Six credit vaults are deployed on Stellar Testnet, curated with [Qiro](https://www.qiro.fi/investor) and [Tenka](https://tenka.fi/).

| Vault | Curator | Strategy | Share token |
|---|---|---|---|
| Payment Financing | Qiro | Short-term payment receivables | qPAY |
| Private Credit | Qiro | Diversified credit fund | qPCV |
| Institutional Credit | Qiro | Institutional lender financing | qICV |
| Flagship | Tenka | ABF senior | tFLAG |
| High Yield | Tenka | ABF mezzanine | tHY |
| Deal Vaults | Tenka | Deal-by-deal | tDEAL |

Contract addresses for all six are on [Deployments](/stellar/deployments) and verifiable on Stellar Expert.

Two different things are called curation here, and it is worth separating them. Qiro and Tenka curate the strategies: they source the credit and run the vaults. Curator with a capital C is a protocol role, held by the admin multi-sig in V1, which whitelists a pool in the Allocation Engine and sets the risk parameters that bound it. See [Threat Model](/security/threat-model) for the full role table.

## How capital reaches a vault

There is no direct deposit into a credit vault. Users deposit USDC into the [Vault contract](/stellar/contracts#vault-contract) and receive agUSD; capital reaches the credit vaults only through the [Allocation Engine](/stellar/contracts#allocation-engine), in two admin-gated steps.

1. **Registration.** `register_pool()` whitelists a pool along with the metadata the caps aggregate over: its originator, its jurisdiction, and its own cap. A pool that is not registered cannot receive capital at all. It also has to name the Engine registering it and that Engine's Vault, and being registered once does not settle that: the Engine's own Vault pointer can move afterwards, so the check is repeated on every call that moves the pool's capital.
2. **Allocation.** `allocate()` releases USDC from the Vault into the pool, and only if the resulting book still respects the cap on that pool, the cap on everything that originator fronts, the cap on that jurisdiction, and the reserve floor, a minimum share of net assets plus recognised losses that stays in the Vault as free USDC. Any one of them failing reverts the whole call, and the Vault applies the floor again on its own numbers when it releases the cash.

Both steps emit events, so the composition of the book and every change to it are reconstructable from the chain.

## The adapter model

The Engine does not know what kind of pool it is talking to. Every pool is reached through an adapter exposing the same three functions, `allocate`, `deallocate` and `get_exposure`, which is what lets an off-chain credit facility and a tokenized government bond sit behind the same code path.

Two adapters are in scope.

| Adapter | Underlying | Settlement | Oracle |
|---|---|---|---|
| Private credit | Off-chain originator | D+15 to D+90 | Custom reporter, 7 day staleness, 5% deviation bound |
| Etherfuse | Stablebond contracts | Instant, on-chain | Etherfuse feed, 48 hour staleness, deterministic |

The six vaults above are private credit, so they sit behind the private credit adapter. Etherfuse Stablebonds are the second target: Stellar-native tokens backed by government bonds, lower yield, redeemable on-chain in a single transaction, which is what makes them useful to the withdrawal queue as well as to the book.

These pool adapters are not the same thing as the Oracle Adapter. A pool adapter moves capital into a pool. The [Oracle Adapter](/security/oracle) values the resulting positions and never touches funds.

## Settlement and repayment

Etherfuse redeems on-chain and instantly. Private credit does not: the originator repays in fiat on its own terms, the cash moves through banking rails, converts to USDC, and comes back on-chain, at which point `deallocate()` reduces the recorded exposure and the USDC lands back in the Vault's idle reserves. Invoice-style instruments run D+15 to D+30, longer-dated ones D+30 to D+90.

That off-chain leg is the protocol's core trust assumption and it is stated in full on [Settlement & NAV](/security/settlement).

## What isolation does and does not mean

Each vault is a separate contract with separate accounting, and a problem in one does not corrupt the state of another. It does not follow that a loss in one vault is contained to a subset of holders. Agama does not tranche its own positions in V1, and it has no loss-socialisation mechanism either: a credit loss is recognised on-chain by a write-down and then lands on whoever is at the back of the withdrawal queue when the cash runs out, whatever vault it came from. How it should be shared is an open product decision. See [Risks](/risks).

What limits the damage is the concentration caps, and they are contract-level rather than policy-level. The per-pool cap stops any single vault from taking the book. The per-originator cap catches the case where several vaults are fronted by the same counterparty and would otherwise add up to concentrated risk without any single cap being breached. The per-jurisdiction cap stops the book from being one legal regime deep. All three are measured against net assets, so allocating in small pieces does not get around them.

If a pool does default, the admin delists it and the existing exposure runs off naturally rather than being force-unwound.

## Where the yield comes from

Real-world borrowers pay it: private credit obligors and bond issuers. There is no protocol emission subsidizing the return and no depositor paying another depositor. Repayments return to the Vault, and reach holders as a higher [sagUSD](/sagusd/overview) exchange rate.

See [Risks](/risks) for what can go wrong on the real-world side.
