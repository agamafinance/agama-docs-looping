# Lending Pool: Overview

`AgamaLendingPool` is the core contract of the system. It manages deposits, withdrawals, borrowing, repayment, and liquidation, while delegating collateral-specific logic to per-tranche adapters.

## Purpose

- Hold the main USDr liquidity and mint `agYLD` receipts (ERC-4626).
- Abstract collateral through adapters so pool logic is asset-agnostic.
- Accrue interest using an index-based model (two-slope kink, Aave/Compound style).
- Enforce risk parameters per market (LTV, liquidation threshold, oracle staleness) and at the pool level (borrow cap, supply cap).
- Coordinate single-step atomic liquidations with the Stability Pool.

## What is `agYLD`?

`agYLD` is the **receipt** you get when you deposit USDr into the Lending Pool. It's a standard ERC-4626 yield-bearing token: your balance stays fixed, but its redeem value in USDr grows over time as borrowers pay interest.

**Example:** you deposit 1,000 USDr → you receive a stack of `agYLD` worth 1,000 USDr. One year later, at 8% lender APY, the same `agYLD` is worth 1,080 USDr when you withdraw. No claim, no rebase.

`agYLD` has 24 decimals (18 underlying + 6 ERC-4626 offset). It is transferable and composable across Rayls DeFi. Yield is delivered through a rising redeem rate (`liquidityIndex`), not through rebasing balances.

## Parameters

Two categories, both governance-controlled through the 48-hour timelock:

- **Pool-wide parameters**: `supplyCap`, `borrowCap`, `MIN_BORROW_AMOUNT`, `withdrawalsPaused`, IRM curve.
- **Fee parameters**: `vaultOpeningFee` (default 0), `originationFeeBps` (default 0), `reserveFactorBps` (default 1000 = 10%).

There is no on-chain liquidation grace period — V1 liquidations are atomic. There is also no deposit fee on the lender side; lenders mint `agYLD` 1:1 to the underlying USDr at the current share price.

**Per-adapter risk parameters** (`MAX_LTV`, `LIQUIDATION_THRESHOLD`, `LIQUIDATION_BONUS`, `ORACLE_STALENESS_MAX`) live on the adapter itself — one set per market.

## Per-market risk parameters

Each tranche ships with its own risk profile. Senior and Junior markets are calibrated differently because they sit at different points of the credit waterfall:

| Tranche | Max LTV | Liquidation threshold | Liquidation bonus | Target APR |
|---|---:|---:|---:|---:|
| **Senior** (sRESOLV / sDIGCAP / sCONDO) | 75% | 85% | 3% | 12% |
| **Junior** (jRESOLV / jDIGCAP / jCONDO) | 50% | 65% | 8% | 24% |

`ORACLE_STALENESS_MAX` is **7 days** across all current adapters: any read or write that depends on the oracle reverts with `OracleStale()` if the oracle hasn't been updated within the window. The threshold is per-adapter and tunable by governance.

## Per-market debt isolation

The `DebtToken` tracks borrower debt scoped to `(user, adapter)`. Two consequences worth highlighting:

- A borrower's debt on jCONDO is **completely independent** of their debt on sRESOLV. Health factors, liquidations, and repayment schedules are evaluated per market.
- The aggregate `DebtToken.totalSupply()` (no args) drives the pool-wide utilisation that the IRM uses to set the borrow APR. So markets share a single rate even though they have isolated debt.

```text
DebtToken.balanceOf(user, adapter) → debt on this market
DebtToken.balanceOf(user)          → debt across all markets the user touches
DebtToken.totalSupply(adapter)     → outstanding debt on this market
DebtToken.totalSupply()            → outstanding debt protocol-wide
```

## Collateral adapters

Adapters are pluggable contracts that expose a uniform interface ([`IAssetAdapter`](/lending-pool/adapter-interface)) to the Lending Pool. A new adapter is whitelisted by governance via `registerAdapter(address)`. The Lending Pool never holds RWA tokens directly; the adapter is the custodian.

The protocol currently ships with **6 active adapters**, all instances of `AmFiAdapter` parameterised for Senior or Junior of three issuer pools (Resolvi, Digcap, Sector Condo). Additional adapters — different issuers, different risk profiles, even different asset classes — can be added without redeploying the Lending Pool.

## Core mechanics

Five sub-flows:

### 1. Deposit & `agYLD` minting

User deposits USDr; `agYLD` is minted at the current share price (1:1 only on the very first deposit). No deposit fee in V1. The `agYLD` then appreciates as borrowers pay interest, through the rising `liquidityIndex`.

### 2. Vault position & collateral

Borrowers must call `openVaultPosition()` once (paying `vaultOpeningFee`, currently 0). They then use `depositAsset(adapter, data)` / `withdrawAsset(adapter, data)` to manage their collateral on a specific market. Collateral lives at the adapter, not at the pool.

### 3. Borrowing

`borrow(adapter, data, amount)` mints `DebtToken` scoped to `(user, adapter)`, indexed against the reserve's `usageIndex`, and transfers USDr to the borrower. Health-factor validation runs against that one market's collateral and that one market's debt.

### 4. Repayment

`repay(adapter, data, amount)` burns scoped `DebtToken` and pulls USDr back from the user. Residual dust below `MIN_BORROW_AMOUNT` is rejected. Repaying on one market doesn't affect the borrower's debt on any other market.

### 5. Liquidation

Single atomic `liquidate(adapter, user, data)` call when HF < 1 on a given market. No on-chain grace period: the seizure happens in one transaction, scoped to the (user, adapter) pair. Gated by `LIQUIDATION_PROXY_ROLE` — held by the `LiquidationProxy` and by the Stability Pool — and the proxy itself is manager-gated in V1. See [Stability Pool → Liquidations](/stability-pool/liquidations) for the end-to-end flow.

## Liquidity buffer

!!! note

    Idle USDr sits inside the `agYLD` contract and is not currently routed to an external yield vault. The utilisation-driven IRM already compensates lenders during low utilisation; an idle-yield layer can be added without changing the pool's external surface.

## Interactions

| Interacts with        | Purpose                                                      |
|-----------------------|--------------------------------------------------------------|
| `agYLD`               | Mint/burn receipts, transfer underlying USDr on borrow       |
| `DebtToken`           | Mint/burn scoped debt per (user, adapter)                    |
| `IAssetAdapter`       | Delegate collateral logic per market                         |
| `AgamaStabilityPool`  | Finalise liquidations                                        |
| `AgamaFeeCollector`   | Push fees on deposit/borrow/vault opening                    |
| `ReserveLibrary`      | Update indices, accrue interest                              |

Continue to [Functions](functions.md) for the complete reference.
