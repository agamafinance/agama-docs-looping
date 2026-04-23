# Glossary

Terms used throughout this documentation. Marked **[RAAC]** if inherited from RAAC with the same meaning.

| Term | Meaning |
|---|---|
| **agTOKEN** | Agama's yield-bearing receipt token minted to lenders. ERC-4626 wrapping USDXP. Equivalent to RAAC's `rToken`. |
| **agaSP** | Agama Stability Pool share. 1:1 with `agTOKEN` at mint/burn time. Non-transferable. Equivalent to RAAC's `deToken`. |
| **DebtToken** | Non-transferable, scaled debt token held by borrowers. Balance grows with interest. **[RAAC]** |
| **USDXP** | Rayls-native stablecoin issued by XP Inc. / Clear. Fiat-backed 1:1 USD. |
| **Adapter** | Contract implementing `IAssetAdapter`; handles per-asset collateral logic (custody, oracle, QI whitelist). **[RAAC]** |
| **Position key** | `bytes32` identifier for a collateral position, computed by `adapter.getPositionKey(data)`. **[RAAC]** |
| **Health factor (HF)** | `collateralValue × liquidationThreshold / scaledDebt`, in RAY. HF ≥ 1 is safe. **[RAAC]** |
| **LTV / Borrow threshold** | Max ratio of borrow value to collateral value. `MAX_LTV`. **[RAAC]** |
| **LLTV / Liquidation threshold** | HF denominator scaler. Above LTV, below 100%. **[RAAC]** |
| **Liquidation grace period** | Time between `initiateLiquidation` and `finalizeLiquidation` (72h). Borrower can self-cure. **[RAAC]** |
| **Liquidation bonus** | Extra collateral value (% of debt) captured by the liquidator (SP here). **[RAAC]** |
| **Reserve factor** | % of borrow interest diverted to Fee Collector. **[RAAC]** |
| **Kink / Optimal utilization** | Utilization above which borrow rate slope steepens. 80% in V1. **[RAAC]** |
| **Liquidity index** | RAY-scaled index that accrues deposit interest over time. **[RAAC]** |
| **Usage index** | RAY-scaled index that accrues borrow interest over time. **[RAAC]** |
| **RAY** | Precision unit = 1e27. Indices and HF use RAY. **[RAAC]** |
| **Scaled debt** | `rawDebt × currentUsageIndex / positionIndex`. Interest-inclusive. **[RAAC]** |
| **Settlement Vault** | Agama-specific: holds seized collateral, applies LiquidationSplit, queues issuer redemption. |
| **LiquidationSplit** | `{treasuryBps, burnBps, redeemBps, inKindBps}` summing to 10000. |
| **ReserveFund** | Agama-specific: bad-debt buffer, accumulates `burnBps` + portion of reserve factor. |
| **Peg gap** | USDXP value the SP owes itself after absorbing a liquidation, before settlement completes. |
| **KYC Light** | Agama's retail KYC path: Sumsub liveness + ID + sanctions + geofence. |
| **QI** | Qualified Investor. Brazilian: ≥ R$ 200k/year or ≥ R$ 1M institutional holdings. |
| **Manager** | Operational multisig (2-of-3) with authority to trigger liquidations and settle batches. |
| **Pauser** | Emergency multisig (2-of-4) with authority to pause contracts. No timelock. |
| **Owner** | Governance multisig (3-of-5) with timelocked authority to upgrade and change parameters. |
