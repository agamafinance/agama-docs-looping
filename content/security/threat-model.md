# Threat Model

## Summary

| Threat                                   | Probability | Impact         | Mitigation                                                  |
|------------------------------------------|-------------|----------------|-------------------------------------------------------------|
| Oracle compromise (AmFi / Nimofast)      | Low         | High           | Staleness check, bounded price move filter, Pauser freeze.  |
| Same-block flash attacks                 | Medium      | Medium         | `depositBlock` same-block guard.                            |
| Interest-rate griefing (dust positions)  | Medium      | Low            | `MIN_BORROW_AMOUNT` + residual rejection.                   |
| Liquidation MEV                          | N/A         | N/A            | Manager-only liquidation (uncompensated, no public path).   |
| Settlement manager going rogue           | Low         | High           | `staleBatchPeriod` escape hatch; multisig governance.        |
| KYC operator compromise                  | Medium      | Medium         | Cannot move funds; verifier status only; auditable events.   |
| USDXP depeg                              | Very Low    | Catastrophic   | Pauser runbook; no automated oracle in V1 (see USDXP page).  |
| SP 1:1 peg imbalance                     | Expected    | None           | Expected & temporary during liquidation.                    |
| XP Inc. freezes Agama addresses          | Low         | High           | Document counterparty risk; design for graceful handling.   |
| Issuer default (AmFi / Nimofast)         | Low         | High           | Pauser freeze adapter; ReserveFund absorbs shortfall.       |
| Governance multisig compromise           | Very Low    | Catastrophic   | 48h timelock + 14d ReserveFund extra delay.                 |
| Pauser multisig compromise               | Low         | Medium         | Can only pause (no drain); owner can revoke role.           |

## Detailed scenarios

### Oracle manipulation

AmFi and Nimofast each provide a single oracle. If one is compromised (private key leaked or oracle contract bug), the adapter could report false prices, enabling over-borrowing.

**Current mitigations**:
- `ORACLE_STALENESS_MAX` (48h) on every call.
- `require(price > 0)` — rejects zero prices.

**Open: insufficient**. See [Design Review #4](../challenges.md#oracle-single-point-of-failure) for the proposed secondary-oracle or NAV-attestation pattern.

### USDXP depeg

USDXP is fiat-backed 1:1 by XP Inc. Structural depeg is very unlikely but black-swan possible.

**Mitigation**:
- Off-chain monitoring by Pauser multisig with documented thresholds.
- Forward-compat storage for `usdxpOracle` (V2).
- Global pause available with no timelock (Pauser has no timelock).

### Manager going rogue

Only the 2-of-3 manager multisig can call `liquidateBorrower` and `settleRedemption`. A rogue manager could:

- Refuse to liquidate underwater positions → lenders take losses.
- Refuse to settle batches → SP depositors lose access to recovered value.

**Mitigations**:
- `emergencyDistributeInKind` callable by anyone after 60 days.
- Owner can replace manager through 48h timelock.
- Off-chain monitoring alerts if manager inactive > 7 days.

### KYC operator compromise

The KYC operator EOA can mass-verify attacker addresses, allowing them to interact with the protocol. They cannot, however:

- Move funds.
- Unblacklist sanctioned addresses.
- Upgrade contracts.

**Mitigation**:
- [Design Review #5](../challenges.md#kyc-operator-centralization) recommends rate-limiting on-chain and moving to a 2-of-3 multisig pre-mainnet.
- Governance can invalidate all recent verifications in bulk.

### Flash loan attacks

Classic vectors:

- Borrow huge USDXP, dump price, liquidate someone → pocket liquidation profit.

**Mitigations**:
- Manager-gated liquidations (no attacker can pocket the bonus).
- Same-block deposit/withdraw guard.
- Oracle bounds (out-of-range price moves rejected by adapter).

### Reentrancy

OZ `ReentrancyGuard` on every state-mutating entry point. No untrusted external call before state updates. `safeTransfer` pattern for ERC-20 calls.

### Storage collisions on upgrade

- Storage layout validated on every PR via OZ's upgrade plugin.
- `__gap` arrays reserved at start and end of every upgradable contract's storage.
- Any storage reorder requires a dedicated migration contract.
