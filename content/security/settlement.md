# Settlement & NAV Reconciliation

Private credit instruments settle off-chain. Repayments flow through traditional banking rails before conversion to USDC on Stellar. This is the structural bridge between real-world credit and on-chain accounting, and it is the part of the system that carries the most trust. This page states plainly how it works and what has to be trusted.

## Settlement flow

```
Originator (fiat repayment: principal + interest)
    → Settlement Account (off-chain bank, Agama entity or custodian)
        → Fiat to USDC conversion (via Bridge API or MoneyGram)
            → Settlement Manager (backend)
                → deallocate(pool_id, amount) on Allocation Engine
                    → USDC returns to Vault idle reserves
                        → Withdrawal queue processed (FIFO)
```

## Settlement timing

| Pool type | Settlement | Notes |
|---|---|---|
| Etherfuse Stablebonds | Instant | On-chain redemption |
| Private credit (invoice) | D+15 to D+30 | Originator payment terms |
| Private credit (venture) | D+30 to D+90 | Longer-dated instruments |

## NAV reconciliation

NAV is not self-reported by the originator straight to the chain. Every figure passes through a reconciliation step before it can move on-chain state.

```
Originator (servicing data)
    → Agama Backend (reconciliation + validation)
        → Reporter key calls push_nav(nav, timestamp)
            → Oracle Adapter validates:
                  caller is in the authorized reporter set
                  timestamp is later than the last update
                  deviation is within 5% of the previous NAV
                  if exceeded, emits nav_rejected
            → Vault Contract calls get_nav()
                  reverts with OracleStale if the feed is older than threshold
```

A deviation above the bound does not silently pass. It is rejected on-chain and requires explicit admin confirmation, which produces an event and a public record.

## Custody model

| Component | Custody | Controller |
|---|---|---|
| USDC idle in Vault | Soroban contract | Non-custodial |
| Etherfuse Stablebonds | Etherfuse pool adapter | Non-custodial |
| Private credit allocations | Off-chain, originator | Originator plus legal agreements |
| Settlement fiat | Off-chain bank account | Agama entity, custodial |

## Explicit trust assumption

Private credit allocations involve custodial, off-chain components. This exposure carries counterparty risk: default, settlement delay and FX risk. That is fundamental to private credit and cannot be eliminated on-chain.

What the protocol does instead is bound it. Concentration caps limit exposure to any single pool, originator and jurisdiction, and those caps are enforced at contract level rather than by policy. Etherfuse allocations and idle reserves are fully on-chain and non-custodial, and the reserve floor, a minimum share of net assets held as free USDC, is enforced by the Allocation Engine and again by the Vault itself when it releases the cash.

Free, not gross. A withdrawal request burns its agUSD immediately and leaves the USDC in the Vault until the claim is paid, so between those two moments the money is on the balance sheet and already owed to somebody. The floor and the caps subtract it before they measure anything, so capital the queue is owed cannot be deployed out from under it.

## Default handling

1. **Detection.** The backend flags a missed payment. The oracle receives a reduced NAV on the pool's feed, within that feed's deviation bound and rate limit.
2. **Write-down.** `write_down` on the Allocation Engine reduces the recorded exposure without requiring the cash back. It is admin-gated, it emits an event carrying a reason, and it moves three books in the same transaction so they cannot disagree: the Engine's exposure record, the adapter's own, and the Vault's deployed capital.
3. **Pool removal.** Admin delists the defaulting pool. Existing exposure runs off naturally.
4. **Recovery.** A partial repayment later is an ordinary deallocation against whatever exposure remains. There is no path that writes an exposure back up.

### Where the loss lands

A write-down makes the loss visible on-chain and stops the reserve ratio overstating the book. It does not distribute it, and nothing else in the contracts does either.

Be precise about this, because an earlier version of this page was not. It said the loss was "socialized across all agUSD holders" and that a write-down reaches holders through the sagUSD exchange rate. Neither is what the contracts do. agUSD is a synthetic dollar: a deposit mints exactly the amount deposited, a claim pays exactly the amount recorded on it, and NAV is read on neither path. The sagUSD exchange rate moves with the agUSD the staking contract actually holds, and a credit loss in the Vault does not reach into it.

What actually happens is that the withdrawal queue is paid strictly in order, so a shortfall lands on whoever is at the back of it when the cash runs out. That is a first-mover advantage and it is a run incentive, and it is written here rather than glossed.

**How losses should be allocated between agUSD and sagUSD holders is an open product decision.** sagUSD is the yield-bearing layer and takes the upside, so the symmetrical arrangement is for it to take the first loss. That is a tranching decision with legal and disclosure consequences and it has not been made. Putting a loss-socialisation scheme into a contract to make this page read better would be encoding an answer nobody has agreed to.
