# Asset Adapter Interface

`IAssetAdapter` is the uniform interface between the Lending Pool and each collateral asset. Every adapter is responsible for:

- Valuation via an asset-specific oracle.
- KYC / QI validation with the issuer's whitelist.
- Custody of the underlying RWA tokens.
- Position identification (opaque `bytes` encoding, decoded only by the adapter).

## Interface

```solidity
interface IAssetAdapter {
    // Valuation
    function getAssetValue(address user, bytes calldata data) external view returns (uint256);
    function getWithdrawValue(address user, bytes calldata data) external view returns (uint256);
    function getTotalAssetValue(address user) external view returns (uint256);

    // Position management (LendingPool-only)
    function deposit(address user, bytes calldata data) external;
    function withdraw(address user, bytes calldata data) external;
    function transferAsset(address from, bytes calldata data, address to) external;

    // Position identification
    function getPositionKey(bytes calldata data) external pure returns (bytes32);
    function getPositionKeys(address user) external view returns (bytes32[] memory);

    // Validation
    function validate(address user, bytes calldata data) external view;
    function validateLiquidationData(address user, bytes calldata data) external view returns (bool);

    // Asset info
    function getAssetToken() external view returns (address);
    function getAssetType() external view returns (string memory);
    function supportsPartialWithdraw() external view returns (bool);

    // Oracle management (owner-only)
    function setPriceOracle(address _oracle) external;
}
```

## Data encoding convention

| Asset class | `data` encoding                                                    |
|-------------|--------------------------------------------------------------------|
| ERC-20      | `abi.encode(uint256 amount)`                                        |
| ERC-721     | `abi.encode(uint256 tokenId)` (not used in V1)                      |
| ERC-1155    | `abi.encode(uint256 tokenId, uint256 amount)` (not used in V1)      |

The adapter decodes `data` in every function. `getPositionKey(data)` computes the storage key used by the Lending Pool for the position.

## Risk parameters (per adapter)

Each adapter exposes its own immutable risk parameters:

| Parameter                | Type     | Meaning                                                  |
|--------------------------|----------|----------------------------------------------------------|
| `MAX_LTV`                | uint256  | Borrow threshold in basis points.                         |
| `LIQUIDATION_THRESHOLD`  | uint256  | LLTV in basis points (HF denominator scaler).             |
| `LIQUIDATION_BONUS`      | uint256  | Bonus seized during liquidation, basis points.            |
| `ORACLE_STALENESS_MAX`   | uint256  | Max time since last oracle update, seconds.               |

## Oracle integration contract

!!! warning

    **Design Review #4**: each adapter has a single oracle today. This is a concentrated trust assumption. We recommend requiring a secondary oracle (or NAV attestation from a second issuer signing key) before mainnet.

At minimum, every adapter MUST:

1. Check `oracle.lastUpdate() + ORACLE_STALENESS_MAX > block.timestamp` on every user-facing entry.
2. Reject `price == 0` explicitly.
3. Optionally reject out-of-bound price moves (e.g., > 30% in < 1h) as a circuit breaker.

## Implementations

- [AmFi Adapter](amfi.md) — AmFi senior tranche ERC-20.
- [Nimofast Adapter](nimofast.md) — Nimofast receivables.

Adding a new adapter: contact the Agama team.
