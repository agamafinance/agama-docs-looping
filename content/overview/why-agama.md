# Why Agama

## The gap

Brazilian private credit is a $200B+ market almost entirely off-chain. A handful of issuers (AmFi, Nimofast, Provi, Santander) have tokenized slices of it on Ethereum or Rayls, but the tokens sit in QI wallets with no leverage, no composable yield, no secondary utility.

At the same time, retail crypto users cannot reach these products directly — qualified investor gating blocks them.

Agama closes both gaps:

- **Unlocks leverage** for existing QI holders (loop their yield-bearing positions).
- **Exposes RWA yield** to retail via `agTOKEN` (no QI gate, KYC Light only).
- **Creates a stability backstop** where deposits earn supply yield *and* liquidation gains.

## Competitive positioning

!!! note

    Agama does not compete with RAAC — it **is** RAAC, deployed for a different market (Brazilian RWA instead of US real estate) on a different network (Rayls instead of Ethereum).

| Property                | Aave v3          | Maple           | Centrifuge      | RAAC            | **Agama V1**    |
|-------------------------|------------------|-----------------|-----------------|-----------------|-----------------|
| Collateral              | Crypto + select RWA | On-chain credit | Tokenized RWA   | Real estate NFTs | **BR private credit** |
| Stability Pool          | No (Safety Module) | No             | No              | Yes             | **Yes (inherited)** |
| Asset adapter pattern   | Limited          | No              | Per-pool        | Yes             | **Yes (inherited)** |
| Network                 | Multi-chain      | Ethereum + L2   | Centrifuge + L2 | Ethereum        | **Rayls**       |
| KYC                     | None             | KYC required    | Pool-specific   | KYC Light       | **KYC Light**   |
| Looping                 | Yes              | No              | Limited         | Yes             | **Yes**         |
| Yield-bearing collateral| Some             | Yes (RWAs)      | Yes             | Yes             | **Yes**         |
| Liquidation model       | Dutch auction    | Off-chain       | Per-pool        | SP + redistrib. | **SP + off-chain redeem** |

## Why RAAC specifically, not Aave

Three reasons:

1. **RWA-native design**. RAAC's asset adapter layer cleanly separates per-asset logic (oracles, KYC, tranche mechanics) from the pool. Aave forces everything into one monolithic reserve.

2. **Stability Pool > Aave's Safety Module**. Liquidity is actively deployed against liquidations instead of idly sitting behind a slashing claim. SPs earn yield and liquidation gains simultaneously.

3. **Siloed positions**. Each `(user, adapter, positionKey)` has its own health factor, same as Morpho Blue and RAAC. Aave's cross-collateralization is a risk amplifier for RWA where one asset's oracle compromise can cascade.

## Why Rayls, not Ethereum / Polygon / Arbitrum

- **Native USDXP**: Brazil-issued stablecoin by XP Inc. (largest broker), regulated.
- **Institutional compliance layer**: BCB DREX integration, ZK backing proofs, permissioned subnets for institutions.
- **Rayls grant + ecosystem fit**: Agama won the Rayls hackathon and has a $200k grant.
- **Public chain composability**: Rayls public chain is Arbitrum-based, so tooling and audits transfer from the broader Ethereum ecosystem.

## Why not just deploy RAAC contracts 1:1

Two gaps prevent a pure copy:

1. **No on-chain DEX for AmFi / Nimofast tokens on Rayls**. RAAC liquidates through Curve (crvUSD pairs). We have no such market. Our [Settlement Vault](../core/settlement-vault/overview.md) routes seized collateral through off-chain issuer redemption (D+15) and auto-reconstitutes the Stability Pool on return.

2. **No iREET-equivalent index token in V1**. RAAC fractionalizes real estate into an index token (iREET) for composability. V1 Agama treats AmFi and Nimofast tokens as plain ERC-20 collateral with their own adapters. V2 may add an Agama RWA Index.

Everything else — Lending Pool, Stability Pool, Asset Adapter Interface, token model, fee router — is faithfully inherited.
