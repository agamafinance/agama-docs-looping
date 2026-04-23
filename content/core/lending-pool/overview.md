# Lending Pool — Overview

`AgamaLendingPool` is the core contract of the system. It manages deposits, withdrawals, borrowing, repayment, and liquidation, while delegating collateral-specific logic to Adapters.

## Purpose

- Hold the main USDXP liquidity and mint `agTOKEN` receipts (ERC-4626).
- Abstract collateral through adapters so pool logic is asset-agnostic.
- Accrue interest using an index-based model (two-slope kink, Aave/Compound/RAAC style).
- Enforce risk parameters (borrow cap, supply cap, LTV, liquidation threshold).
- Coordinate the three-stage liquidation lifecycle with the Stability Pool.

## Parameters

Two categories, both governance-controlled through the 48-hour timelock:

- **Risk parameters**: `supplyCap`, `borrowCap`, `MIN_BORROW_AMOUNT`, `liquidationGracePeriod`, `withdrawalsPaused`.
- **Fee parameters**: `depositFee`, `vaultOpeningFee`, `originationFee`, `reserveFactor`.

Per-adapter risk parameters (`MAX_LTV`, `LIQUIDATION_THRESHOLD`, `LIQUIDATION_BONUS`, `ORACLE_STALENESS_MAX`) live on the adapter itself. See [Parameters](../../parameters.md).

## Collateral adapters

Adapters are pluggable contracts that expose a uniform interface ([`IAssetAdapter`](../../core/adapters/interface.md)) to the Lending Pool. A new adapter is whitelisted by governance via `registerAdapter(address)`. The Lending Pool never holds RWA tokens directly; the adapter is the custodian.

V1 supported adapters:

- [`AmFiAdapter`](../../core/adapters/amfi.md) — AmFi senior tranche ERC-20 tokens.
- [`NimofastAdapter`](../../core/adapters/nimofast.md) — Nimofast receivables tokens.

Additional adapters can be added without redeploying the Lending Pool.

## Core mechanics

Five sub-flows:

### 1. Deposit & `agTOKEN` minting

User deposits USDXP; optional `depositFee` is deducted; `agTOKEN` is minted 1:1 (after fee) to the user. The `agTOKEN` then appreciates as borrowers pay interest (through the `liquidityIndex`).

### 2. Vault position & collateral

Borrowers must call `openVaultPosition()` once (paying `vaultOpeningFee`, 0 in V1). They then use `depositAsset(adapter, data)` / `withdrawAsset(adapter, data)` to manage their collateral.

### 3. Borrowing

`borrow(adapter, data, amount)` mints `DebtToken` (non-transferable, scaled against the reserve's usage index) and transfers USDXP to the borrower. Standard health-factor validation applies.

### 4. Repayment

`repay(adapter, data, amount)` burns `DebtToken` and pulls USDXP back from the user. Residual dust below `MIN_BORROW_AMOUNT` is rejected.

!!! note

    V1 does **not** support `repayOnBehalf` (third-party repayment). This is a RAAC feature deferred to V2 for simpler access control in the initial audit.

### 5. Liquidation lifecycle

Three stages: `initiateLiquidation()` (flags the position, starts 72-hour grace), `closeLiquidation()` (borrower self-cure during grace), `finalizeLiquidation()` (SP-called, post-grace, moves collateral to SP). All three carry `onlyProxy` — callable only through `LiquidationProxy`.

## Liquidity buffer

!!! warning

    Unlike RAAC, Agama V1 does **not** integrate with an external yield vault (RAAC uses Curve's scrvUSD for idle yield on the pool's USDXP). V1 keeps USDXP idle in the `agTOKEN` contract when not borrowed. The utilization-based rate model still ensures yield for lenders; a Curve-equivalent idle-yield layer may arrive in V2.

## Interactions

| Interacts with        | Purpose                                                      |
|-----------------------|--------------------------------------------------------------|
| `agTOKEN`             | Mint/burn receipts, transfer underlying USDXP on borrow      |
| `DebtToken`           | Mint/burn scaled debt                                         |
| `IAssetAdapter`       | Delegate collateral logic                                     |
| `AgamaStabilityPool`  | Finalize liquidations                                         |
| `AgamaKYCRegistry`    | Gate lender/SP operations                                     |
| `AgamaFeeCollector`   | Push fees on deposit/borrow/vault opening                     |
| `ReserveLibrary`      | Update indices, accrue interest                               |

Continue to [Functions](functions.md) for the complete reference.
