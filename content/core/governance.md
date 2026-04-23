# Governance

Governance is multisig + timelock. There is no DAO token and no on-chain voting in V1.

## Roles and signers

| Role                  | Holder                    | Signers              | Timelock           | Capabilities                                  |
|-----------------------|---------------------------|----------------------|--------------------|----------------------------------------------|
| `DEFAULT_ADMIN_ROLE`  | Owner multisig            | 3-of-5               | 48 hours           | Upgrade contracts, change parameters, grant/revoke roles. |
| `PAUSER_ROLE`         | Pauser multisig           | 2-of-4               | None (emergency)   | Pause/unpause any contract flag.              |
| `MANAGER_ROLE` (SP)   | Operational multisig      | 2-of-3               | None               | Trigger liquidations, settle batches.         |
| `MANAGER_ROLE` (Treasury) | Operational multisig  | 2-of-3               | None               | Operational withdrawals within budget.        |
| `DISTRIBUTOR_ROLE`    | Operational multisig      | 2-of-3               | None               | Trigger fee distribution.                     |
| `KYC_OPERATOR_ROLE`   | Backend EOA               | 1                    | None               | Set verified/blocked (funds cannot move).     |

## Signer profiles (target)

| Multisig    | Target signer profile                                         |
|-------------|---------------------------------------------------------------|
| Owner (3/5) | 2 founders + 1 ops lead + 1 technical advisor + 1 audit firm rep |
| Pauser (2/4) | 2 founders + 1 ops lead + 1 security researcher              |
| Manager (2/3) | 3 ops team members                                         |

Signer identities and Safe addresses will be published on this page once finalized (pre-mainnet).

## Upgradability

All core contracts use OpenZeppelin UUPS proxies. Any upgrade proposal flows through the 48-hour `TimelockController`:

```
Owner multisig proposes upgrade
   ↓ (48h delay, publicly visible via TimelockController events)
Owner multisig executes upgrade
```

Users and integrators see all pending upgrades during the delay window and can exit if they disagree.

## USDXP depeg playbook

Since there is no USDXP/USD oracle on Rayls in V1, depeg monitoring is off-chain. See [Tokens → USDXP](../core/tokens/usdxp.md) for thresholds and actions.

## Incident response

Documented playbooks per incident class:

| Class                                | Response                                                                 |
|--------------------------------------|--------------------------------------------------------------------------|
| Oracle manipulation (AmFi / Nimo)    | Pauser freezes adapter; governance reviews oracle source.                 |
| Smart contract exploit               | Pauser pauses global; recover funds where possible; governance drafts fix. |
| USDXP depeg                          | Pauser freezes borrows then global per threshold table.                   |
| Issuer default                       | Pauser freezes adapter; ReserveFund absorbs shortfall; governance reviews. |
| KYC operator compromise              | Governance disables operator; invalidate recent verifications.            |

Each incident triggers `EmergencyPaused(reason)` on-chain and a public status post within 15 minutes.

## What governance cannot do

!!! note

    The following are **not** parameters — they are hardcoded invariants:

    - `HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e27` (HF = 1.0 in RAY).
    - `MIN_BORROW_AMOUNT = 100 USDXP` (immutable — may be revisited via full redeployment).
    - Same-block deposit/withdraw guard.
    - LiquidationSplit must sum to exactly 10000 bps.

## Forward compatibility

V1 is intentionally multisig-governed. V2 will introduce on-chain governance — structure TBD (likely veTOKEN or delegated voting). Storage layout is designed to be forward-compatible.
