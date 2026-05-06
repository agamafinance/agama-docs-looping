# Settlement Vault: Functions

## Core operations

### `handleSeizure(address vaultAdapter, bytes data, uint256 seizedAmount, uint256 pegGap, uint256 minSharesOut)`

- **Access**: only callable by the Stability Pool.
- **Purpose**: called by the SP immediately after the SP receives the seized RWA tokens. Records the batch and takes custody of the RWA. **No split happens here** — the entire `seizedAmount` is held in the batch until settlement.
- **State**:
  1. `nextBatchId++`; allocate `Batch storage b`.
  2. Pull the seized RWA from the SP via balance-delta into the vault.
  3. Populate the batch: `{id, asset = rwaToken, rwaAmount = seizedAmount, pegGap, queuedAt = block.timestamp, status = Queued, snapshotBlock}`.
- **Events**: `BatchQueued(id, asset, rwaAmount, queuedAt, pegGap)`.

### `settleRedemption(uint256 batchId, uint256 usdrReceived)`

- **Access**: `onlyManager`.
- **Precondition**: `b.status == Queued`.
- **Purpose**: called after the manager has redeemed the batch with the issuer off-chain. Pulls the recovered USDr, applies the split, and refills the SP.
- **State**:
  1. Pull `usdrReceived` USDr via balance-delta from the manager wallet.
  2. **Apply the split on the USDr** (not on the RWA):
     ```
     toTreasury = usdrReceived × treasuryBps / 10000     // V1: 200 bps
     toSP       = usdrReceived − toTreasury              // V1: 9800 bps
     ```
  3. Forward `toTreasury` to the Treasury via `Treasury.deposit(USDr, toTreasury)`.
  4. `USDr.approve(lendingPool, toSP)` then `lendingPool.depositOnBehalf(stabilityPool, toSP)`. Fresh `agYLD` is minted to the Stability Pool, which lifts `sagYLD`'s share price pro-rata to every holder — including the Reserve Fund's stake.
  5. If `usdrReceived < b.pegGap`: the gap is socialised through the LendingPool's bad-debt redistribution path (Liquity O(1) across active borrowers). The Reserve Fund's protection is structural, not transactional — it absorbs a large share of any SP dilution because it's the largest single SP staker, before the redistribution path is reached.
  6. Sweep any remaining RWA in the vault to `address(0xdead)` (off-chain asset is now in the issuer's hands).
  7. `b.status = Settled`, `b.settledAt = block.timestamp`.
- **Events**: `BatchSettled(id, usdrReceived, toTreasury, toSP, shortfall)`.

### `emergencyDistributeInKind(uint256 batchId)`

- **Access**: public.
- **Precondition**: `block.timestamp > b.queuedAt + staleBatchPeriod` (60 days); `b.status == Queued`.
- **Purpose**: escape hatch against manager capture. Distributes the queued RWA pro-rata to `sagYLD` holders snapshotted at `b.snapshotBlock`.
- **State**:
  1. Read `sagYLD` balances at `b.snapshotBlock` via `ERC20Votes.getPastVotes`.
  2. Distribute `b.rwaAmount` pro-rata on-demand (each call claims one holder's share).
  3. The final claim flips `b.status = EmergencyDistributed`.
- **Events**: `EmergencyDistributed(id, distributed)`.

## Admin functions

| Function | Access | Purpose |
|---|---|---|
| `setLiquidationSplit(LiquidationSplit)` | Owner (timelocked) | Update the USDr-side split. `treasuryBps + redeemBps` must equal 10_000; `redeemBps ≥ 5_000`. |
| `setStaleBatchPeriod(uint256)` | Owner (timelocked) | Update the escape-hatch delay (default 60 days). |
| `setManager(address, bool)` | Owner (timelocked) | Add or remove a settlement manager. |

> The earlier doc referenced a separate `ExcessPolicy` struct and an `excess` bucket. V1 ships **without** that abstraction: the LiquidationSplit (`treasuryBps` + `redeemBps`) covers the routing, and any USDr above `pegGap` simply continues to flow into the SP through the same `depositOnBehalf` rail — lifting the share price for every holder. There is no separate excess routing parameter.

## View functions

| Function | Returns |
|---|---|
| `getBatch(uint256 id)` | Full `Batch` struct. |
| `pegGapPendingForSP()` | Sum of `pegGap` across all queued batches — what the SP is owed pending settlement. |
| `nextBatchId()` | Auto-incrementing batch counter. |

## Data structures

```solidity
enum Status { Queued, Settled, EmergencyDistributed }

struct Batch {
    uint256 id;
    address asset;       // RWA token held in the batch
    uint256 rwaAmount;   // total seized RWA awaiting redemption
    uint256 pegGap;      // USDr the SP is owed at settlement (= debt repaid at seizure)
    Status  status;
    uint256 queuedAt;
    uint256 settledAt;
    uint256 snapshotBlock;  // sagYLD voting snapshot for the escape hatch
}

struct LiquidationSplit {
    uint16 treasuryBps;  // V1 default: 200  (2%)
    uint16 redeemBps;    // V1 default: 9800 (98%)
    // Constraint: treasuryBps + redeemBps == 10_000, redeemBps ≥ 5_000.
}
```

There is no `inKindBps` and no `reserveFundBps` field — those routing options are not in V1. The Reserve Fund earns through its SP stake; the in-kind exit is the [emergency escape hatch](overview.md#escape-hatch), not a normal split.
