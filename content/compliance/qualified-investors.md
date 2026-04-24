# Qualified Investor Integration

Each RWA adapter consults the issuer's QI whitelist directly. Agama does **not** maintain a parallel QI registry.

## AmFi

- **Interface**: `IAmFiWhitelist(whitelist).isQualifiedInvestor(user)`.
- **Threshold**: ≥ R$ 200k/year gross income OR ≥ R$ 1M institutional holdings.
- **Verified by**: Sumsub at AmFi onboarding.
- **Adapter enforcement**: `AmFiAdapter.deposit()` and `AmFiAdapter.validate()` revert with `NotQualifiedInvestor()` if the whitelist returns false.

## Nimofast

- **Interface**: `INimofastWhitelist(whitelist).isQualifiedInvestor(user)`.
- **Threshold**: institutional investors only (V1 launch scope).
- **Verified by**: Nimofast's own onboarding process.
- **Adapter enforcement**: same pattern as AmFi.

## Why defer KYC to the issuer

1. **Single source of truth**: the issuer already ran KYC and has legal liability for it. Agama re-verifying would create inconsistency.
2. **No PII on Agama's stack**: Agama only needs the boolean "is this address a QI?", not the underlying identity.
3. **Regulatory alignment**: CVM sees the issuer's QI onboarding as the qualifying event for securities access, not Agama's.

## What happens if a user loses QI status mid-position

The adapter calls `isQualifiedInvestor(user)` on **every** deposit, withdraw, and validate. Loss of QI status will block new deposits and withdrawals. Existing positions can be:

- Fully repaid and closed normally (the LendingPool doesn't consult the adapter's whitelist on `repay()`).
- Liquidated through the standard flow if HF falls below threshold.

> **Note**: a loss-of-QI state while an active loan exists is an unusual edge case. V2 may introduce a grace period allowing the user to close positions voluntarily before blocking withdrawals.
