# Introduction

Agama is a synthetic dollar protocol backed by real-world private credit and bonds. Depositors put in USDC and come out with either targeted exposure to a specific real-world credit pool, or a diversified, yield-bearing dollar that spreads across the whole book automatically.

Every position is a deposit: the risk you take on is the real-world performance of the pools you're exposed to.

## Components

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 16 }}>
  {[
    { title: 'Lending Pools', href: '/lending-pools/overview', desc: 'Pool A, Pool B (private credit) and Pool C (bonds). Deposit USDC directly for targeted exposure to one pool.' },
    { title: 'agUSD', href: '/agusd/overview', desc: 'Synthetic dollar minted 1:1 against USDC. Backing auto-allocates across every active Lending Pool.' },
    { title: 'sagUSD', href: '/sagusd/overview', desc: 'Stake agUSD to receive sagUSD, a yield-bearing token that accrues value as the pools earn.' },
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

See [Overview](/overview) for the full architecture and [How it works](/how-it-works) for a walk-through of both entry points.

## Getting started

- **Depositors**: read [How it works](/how-it-works), then decide between a direct pool deposit or minting agUSD.
- **Yield seekers**: mint agUSD, then stake it for [sagUSD](/sagusd/overview) to compound the blended pool yield.
- **Everyone**: read [Risks](/risks) before depositing, because real-world credit and bond exposure carries risks that don't exist in purely on-chain systems.
