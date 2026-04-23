# Architecture

## System diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                             USER LAYER                                │
│                                                                       │
│   ALICE (borrower)            BOB (lender)            CHARLIE (SP)    │
│   QI via issuer               KYC Light               KYC Light        │
│   Locks RWA                   Deposits USDXP          Deposits agTOKEN│
│   Loops positions             Earns supply yield      Absorbs liquid. │
└─────────┬───────────────────────────┬───────────────────────┬─────────┘
          │                           │                       │
          ▼                           ▼                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    AgamaKYCRegistry                                   │
│      Consulted on all lender/SP entry points.                         │
│      Borrower entry points defer KYC to issuer via adapter.           │
└──────────────────────────────────────────────────────────────────────┘
          │                           │                       │
          ▼                           ▼                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       AGAMA LENDING POOL                              │
│                                                                       │
│   Reserve state: liquidityIndex, usageIndex (RAY precision)           │
│                                                                       │
│   deposit / withdraw ────────────────► agTOKEN (ERC-4626)             │
│   openVaultPosition ──► depositAsset / withdrawAsset  ┐               │
│                                                       │               │
│   borrow / repay ────────────────────► DebtToken      │               │
│                                                       │               │
│   initiate / close / finalize Liquidation (onlyProxy) │               │
└────────────────────┬──────────────────────────────────┼──────────────┘
                     │                                  │
                     │ (delegate collateral ops)        │
                     │                                  │
                     ▼                                  ▼
┌──────────────────────────────────────┐   ┌────────────────────────────┐
│            ADAPTER LAYER             │   │    LiquidationProxy        │
│   AmFiAdapter     NimofastAdapter    │   │   Delegated liquidation    │
│   - AmFi oracle   - Nimo oracle      │   │   routing (onlyProxy mod)   │
│   - QI whitelist  - QI whitelist     │   └────────────────────────────┘
│   - Custody       - Custody          │
└──────────────────────────────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      AGAMA STABILITY POOL                             │
│                                                                       │
│   agTOKEN deposits, agaSP 1:1 share token                             │
│   30-min withdraw timelock + 2-day execution window                   │
│   liquidateBorrower (managers only, via LiquidationProxy)             │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ seized RWA
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  AGAMA SETTLEMENT VAULT                               │
│                                                                       │
│   handleSeizure(adapter, data, seized, pegGap, minSharesOut)          │
│        ├─ T bps → Treasury                                             │
│        ├─ B bps → ReserveFund                                          │
│        ├─ R bps → redemption queue (off-chain issuer redeem)          │
│        └─ K bps → in-kind distribution (V1 = 0)                        │
│                                                                       │
│   settleRedemption(batchId, usdxpReceived)                             │
│        └─ auto-deposit to LendingPool on SP's behalf → peg restored   │
│                                                                       │
│   emergencyDistributeInKind (escape hatch after 60 days)               │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ (if shortfall > ReserveFund)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BAD-DEBT REDISTRIBUTION                           │
│                                                                       │
│   Liquity-style O(1) technique. L_Debt / L_Collateral accumulators.   │
│   Remaining debt + collateral redistributed pro-rata to other borrows │
│   weighted by collateral size.                                         │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│         FEE COLLECTOR · TREASURY · RESERVE FUND                       │
│                                                                       │
│   FeeCollector: pull-based, per-feeType splits (70/30 V1).            │
│   Treasury: whitelisted tokens, MANAGER_ROLE withdrawals.              │
│   ReserveFund: bad-debt buffer, double-timelocked outflows (48h + 14d).│
└──────────────────────────────────────────────────────────────────────┘
```

## Data flow — happy path

### Bob deposits 100k USDXP

```
Bob → LendingPool.deposit(100_000e18)
    1. kycRegistry.isVerified(Bob) ✓
    2. reserve.updateState() — accrue interest since last op
    3. USDXP.safeTransferFrom(Bob, agTOKEN, 100k)
    4. agTOKEN.mint(Bob, 100k)
    5. emit Deposit(Bob, 100k, 100k)
