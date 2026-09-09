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

What the protocol does instead is bound it. Concentration caps limit exposure to any single pool, originator and jurisdiction, and those caps are enforced at contract level rather than by policy. Etherfuse allocations and idle reserves are fully on-chain and non-custodial, and the reserve floor, a minimum share of total assets held as idle USDC, is enforced by `allocate()` rather than by policy.

## Default handling

1. **Detection.** The backend flags a missed payment. The oracle receives a reduced NAV.
2. **NAV write-down.** The reported value of the book falls, and the sagUSD exchange rate falls with it. agUSD itself has no share price: it stays a claim on a dollar, and a write-down reaches holders through sagUSD.
3. **Loss distribution.** Socialized across all agUSD holders. There is no tranching in V1.
4. **Pool removal.** Admin delists the defaulting pool. Existing exposure runs off naturally.
5. **Recovery.** A partial repayment later writes NAV back up.
