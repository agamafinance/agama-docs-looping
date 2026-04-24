# AmFi Adapter

`AmFiAdapter` handles AmFi senior tranche tokens. AmFi already enforces qualified investor restrictions via its own whitelist, and provides an on-chain oracle for senior tranche NAV.

## About AmFi

AmFi is a Brazilian RWA platform tokenizing private credit. Its structure uses **junior + senior tranches**:

- **Senior tranche**: capped yield (e.g., 16% target APY), protected by junior subordination.
- **Junior tranche**: absorbs losses first (5–25% buffer), uncapped upside, restricted to originators.

AmFi's D+15 redemption model means tokens can be exchanged for stablecoin (ABRL or USDXP) with 15 days' delay. No on-chain secondary market.

KYC: AmFi requires Brazilian **Qualified Investor** status (≥ R$ 200k/year gross income or ≥ R$ 1M institutional). Verified via Sumsub at AmFi onboarding.

## Risk parameters

| Parameter                | Value    | Reasoning                                                        |
|--------------------------|----------|------------------------------------------------------------------|
| `MAX_LTV`                | 7000 bps (70%) | Senior is heavily subordinated, low volatility.            |
| `LIQUIDATION_THRESHOLD`  | 8000 bps (80%) | 10% buffer above borrow threshold.                         |
| `LIQUIDATION_BONUS`      |  500 bps (5%)  | Reasonable bonus given redeemable nature.                  |
| `ORACLE_STALENESS_MAX`   | 48 hours       | AmFi updates NAV daily.                                    |

## Integration points

- **Oracle**: `IAmFiPriceOracle(oracle).getPrice()` — returns USDXP per AMFI_SENIOR token, 18 decimals.
- **QI whitelist**: `IAmFiWhitelist(whitelist).isQualifiedInvestor(user)` — queried on every `deposit()` and `validate()`.
- **Token**: AmFi senior is a standard ERC-20. Validated during adapter registration to have no rebase or fee-on-transfer semantics.

## Storage

```solidity
mapping(address => uint256) public userCollateral;   // single aggregate position per user
```

AmFi senior is fully fungible, so a single position per user per adapter is sufficient. `getPositionKey(data)` returns a constant (`keccak256("AmFi", "SENIOR")`) regardless of `data`.

## Key functions

### `deposit(address user, bytes calldata data)`

```solidity
function deposit(address user, bytes calldata data) external onlyLendingPool {
    uint256 amount = abi.decode(data, (uint256));
    require(amfiWhitelist.isQualifiedInvestor(user), "NotQualifiedInvestor");
    require(priceOracle.lastUpdate() + ORACLE_STALENESS_MAX > block.timestamp, "OracleStale");
    require(priceOracle.getPrice() > 0, "OraclePriceInvalid");
    amfiToken.safeTransferFrom(user, address(this), amount);
    userCollateral[user] += amount;
    emit AssetDeposited(user, data, amount);
}
```

### `withdraw(address user, bytes calldata data)`

```solidity
function withdraw(address user, bytes calldata data) external onlyLendingPool {
    uint256 amount = abi.decode(data, (uint256));
    require(userCollateral[user] >= amount, "InsufficientCollateral");
    userCollateral[user] -= amount;
    amfiToken.safeTransfer(user, amount);
    emit AssetWithdrawn(user, data, amount);
}
```

### `transferAsset(address from, bytes data, address to)`

Used during liquidation to move seized collateral to the Stability Pool:

```solidity
function transferAsset(address from, bytes calldata data, address to) external onlyLendingPool {
    uint256 amount = abi.decode(data, (uint256));
    userCollateral[from] -= amount;
    amfiToken.safeTransfer(to, amount);
    emit AssetTransferred(from, to, data, amount);
}
```

### `getAssetValue(address user, bytes data) → uint256`

```solidity
function getAssetValue(address user, bytes calldata data) external view returns (uint256) {
    uint256 amount = abi.decode(data, (uint256));
    uint256 price = priceOracle.getPrice();    // USDXP per token, 18 dec
    return (amount * price) / 1e18;
}
```

### `validate(address user, bytes data)`

```solidity
function validate(address user, bytes calldata /*data*/) external view {
    require(amfiWhitelist.isQualifiedInvestor(user), "NotQualifiedInvestor");
    require(priceOracle.lastUpdate() + ORACLE_STALENESS_MAX > block.timestamp, "OracleStale");
}
```

## Redemption path (off-chain)

After a liquidation:

1. `AgamaSettlementVault` holds `R bps` of the seized amount.
2. Agama's Manager multisig calls AmFi's redemption API off-chain.
3. AmFi burns the senior tokens and schedules stablecoin disbursement (D+15).
4. When stablecoin arrives at Manager custody wallet, Manager calls `SettlementVault.settleRedemption(batchId, usdxpReceived)`.

!!! note

    AmFi currently redeems in ABRL (Brazilian real stablecoin) or crvUSD depending on the product. For Agama, redemption terms must explicitly be in **USDXP**. This is a negotiation point with AmFi before mainnet.