```

### Alice borrows 500k USDXP against 1M AmFi

```
Alice → LendingPool.openVaultPosition()   (one-time, pays 0 in V1)

Alice → LendingPool.depositAsset(amfiAdapter, abi.encode(1_000_000e18))
    1. amfiAdapter.deposit(Alice, data):
       - amfiWhitelist.isQualifiedInvestor(Alice) ✓
       - amfiOracle.lastUpdate() within 48h ✓
       - amfiToken.safeTransferFrom(Alice, adapter, 1M)
       - userCollateral[Alice] += 1M

Alice → LendingPool.borrow(amfiAdapter, data, 500_000e18)
    1. validateBorrow: collateralValue × 70% >= 500k ✓
    2. DebtToken.mint(Alice, 500k)
    3. agTOKEN.transferUnderlying(Alice, 500k − originationFee)
    4. reserve.updateInterestRates(0, 500k) — utilization rises
```

### Charlie stakes in Stability Pool

```
Charlie → LendingPool.deposit(100k)            → agTOKEN minted
Charlie → agTOKEN.approve(SP, 100k)
Charlie → StabilityPool.deposit(100k)
    1. kycRegistry.isVerified(Charlie) ✓
    2. lendingPool.updateState()
    3. agTOKEN.safeTransferFrom(Charlie, SP, 100k)
    4. agaSP.mint(Charlie, 100k)                — strict 1:1
    5. depositBlock[Charlie] = block.number     — same-block guard
```

## Data flow — liquidation

```
t=0     Manager keeper detects HF(Alice, amfiAdapter) < 1
t=0     LiquidationProxy.initiateLiquidation(amfiAdapter, Alice, data)
        → position.isUnderLiquidation = true, startTime = t=0
        → Grace period 72h begins

t=0..72h  Alice can repay fully → closeLiquidation(...) clears flags.
        V1 has no insurance path.

t=72h+1   Manager → SP.liquidateBorrower(amfiAdapter, settlementAdapter, Alice, data, minSharesOut)
        → SP.liquidateBorrower:
            → LendingPool.finalizeLiquidation → collateral → SP, debt burned
            → SP withdraws scaledDebt via LendingPool.withdraw → pays rToken
            → SP transfers seized RWA → SettlementVault.handleSeizure
        → SettlementVault applies LiquidationSplit (200/300/9500/0 bps)

t=15d    Manager completes off-chain AmFi redemption
        → SettlementVault.settleRedemption(batchId, usdxpReceived)
        → deposits min(usdxpReceived, pegGap) to LendingPool on SP's behalf
        → SP's agTOKEN balance restored → peg recovered
        → excess → ReserveFund
```

## Critical invariants

The full list is on [Security → Invariants](../security/invariants.md). The most important:

- **SP peg (steady state)**: `agTOKEN.balanceOf(SP) == agaSP.totalSupply()`. Violated only during active liquidation settlement window.
- **Monotonic indices**: `liquidityIndex` and `usageIndex` never decrease (except on explicit bad-debt write-down).
- **Debt consistency**: `Σ(scaledDebt(user, adapter, data)) == DebtToken.totalSupply()` in scaled terms.
- **Solvency with in-flight settlement**: `agTOKEN(SP) + pendingRedemptions + ReserveFund >= agaSP.totalSupply() × liquidityIndex / RAY`.

## Upgradability

All core contracts are OpenZeppelin UUPS proxies. All upgrades and parameter changes route through a 48-hour `TimelockController`. The ReserveFund has an additional 14-day delay on withdrawals, making even a compromised multisig unable to drain the buffer quickly.

!!! warning

    There is no DAO token and no on-chain voting in V1. Governance is multisig + timelock. We document signers, policies, and emergency procedures in [Governance](../core/governance.md).

