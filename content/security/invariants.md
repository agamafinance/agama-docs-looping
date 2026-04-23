# Invariants

Checked continuously in Foundry invariant tests. Any violation is a protocol-level bug.

## Accounting invariants

### 1. Debt total consistency

```
Σ over users (scaledDebt(user, adapter, data)) == DebtToken.totalSupply()
```
Both sides scaled to current `usageIndex`.

### 2. Receipt total consistency

```
Σ over users (agTOKEN.balanceOf(user)) == agTOKEN.totalSupply()
```
And:
```
agTOKEN.totalAssets() >= agTOKEN.totalSupply() × liquidityIndex / RAY − dust
```

### 3. SP peg invariant (happy path)

```
Σ over users (agaSP.balanceOf(user)) == agaSP.totalSupply() == agTOKEN.balanceOf(StabilityPool)
```

!!! note

    Temporarily violated during the window between `finalizeLiquidation` and settlement. The invariant test must account for active batches.

### 4. Monotonic indices

```
reserve.liquidityIndex(t+1) >= reserve.liquidityIndex(t)
reserve.usageIndex(t+1)     >= reserve.usageIndex(t)
```
Any decrease indicates a bug.

### 5. No `agTOKEN` price decrease except on bad-debt

`agTOKEN.convertToAssets(1e18)` monotonically increases, with the sole exception of `LendingPool.redistributeBadDebt()` which explicitly burns the delta.

## Operational invariants

### 6. Post-liquidation rToken whole

After `finalizeLiquidation`, the `agTOKEN` contract's USDXP balance is restored (or explicitly absorbed via bad-debt redistribution).

### 7. Solvency with in-flight settlement

```
agTOKEN.balanceOf(StabilityPool)
  + SettlementVault.getPendingRedemptionValue()
  + ReserveFund.totalAssetValueUSDXP()
  >= agaSP.totalSupply() × liquidityIndex / RAY
```
Violation means protocol cannot make SP depositors whole and bad debt is imminent.

### 8. Collateral withdrawability for debt-free users

Any user with `scaledDebt == 0` across all adapters must always be able to `withdrawAsset` up to their full `userCollateral`, subject only to pause state.

### 9. LiquidationSplit integrity

```
treasuryBps + burnBps + redeemBps + inKindBps == 10000
```
at all times. Governance setter revertts on violation.

### 10. Same-block deposit guard

```
depositBlock[user] == block.number  ⇒  withdraw(user) reverts
```
Applies to both `LendingPool` and `StabilityPool`.

### 11. Adapter conservation

For every registered adapter:
```
Σ over users (adapter.getTotalAssetValue(user)) matches adapter's internal custody sum
tokens in adapter contract == Σ over users (userCollateral[user])
```

### 12. Grace period correctness

```
block.timestamp <= liquidationStartTime + liquidationGracePeriod  ⇒  finalizeLiquidation reverts
block.timestamp >  liquidationStartTime + liquidationGracePeriod  ⇒  closeLiquidation reverts
```

## Implementation sketch (Foundry)

```solidity
contract InvariantTest is Test {
    AgamaLendingPool pool;
    AgamaStabilityPool sp;
    // ... handlers, actors

    function invariant_debtTotalConsistency() external {
        uint256 total = 0;
        for (uint256 i = 0; i < actors.length; i++) {
            total += pool.getPositionsScaledDebt(actors[i]);
        }
        assertEq(total, debtToken.totalSupply());
    }

    function invariant_spPeg() external {
        // Skip if any active batch
        if (settlementVault.hasActiveBatches()) return;
        assertEq(agToken.balanceOf(address(sp)), agaSP.totalSupply());
    }

    // ... 10 more
}
```
