# USDXP

| Property                | Value                                                   |
|-------------------------|---------------------------------------------------------|
| Issuer                  | XP Inc. through Clear Corretora                         |
| Backing                 | Fiat 1:1 USD, reserves at international FI              |
| Backing proof           | ZK proofs + independent audits (Rayls dual-layer)       |
| Custody / governance    | XP Inc.                                                  |
| Deployment              | Rayls public chain (Arbitrum-based L2)                  |
| Mainnet launch          | 2026-04-30                                              |
| Redemption              | Integrated into Clear platform                          |
| Oracle (USDXP/USD)      | **None publicly documented**                            |
| Blocklist / freeze      | **Not publicly documented — assume yes (regulated issuer)** |
| Pausable                | **Not publicly documented — assume yes**                 |

## Risk classification

USDXP is **not** an algorithmic / crypto-collateralized / decentralized stablecoin. It is a **regulated custodian stablecoin**, architecturally closer to USDC than to DAI, crvUSD, or FRAX.

## Agama's approach

### A. Trust 1:1 in all math

No USDXP/USD oracle is queried, no circuit breaker runs based on price. Every internal calculation (HF, APY, LTV) assumes 1 USDXP = 1 USD.

Reasoning:

- No oracle exists on Rayls for USDXP yet.
- Structural depeg risk is very low given XP Inc.'s backing and regulatory context.
- Adding a phantom oracle creates false confidence and new attack surface.

### B. Balance-delta accounting on every transfer

Every call site that moves USDXP uses the pattern:

```solidity
uint256 balanceBefore = USDXP.balanceOf(address(this));
USDXP.safeTransferFrom(user, address(this), amount);
uint256 received = USDXP.balanceOf(address(this)) - balanceBefore;
// operate on `received`, not on `amount`
```

Defends against unknown fee-on-transfer or rebase semantics even though they are not currently documented.

### C. Pauser monitors depeg off-chain

Depeg monitoring is off-chain. The Pauser multisig executes based on external signals:

| Signal                                | Action                                              |
|---------------------------------------|-----------------------------------------------------|
| USDXP within $0.995–$1.005            | Normal ops.                                         |
| $0.98–$0.995                          | Elevated alert; comms only.                         |
| $0.95–$0.98                           | Pause borrows: `lendingPool.pauseBorrow()`.         |
| < $0.95                               | Pause global: `lendingPool.pauseGlobal()`.          |
| ZK backing proof stale > 48h          | Pause borrows.                                      |
| Official XP Inc. issue announcement   | Pause global.                                       |

### D. Forward compatibility for a V2 oracle

A storage slot `IUSDXPPriceOracle public usdxpOracle` is reserved in `AgamaLendingPool`, initialized to `address(0)` in V1. When Rayls / XP ship an oracle, governance sets this address and gates on it (checking price bounds per invocation).

## Counterparty risk disclosure

!!! danger

    Agama inherits full XP Inc. counterparty risk via USDXP. If USDXP depegs, is frozen, or the issuer pauses transfers, user funds may be temporarily or permanently affected. This risk is not mitigated by Agama and is surfaced to users in the protocol's risk disclosures.

## Open question resolved

This spec was initially ambiguous about USDXP handling. The current approach treats USDXP as the canonical unit of account across lending, borrowing, and settlement.
