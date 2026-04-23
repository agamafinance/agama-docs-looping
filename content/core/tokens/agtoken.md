# agTOKEN

`agTOKEN` is Agama's yield-bearing receipt for lenders. It wraps USDXP on a 1:1 basis (at deposit time, before fees) and appreciates as borrowers pay interest into the pool.

| Property          | Value                                    |
|-------------------|------------------------------------------|
| Name              | Agama USDXP Receipt Token                 |
| Symbol            | `agUSDXP`                                 |
| Standard          | ERC-4626 (asset = USDXP)                  |
| Transferable      | Yes (standard ERC-20)                     |
| Mint / burn       | `onlyLendingPool`                         |
| Yield source      | `liquidityIndex` appreciation             |

## Key functions

```solidity
function mint(address to, uint256 amount) external onlyLendingPool;
function burn(address from, uint256 amount) external onlyLendingPool;

// Special: Lending Pool uses this to deliver USDXP to borrowers without burning shares
function transferUnderlying(address to, uint256 amount) external onlyLendingPool;

// ERC-4626
function totalAssets() external view returns (uint256);
function convertToAssets(uint256 shares) external view returns (uint256);
function convertToShares(uint256 assets) external view returns (uint256);
```

## Yield accrual

`agTOKEN` is a **non-rebasing** yield-bearing token. Share count stays constant; share value grows via `liquidityIndex`.

```
pricePerShare = convertToAssets(1e18) = 1e18 × liquidityIndex / RAY
```

As borrowers pay interest, `liquidityIndex` rises, so `pricePerShare` rises — every holder benefits proportionally without a balance update.

## Composability

`agTOKEN` is standard ERC-20 with ERC-4626 metadata. It can be used as collateral in other Rayls DeFi protocols, wrapped in vaults, or provided as liquidity in Rayls DEXes (once they exist for stablecoin pairs).

Same-block protection: `agTOKEN` cannot be transferred in the same block it was minted (`depositBlock[user]` guard on the Lending Pool).
