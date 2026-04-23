# Incident Response

Playbooks per incident class. Each triggers an on-chain event (`EmergencyPaused(reason)` or similar) and a public status post within 15 minutes.

## Class 1 — Oracle manipulation (AmFi / Nimofast)

**Signal**: adapter reports price > 30% off 24h moving average, or staleness > 48h.

**Response**:
1. Pauser calls `adapter.pause()` (freezes specific adapter).
2. Ops team investigates: is it the oracle contract? A key compromise? A real market event?
3. If confirmed malicious:
   - Governance proposal to switch to fallback oracle (if available).
   - Public post with proof of manipulation.
4. If real market event:
   - Monitor for 1h.
   - Unpause when price stabilizes (within threshold).

**Lender impact**: withdrawals remain open (global not paused).
**Borrower impact**: cannot borrow against that adapter; existing positions unaffected.

## Class 2 — Smart contract exploit

**Signal**: unexpected invariant violation detected by monitoring, or user report.

**Response**:
1. Pauser immediately calls `lendingPool.pauseGlobal()` and `sp.pauseGlobal()`.
2. Analyze scope: which contracts affected? Funds at risk?
3. Recover funds where possible (e.g., front-run attacker with higher priority fee).
4. Governance drafts fix → 48h timelock → deploy.
5. Public post-mortem with full timeline.

**Lender impact**: all operations frozen.
**Borrower impact**: all operations frozen; liquidations paused.

## Class 3 — USDXP depeg

See [USDXP page](../core/tokens/usdxp.md) for threshold table.

**Response summary**:
- $0.98+ : comms only.
- $0.95 – $0.98: pause borrows.
- < $0.95 : pause global.

**Recovery**:
- Monitor USDXP price for 24h sustained > $0.995.
- Verify XP Inc. public statements.
- Unpause in reverse order (global → borrows).

## Class 4 — Issuer default (AmFi or Nimofast)

**Signal**: public announcement by AmFi/Nimofast of underlying credit event that impacts senior tranche.

**Response**:
1. Pauser freezes the affected adapter.
2. ReserveFund absorbs shortfall on existing liquidations.
3. Governance reviews whether to deprecate the adapter entirely.
4. Public post: users with positions in that adapter informed of next steps.

## Class 5 — KYC operator compromise

**Signal**: abnormal verification rate (e.g., > 500 addresses / hour), or internal security alert.

**Response**:
1. Governance revokes `KYC_OPERATOR_ROLE` from the compromised EOA.
2. Call `kycRegistry.invalidateSince(timestamp)` (V2 feature — in V1, individual `setBlocked` calls required; a mass invalidation helper is a Design Review improvement).
3. Issue new operator EOA through governance.
4. Users must re-KYC through updated flow.

## Communications protocol

Every incident triggers, in order:

1. **On-chain event** (`EmergencyPaused(reason)` or equivalent).
2. **Status banner** on docs site and app (within 15 minutes).
3. **Post on X / Discord / Telegram** (within 30 minutes).
4. **Public post-mortem** (within 48 hours of resolution).

!!! note

    The docs site status banner is controlled by a build-time flag set by ops via CI. A draft incident page template lives at `security/incident-template.mdx` (not shown publicly).

