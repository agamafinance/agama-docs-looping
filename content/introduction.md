# Introduction

Agama is a lending market built specifically for **tokenised real-world asset tranches**. Lenders deposit stable, borrowers post a tokenised credit tranche as collateral and draw stable against it, and a Stability Pool absorbs liquidations as the protocol's safety net.

## Current scope

| Item | Value |
|---|---|
| Reserve stablecoin | `USDr` (Rayls native, 1:1-backed) |
| Active markets | **6 RWA tranches** — Senior + Junior across 3 issuer pools |
| Issuers (today) | AmFi (Resolvi, Digcap, Sector Condo) |
| Network | Rayls testnet, chain id `7295799` |
| Frontend | [app.agama.finance](https://app.agama.finance) |
| Liquidation settlement | Off-chain issuer redemption (D+15 cycle) |

Each market has its own (token, oracle, adapter) triplet, its own LTV / liquidation threshold / liquidation bonus, and its own debt counter — but they all share the same USDr liquidity pool. See [Overview](/overview) for the full architecture and [How it works](/how-it-works) for a walk-through.

## The 6 markets

| Symbol | Issuer pool | Tranche | Max LTV | Liq. threshold | Liq. bonus |
|---|---|---|---:|---:|---:|
| **sRESOLV** | Resolvi | Senior | 75% | 85% | 3% |
| **jRESOLV** | Resolvi | Junior | 50% | 65% | 8% |
| **sDIGCAP** | Digcap | Senior | 75% | 85% | 3% |
| **jDIGCAP** | Digcap | Junior | 50% | 65% | 8% |
| **sCONDO** | Sector Condo | Senior | 75% | 85% | 3% |
| **jCONDO** | Sector Condo | Junior | 50% | 65% | 8% |

New markets ship by deploying an additional adapter — no Lending Pool redeploy.

## Components

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 16 }}>
  {[
    { title: 'Lending Pool', href: '/lending-pool/overview', desc: 'Single USDr pool. Mints agYLD on deposit. Routes borrow/repay through 6 per-tranche adapters with isolated debt accounting.' },
    { title: 'Stability Pool', href: '/stability-pool/overview', desc: 'ERC-4626 vault wrapping agYLD. Issues sagYLD. Absorbs liquidations at a discount. 7-day cooldown to unstake.' },
    { title: 'Settlement Vault', href: '/settlement-vault/overview', desc: 'Holds seized RWA, queues off-chain redemption, refills the Stability Pool with USDr proceeds.' },
    { title: 'Collectors', href: '/collectors/fee-collector', desc: 'Fee Collector · Treasury · Reserve Fund. Three-pool capital structure.' },
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

- **Lenders / borrowers**: head to [app.agama.finance](https://app.agama.finance), connect a wallet on Rayls testnet, and follow [How it works](/how-it-works).
- **Developers**: read each component overview, then the corresponding Functions reference. The [Asset Adapter Interface](/lending-pool/adapter-interface) covers the per-tranche extension points.
- **Integrators** building tooling on top of Agama: the per-market debt views (`DebtToken.balanceOf(user, adapter)` and `totalSupply(adapter)`) are the entry points for any analytics or risk dashboard.
