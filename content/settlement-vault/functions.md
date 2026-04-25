# Settlement Vault: Functions

## Core operations

### `handleSeizure(address vaultAdapter, bytes data, uint256 seizedAmount, uint256 pegGap, uint256 minSharesOut)`

- **Access**: `onlyStabilityPool`.
- **Purpose**: called by SP after transferring the seized RWA. Applies the split, creates a settlement batch.
- **State**:
  1. `nextBatchId++`; allocate `Batch storage b`.
  2. Compute split:
     ```
     T = seizedAmount × treasuryBps    / 10000
     B = seizedAmount × reserveFundBps / 10000
     R = seizedAmount × redeemBps      / 10000
     K = seizedAmount × inKindBps      / 10000
     ```
  3. Transfer `T` to `Treasury`; `B` to `ReserveFund`.
  4. Keep `R` and `K` in vault pending redemption.
  5. Populate: `{id, rwaToken, R, K, pegGap, status: Queued, queuedAt, snapshotBlock}`.
- **Events**: `BatchQueued(id, rwaToken, R, K, pegGap, queuedAt)`.

### `settleRedemption(uint256 batchId, uint256 usdcReceived)`

- **Access**: `onlyManager`.
- **Precondition**: `b.status == Queued`.
- **State**:
  1. Pull USDC via balance-delta from manager custody wallet.
  2. `toSP = min(usdcReceived, b.pegGap)`.
  3. `USDC.approve(lendingPool, toSP)` then `lendingPool.depositOnBehalf(stabilityPool, toSP)`.
  4. `excess = usdcReceived − toSP` → per `ExcessPolicy` (V1: 100% ReserveFund).
  5. If `usdcReceived < b.pegGap`: trigger `ReserveFund.coverShortfall(pegGap − usdcReceived)`; if still short, `lendingPool.redistributeBadDebt(remaining)`.
  6. `b.status = Settled`, `b.settledAt = block.timestamp`.
- **Events**: `BatchSettled(id, usdcReceived, toSP, excess, shortfall)`.

### `emergencyDistributeInKind(uint256 batchId)`

- **Access**: public.
- **Precondition**: `block.timestamp > b.queuedAt + staleBatchPeriod` (60 days); `b.status == Queued`.
- **State**:
  1. Read `agaSP` balances at `b.snapshotBlock` via `ERC20Votes.getPastVotes`.
  2. Distribute `b.rwaAmount` pro-rata on-demand (each call claims one depositor's share).
  3. Final depositor's claim flips `b.status = EmergencyDistributed`.
- **Events**: `EmergencyDistributed(id, distributed)`.

## Admin functions

| Function                                      | Access                 | Purpose                           |
|-----------------------------------------------|------------------------|-----------------------------------|
| `setLiquidationSplit(LiquidationSplit)`       | Owner (timelocked)     | Update split.                     |
| `setExcessPolicy(ExcessPolicy)`               | Owner (timelocked)     | Update excess routing.            |
| `setStaleBatchPeriod(uint256)`                | Owner (timelocked)     | Update escape hatch delay.        |
| `setManager(address, bool)`                   | Owner (timelocked)     | Add/remove manager.               |

## View functions

| Function                                   | Returns                             |
|--------------------------------------------|-------------------------------------|
| `getBatch(uint256 id)`                     | Full `Batch` struct.                |
| `getPendingRedemptionValue()`              | Sum of queued batches at oracle price.|
| `getTotalSettled()`                        | Lifetime settled USDC.             |

## Data structures

```solidity
enum Status { Queued, Settled, EmergencyDistributed }

struct Batch {
    uint256 id;
    address rwaToken;
    uint256 rwaAmount;        // R: the redeem bucket
    uint256 inKindAmount;     // K: the in-kind bucket (V1 = 0)
    uint256 pegGap;           // USDC debt SP owes itself until settlement
    Status  status;
    uint256 queuedAt;
    uint256 settledAt;
    uint256 snapshotBlock;    // for escape hatch
}

struct LiquidationSplit {
    uint16 treasuryBps;
    uint16 reserveFundBps;
    uint16 redeemBps;
    uint16 inKindBps;
    // sum must equal 10000
}

struct ExcessPolicy {
    uint16 toReserveFundBps;   // V1 default: 10000
    uint16 toTreasuryBps;
    uint16 toSPDepositorsBps;  // V2: enables direct distribution
    // sum must equal 10000
}
```
