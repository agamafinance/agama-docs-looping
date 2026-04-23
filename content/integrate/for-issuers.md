# For Issuers — Adding a new adapter

This guide is for RWA issuers who want to list their tokenized asset as collateral on Agama. Expected reader: technical lead at a Brazilian RWA platform (Santander, Nuclea, Provi, etc.).

## Prerequisites

1. **ERC-20 token** deployed on Rayls public chain with no rebase or fee-on-transfer semantics.
2. **On-chain oracle** for your token's price in USDXP (18 decimals). Updated at least daily.
3. **QI whitelist contract** with public `isQualifiedInvestor(address) → bool` interface.
4. **Redemption API** off-chain enabling Agama's Manager multisig to convert tokens back to USDXP with a published timeline (T+N).

## High-level steps

```
1. Contact Agama team → initial fit review
2. Implement a reference adapter on testnet
3. Economic review → risk parameter calibration
4. Deploy to mainnet (behind governance timelock)
5. Register via `LendingPool.registerAdapter(address)`
```

## Reference adapter template

```solidity
contract MyIssuerAdapter is IAssetAdapter, Ownable {
    IERC20   public immutable assetToken;
    IMyOracle public priceOracle;
    IMyWhitelist public immutable whitelist;
    address  public immutable lendingPool;

    uint256 public immutable MAX_LTV;
    uint256 public immutable LIQUIDATION_THRESHOLD;
    uint256 public immutable LIQUIDATION_BONUS;
    uint256 public immutable ORACLE_STALENESS_MAX;

    mapping(address => uint256) public userCollateral;

    modifier onlyLendingPool() {
        if (msg.sender != lendingPool) revert NotLendingPool();
        _;
    }

    function deposit(address user, bytes calldata data) external onlyLendingPool {
        uint256 amount = abi.decode(data, (uint256));
        require(whitelist.isQualifiedInvestor(user), "NotQualifiedInvestor");
        require(priceOracle.lastUpdate() + ORACLE_STALENESS_MAX > block.timestamp, "OracleStale");
        require(priceOracle.getPrice() > 0, "OraclePriceInvalid");

        assetToken.safeTransferFrom(user, address(this), amount);
        userCollateral[user] += amount;
    }

    function withdraw(address user, bytes calldata data) external onlyLendingPool {
        uint256 amount = abi.decode(data, (uint256));
        require(userCollateral[user] >= amount, "InsufficientCollateral");
        userCollateral[user] -= amount;
        assetToken.safeTransfer(user, amount);
    }

    function transferAsset(address from, bytes calldata data, address to) external onlyLendingPool {
        uint256 amount = abi.decode(data, (uint256));
        userCollateral[from] -= amount;
        assetToken.safeTransfer(to, amount);
    }

    function getAssetValue(address user, bytes calldata data) external view returns (uint256) {
        uint256 amount = abi.decode(data, (uint256));
        return (amount * priceOracle.getPrice()) / 1e18;
    }

    function getTotalAssetValue(address user) external view returns (uint256) {
        return (userCollateral[user] * priceOracle.getPrice()) / 1e18;
    }

    function getWithdrawValue(address user, bytes calldata data) external view returns (uint256) {
        return this.getAssetValue(user, data);
    }

    function getPositionKey(bytes calldata /*data*/) external pure returns (bytes32) {
        return keccak256(abi.encode("MyIssuer"));
    }

    function getPositionKeys(address /*user*/) external view returns (bytes32[] memory keys) {
        keys = new bytes32[](1);
        keys[0] = keccak256(abi.encode("MyIssuer"));
    }

    function validate(address user, bytes calldata /*data*/) external view {
        require(whitelist.isQualifiedInvestor(user), "NotQualifiedInvestor");
        require(priceOracle.lastUpdate() + ORACLE_STALENESS_MAX > block.timestamp, "OracleStale");
    }

    function validateLiquidationData(address user, bytes calldata data) external view returns (bool) {
        uint256 amount = abi.decode(data, (uint256));
        return userCollateral[user] >= amount;
    }

    function getAssetToken() external view returns (address) { return address(assetToken); }
    function getAssetType() external pure returns (string memory) { return "ERC20_MYISSUER"; }
    function supportsPartialWithdraw() external pure returns (bool) { return true; }

    function setPriceOracle(address _oracle) external onlyOwner { priceOracle = IMyOracle(_oracle); }
}
```

## Risk parameter calibration checklist

- What is the historical volatility of the underlying asset?
- Is there a subordination / tranche structure that protects seniors?
- What is the redemption fee and timeline?
- How frequently is the oracle updated? What is the oracle's own trust model?
- Is the issuer KYC / QI whitelist immutable or mutable?

Typical starting parameters for a new adapter:

| Parameter                | Conservative (first time) | Optimistic (post-ramp)  |
|--------------------------|---------------------------|-------------------------|
| `MAX_LTV`                | 5000 bps (50%)            | 7000 bps (70%)          |
| `LIQUIDATION_THRESHOLD`  | 6000 bps (60%)            | 8000 bps (80%)          |
| `LIQUIDATION_BONUS`      | 1000 bps (10%)            | 500 bps (5%)            |
| `ORACLE_STALENESS_MAX`   | 24 hours                  | 48 hours                |

!!! warning

    Start conservative. Ramp LTV only after at least 3 months of clean operation and 100k+ USDXP borrowed against the adapter.

## Support

Reach out via `integrations@agama.fi` (or TBD channel) with your token spec, oracle spec, whitelist interface, and redemption terms. Agama team will schedule a fit review call.
