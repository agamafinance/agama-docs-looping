# agaSP

| Property          | Value                                    |
|-------------------|------------------------------------------|
| Name              | Agama Stability Pool Share                |
| Symbol            | `agaSP`                                   |
| Standard          | ERC-20 + `ERC20Votes` checkpoints         |
| Transferable      | **No** (mint/burn only via StabilityPool) |
| Mint / burn       | `onlyStabilityPool`                       |
| Peg               | Strict 1:1 with `agTOKEN` at mint/burn    |

## 1:1 peg explained

When Charlie deposits 100 `agTOKEN` into the SP, he receives exactly 100 `agaSP`. When he withdraws 100 `agaSP`, he receives exactly 100 `agTOKEN` back.

**Value** per share grows because the underlying `agTOKEN` grows (lending pool interest accrues into it). There is no internal exchange rate math inside the SP.

!!! note

    This differs from Liquity's Stability Pool design, which uses a product/sum scaling ratio to track cumulative gains and losses across depositors. The RAAC / Agama model is simpler to audit and more gas-efficient.

## Why `ERC20Votes` checkpoints

Checkpoints are needed **only for the escape hatch** in the [Settlement Vault](../../core/settlement-vault/overview.md). In the happy path, settlement deposits USDXP directly back into the Lending Pool and every `agaSP` holder benefits through the restored peg — no balance snapshot needed.

If the manager becomes inactive (60+ days), `emergencyDistributeInKind(batchId)` distributes the seized RWA tokens pro-rata to depositors at the batch's `snapshotBlock`. This requires historical balance lookup, which OZ `ERC20Votes` provides via `getPastVotes(account, blockNumber)`.

## Gas cost

`ERC20Votes` adds ~20–30k gas per transfer / mint / burn. Given SP deposits are not high-frequency trades, this is acceptable.

## Functions

```solidity
function mint(address to, uint256 amount) external onlyStabilityPool;
function burn(address from, uint256 amount) external onlyStabilityPool;

// Transfer is disabled between arbitrary addresses.
// Internal mint/burn still needs to update checkpoints.

function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
```
