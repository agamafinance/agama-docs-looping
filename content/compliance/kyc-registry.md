# KYC Registry

`AgamaKYCRegistry` is the on-chain registry consulted by lender and SP entry points. **Borrowers are not KYC'd by Agama** — their QI status is enforced by the adapter against the issuer's whitelist.

## Data model

```solidity
enum Status { None, Verified, Blocked }

mapping(address => Status) public status;
mapping(address => uint256) public verifiedAt;
```

## Access control

| Role                  | Holder                          | Capability                          |
|-----------------------|---------------------------------|-------------------------------------|
| `DEFAULT_ADMIN_ROLE`  | Owner multisig (timelocked)     | Manage role assignments.            |
| `KYC_OPERATOR_ROLE`   | Backend EOA                     | Set verified / blocked / cleared.   |

!!! warning

    **Design Review**: the KYC operator is a single EOA controlled by Agama's backend. Compromise means mass-verifying attacker addresses. Mitigations proposed:
    - Rate-limit verifications on-chain (max N per day).
    - Move to a 2-of-3 KYC multisig for mainnet.
    - Add a governance-callable "invalidate all since timestamp T" emergency reset.

## Functions

```solidity
function setVerified(address user) external onlyRole(KYC_OPERATOR_ROLE);
function setBlocked(address user)  external onlyRole(KYC_OPERATOR_ROLE);
function clear(address user)       external onlyRole(KYC_OPERATOR_ROLE);

function isVerified(address user) external view returns (bool);
function isBlocked(address user)  external view returns (bool);
```

## Off-chain flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User starts Sumsub flow on Agama frontend                 │
│    - Liveness check                                          │
│    - Government ID                                           │
│    - Proof of address                                        │
│    - Sanctions screening (OFAC, UN, EU, CVM)                  │
│    - Geofence (BR, US, and OFAC-listed jurisdictions blocked)│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Sumsub webhook → Agama backend                            │
│    Backend validates signature, idempotent deduplication.    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend's KYC operator wallet signs                       │
│    kycRegistry.setVerified(userAddress)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User can now deposit / borrow / stake                      │
└─────────────────────────────────────────────────────────────┘
```

## Geofencing

Blocked jurisdictions (V1):

- **United States** (regulatory — securities + sanctions).
- **Brazil retail** (CVM regulation — retail access would require BR securities registration).
- **OFAC-sanctioned jurisdictions** (Iran, North Korea, Cuba, Syria, Russia-occupied Ukraine).

Brazilian QIs interact only indirectly via AmFi/Nimofast issuers (they never touch the Agama retail frontend).

## Retention

KYC attestation on-chain is a minimal boolean (`verified / blocked`). Personal data (ID scans, addresses) stays with Sumsub, retained per LGPD (Brazilian GDPR-equivalent) requirements. No PII is written on-chain.
