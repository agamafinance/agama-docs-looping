# Core V1 Introduction

Core V1 is the foundational release of the Agama Protocol. It establishes the on-chain infrastructure for collateralized lending against Brazilian RWA tokens.

## V1 scope

| Item                          | Agama V1                                           |
|-------------------------------|----------------------------------------------------|
| Reserve stablecoin            | USDXP (fiat-backed, institutional)                 |
| Collateral                    | AmFi/Nimofast ERC-20 RWA tokens                    |
| On-chain swap for liquidation | **None** (no DEX on Rayls for RWA yet)             |
| Liquidation settlement        | Off-chain issuer redemption (D+15)                 |
| RWA Index Token               | **Not in V1** (no tokenized basket)                |
| `borrowWithInsurance()`       | **Not in V1** (deferred to V2)                     |
| `repayOnBehalf()`             | **Not in V1**                                      |
| Oracle for reserve asset      | Trusted 1:1 (no USDXP oracle on Rayls yet)         |
| Insurance pathway             | Out of V1                                          |

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

- **Developers**: read each component overview, then the corresponding Functions reference.
- **Integrators** building a new adapter: see the [Asset Adapter Interface](/docs/lending-pool/adapter-interface).
