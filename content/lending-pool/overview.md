# Lending Pool: Overview

`AgamaLendingPool` is the core contract of the system. It manages deposits, withdrawals, borrowing, repayment, and liquidation, while delegating collateral-specific logic to Adapters.

## Purpose

- Hold the main USDr liquidity and mint `agTOKEN` receipts (ERC-4626).
- Abstract collateral through adapters so pool logic is asset-agnostic.
- Accrue interest using an index-based model (two-slope kink, Aave/Compound style).
- Enforce risk parameters (borrow cap, supply cap, LTV, liquidation threshold).
- Coordinate the three-stage liquidation lifecycle with the Stability Pool.

## What is `agTOKEN`?

`agTOKEN` is the **receipt** you get when you deposit USDr into the Lending Pool. It's a standard ERC-4626 yield-bearing token: your balance stays fixed, but its redeem value in USDr grows over time as borrowers pay interest.

**Example:** you deposit 1,000 USDr → you receive 1,000 `agTOKEN`. One year later, at 7.2% lender APY, your 1,000 `agTOKEN` are worth 1,072 USDr when you withdraw.

`agTOKEN` is a regular ERC-20 under the hood: transferable and composable across Rayls DeFi. Yield is delivered through a rising redeem rate (`liquidityIndex`), not through rebasing balances.

## Parameters

Two categories, both governance-controlled through the 48-hour timelock:

- **Risk parameters**: `supplyCap`, `borrowCap`, `MIN_BORROW_AMOUNT`, `liquidationGracePeriod`, `withdrawalsPaused`.
- **Fee parameters**: `depositFee`, `vaultOpeningFee`, `originationFee`, `reserveFactor`.

Per-adapter risk parameters (`MAX_LTV`, `LIQUIDATION_THRESHOLD`, `LIQUIDATION_BONUS`, `ORACLE_STALENESS_MAX`) live on the adapter itself.

## Collateral adapters

Adapters are pluggable contracts that expose a uniform interface ([`IAssetAdapter`](/docs/lending-pool/adapter-interface)) to the Lending Pool. A new adapter is whitelisted by governance via `registerAdapter(address)`. The Lending Pool never holds RWA tokens directly; the adapter is the custodian.

V1 ships with one adapter: `AmFiAdapter` (AmFi senior tranche ERC-20 tokens). Additional adapters can be added without redeploying the Lending Pool.

## Core mechanics

Five sub-flows:

### 1. Deposit & `agTOKEN` minting

User deposits USDr; optional `depositFee` is deducted; `agTOKEN` is minted 1:1 (after fee) to the user. The `agTOKEN` then appreciates as borrowers pay interest (through the `liquidityIndex`).

### 2. Vault position & collateral

Borrowers must call `openVaultPosition()` once (paying `vaultOpeningFee`, 0 in V1). They then use `depositAsset(adapter, data)` / `withdrawAsset(adapter, data)` to manage their collateral.

### 3. Borrowing

`borrow(adapter, data, amount)` mints `DebtToken` (non-transferable, scaled against the reserve's usage index) and transfers USDr to the borrower. Standard health-factor validation applies.

### 4. Repayment

`repay(adapter, data, amount)` burns `DebtToken` and pulls USDr back from the user. Residual dust below `MIN_BORROW_AMOUNT` is rejected.

!!! note

    V1 does **not** support `repayOnBehalf` (third-party repayment). Deferred to V2 for simpler access control in the initial audit.

### 5. Liquidation lifecycle

Three stages: `initiateLiquidation()` (flags the position, starts 72-hour grace), `closeLiquidation()` (borrower self-cure during grace), `finalizeLiquidation()` (SP-called, post-grace, moves collateral to SP). All three carry `onlyProxy`: callable only through `LiquidationProxy`.

## Liquidity buffer

!!! warning

    Agama V1 does **not** integrate with an external yield vault for idle USDr. V1 keeps USDr idle in the `agTOKEN` contract when not borrowed. The utilization-based rate model still ensures yield for lenders; an idle-yield layer may arrive in V2.

## Interactions

| Interacts with        | Purpose                                                      |
|-----------------------|--------------------------------------------------------------|
| `agTOKEN`             | Mint/burn receipts, transfer underlying USDr on borrow      |
| `DebtToken`           | Mint/burn scaled debt                                         |
| `IAssetAdapter`       | Delegate collateral logic                                     |
| `AgamaStabilityPool`  | Finalize liquidations                                         |
| `AgamaFeeCollector`   | Push fees on deposit/borrow/vault opening                     |
| `ReserveLibrary`      | Update indices, accrue interest                               |

Continue to [Functions](functions.md) for the complete reference.
