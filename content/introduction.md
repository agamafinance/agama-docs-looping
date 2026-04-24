# Core V1 Introduction

Core V1 is the foundational release of the Agama Protocol. It establishes the on-chain infrastructure for collateralized lending against Brazilian RWA tokens.

## Key differences vs RAAC

| Item                          | RAAC                                | Agama V1                                           |
|-------------------------------|-------------------------------------|----------------------------------------------------|
| Reserve stablecoin            | crvUSD                              | USDXP (fiat-backed, institutional)                  |
| Collateral                    | Real estate NFTs + iREET            | AmFi/Nimofast ERC-20 RWA tokens                     |
| On-chain swap for liquidation | Curve (crvUSD pairs)                | **None** (no DEX on Rayls for RWA yet)              |
| Liquidation settlement        | Instant via `LiquidationSwap`       | Off-chain issuer redemption (D+15)                  |
| iREET / RWA Index Token       | Yes                                 | **No** (V1 does not tokenize the basket)            |
| `borrowWithInsurance()`       | Yes                                 | **No** in V1 (deferred to V2)                       |
| `repayOnBehalf()`             | Yes                                 | **No** in V1                                         |
| VRF / NFT redemption          | Yes                                 | Not applicable                                      |
| Oracle for reserve asset      | crvUSD oracle with circuit breaker  | Trusted 1:1 (no USDXP oracle on Rayls yet)          |
| Insurance pathway             | Premium-paid by borrower            | Removed from V1                                      |

!!! note

    Agama's core primitives — Lending Pool, Stability Pool, Asset Adapter interface, scaled-index accounting, siloed positions — are ported **verbatim** from RAAC. The differences above are all either simplifications or adaptations for Brazilian RWA specifics.

## Components

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 16 }}>
  {[
    { title: 'Lending Pool', href: '/core/lending-pool/overview', desc: 'The main market: USDXP deposits, agTOKEN receipts, borrows against RWA collateral.' },
    { title: 'Stability Pool', href: '/core/stability-pool/overview', desc: 'Liquidation backstop. Accepts agTOKEN, issues agaSP 1:1. Manager-gated.' },
    { title: 'Settlement Vault', href: '/core/settlement-vault/overview', desc: "Agama's unique adaptation: holds seized RWA, queues off-chain redemption, auto-reconstitutes SP." },
    { title: 'Adapters', href: '/core/adapters/interface', desc: 'Per-asset logic: custody, oracle, QI whitelist. AmFi, Nimofast, future issuers.' },
    { title: 'Tokens', href: '/core/tokens/agtoken', desc: 'agTOKEN, DebtToken, agaSP, USDXP.' },
    { title: 'Compliance', href: '/core/compliance/kyc-registry', desc: 'Two-tier KYC: Sumsub for retail, issuer QI whitelist for borrowers.' },
    { title: 'Collectors', href: '/core/collectors/fee-collector', desc: 'Fee Collector · Treasury · Reserve Fund.' },
    { title: 'Governance', href: '/core/governance', desc: 'Multisig + 48h timelock. No DAO token in V1.' },
  ].map((c) => (
    <a
      key={c.href}
      href={c.href}
      style={{
        display: 'block',
        padding: '1rem 1.15rem',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.title} <span style={{ color: '#f59e0b' }}>→</span></div>
      <div style={{ fontSize: '0.88rem', color: '#9ca3af', lineHeight: 1.5 }}>{c.desc}</div>
    </a>
  ))}
</div>

## Getting started

- **Developers**: read the [Architecture](/docs/architecture) page, then each component overview, then the corresponding Functions reference.
- **Integrators** building a new adapter: see the [Asset Adapter Interface](/docs/adapters/interface).
