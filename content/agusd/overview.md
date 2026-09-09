# agUSD Overview

agUSD is Agama's synthetic dollar. The [Vault](/stellar/contracts#vault-contract) mints it 1:1 against USDC on deposit and is the only address permitted to mint it. Holders face no such restriction: agUSD is a plain [SEP-41](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md) token that anyone can transfer, approve or hold in another contract.

Burning is not restricted to the Vault. `burn` and `burn_from` are the standard SEP-41 holder-authorized paths, so any holder can burn their own agUSD and a spender can burn against an allowance. The Vault's `request_withdrawal` uses that same path, calling `burn` on the withdrawer inside a transaction the withdrawer has already signed, rather than a privilege of its own.

That asymmetry is deliberate and it is the right way round for a redeemable dollar. Supply can only go up through the Vault, which is what makes every unit in circulation something the Vault is accountable for. Supply can go down through anyone, because burning agUSD destroys a claim rather than creating one, so a holder-authorized burn cannot cost anybody else anything.

## Mint and redeem

| Action | Effect |
|---|---|
| **Deposit** | Send USDC to the Vault, receive agUSD 1:1 |
| **Request withdrawal** | agUSD is burned immediately, you receive a numbered claim |
| **Claim withdrawal** | Once the claim reaches the front of the queue and the Vault holds the cash, you receive USDC |

Depositing is instant. Redemption is two steps, because the assets backing agUSD are credit positions that settle in fifteen to ninety days. A vault promising instant redemption against that book would be promising something it can only honour while nobody asks.

The agUSD is burned when the withdrawal is requested, not when it is claimed. That is what makes the queue meaningful: once the tokens are gone the holder cannot sell, stake or re-request the same position while it waits, and the supply already reflects the exit. Claims are paid in strict request order, with no priority path, including for the admin. There is a minimum withdrawal of 1 agUSD, so a stream of dust requests cannot push real withdrawals behind thousands of one-stroop claims.

## agUSD does not earn

A withdrawal returns one USDC per agUSD burned. The redemption rate does not move with the portfolio: NAV from the [Oracle Adapter](/security/oracle) is read for reporting and monitoring, not applied to the rate at which agUSD redeems.

That is deliberate. agUSD is a unit of account, not a share in the book, which is what keeps it usable as collateral and as a quote asset in the protocols it composes into. Yield reaches holders through [sagUSD](/sagusd/overview), whose exchange rate rises as the book earns. Holding agUSD and expecting it to appreciate is the one misunderstanding worth avoiding here.

## What agUSD is for

- **A composable dollar.** No transfer restriction and no whitelist, so any Soroban protocol can accept it.
- **The step before yield.** Stake it for [sagUSD](/sagusd/overview) to hold the earning position.
- **An exit that does not queue.** agUSD trades against USDC on Soroswap, so a holder who wants out immediately can swap at the market price instead of waiting for settlement. The same pool is what arbitrages the peg: mint at 1:1 and sell when agUSD is above a dollar, buy and redeem when it is below.

## What backs it

Every agUSD is backed by the Vault's assets: idle USDC plus everything the [Allocation Engine](/stellar/contracts#allocation-engine) has deployed into credit vaults and Etherfuse Stablebonds. The Engine cannot deploy that backing freely. Each allocation is checked on-chain against a cap per pool, per originator and per jurisdiction, and against the reserve floor that keeps fast-exit liquidity in the Vault. The floor is a share of total assets rather than a fixed sum, 2500 bps on testnet, so the cash held back against redemptions scales with the size of the book it is held against.

See [Credit Vaults](/credit-vaults/overview) for what the capital is deployed into, [Overview](/overview) for how agUSD fits the wider architecture, and [Risks](/risks) for what can go wrong.
