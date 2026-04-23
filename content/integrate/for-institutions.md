# For Institutions

Agama welcomes institutional integrations — treasury management on RWA, delegated collateral management, custodian-mediated access.

## Use cases

### Treasury diversification

Brazilian corporates with USDXP balances can earn competitive supply yield backed by real economic activity (Brazilian private credit + energy receivables) instead of generic stablecoin lending.

### Delegated QI access

A regulated intermediary (broker, wealth manager) holding QI positions on behalf of clients can use Agama to leverage those positions without client-level on-chain interaction. Intermediary holds the `agTOKEN` / `agaSP` and manages loops; client sees higher yield on their private-credit allocation.

### Structured products

Agama's `agTOKEN` and `agaSP` can be wrapped into structured products (e.g., fixed-rate notes, auto-roll vaults) by third-party issuers.

## Onboarding path

1. **Discovery call** — understand use case, regulatory constraints, expected volume.
2. **Compliance review** — map KYC/QI requirements both ways (institutional KYC → Agama KYC Light acceptance; any Agama-specific requirements for institutional contracts).
3. **Technical integration** — testnet deployment, API access, monitoring setup.
4. **Legal review** — counterparty agreements if needed (not required for standard on-chain interaction).
5. **Mainnet activation** — whitelisting if institutional address needs elevated limits.

## Custodian-compatible interfaces

- All Agama contracts are standard EVM — compatible with Fireblocks, Copper, BitGo, etc.
- `agTOKEN` is ERC-4626, enabling plug-in compatibility with vault aggregators.
- No proprietary SDK required.

## Elevated limits

V1 default `supplyCap` is 10M USDXP. Institutional users depositing ≥ 1M USDXP should coordinate with Agama ops to ensure capacity and to potentially be whitelisted for elevated per-address caps (if applicable — see [Design Review #3](../challenges.md#max-borrower-share)).

## Contact

`institutions@agama.fi` (or TBD channel).
