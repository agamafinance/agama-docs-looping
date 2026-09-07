# Introduction

Agama is a synthetic dollar protocol backed by real-world private credit and bonds, built natively on Stellar as Soroban contracts. Depositors put in USDC, receive agUSD, and stake it for sagUSD, the position that earns. A Curator deploys the capital into vetted credit vaults, and the contracts decide what the Curator is allowed to do.

There is one entry point and one asset: USDC into the Vault. The risk you take is the real-world performance of the credit book behind it.

## Components

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 16 }}>
  {[
    { title: 'Credit Vaults', href: '/credit-vaults/overview', desc: 'Six live on testnet, curated with Qiro and Tenka. Each is an independent Soroban contract with its own share token.' },
    { title: 'agUSD', href: '/agusd/overview', desc: 'Synthetic dollar, SEP-41, minted 1:1 against USDC. Mint and burn restricted to the Vault, no transfer restriction on holders.' },
    { title: 'sagUSD', href: '/sagusd/overview', desc: 'Staked agUSD. Share-based, DeFindex-compatible. Yield raises the exchange rate, so no claim step and no rebase.' },
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

Behind those three sits the [Allocation Engine](/stellar/contracts#allocation-engine), which routes Vault capital into the credit vaults and enforces the concentration caps and the minimum idle USDC reserve floor on every call.

See [Overview](/overview) for the architecture in one picture and [How It Works](/how-it-works) for the full path from cash to a yield-bearing position and back out.

## Getting started

- **Depositors**: read [How It Works](/how-it-works), then deposit USDC for agUSD.
- **Yield seekers**: stake agUSD for [sagUSD](/sagusd/overview). agUSD on its own does not earn.
- **Reviewers and integrators**: [Soroban Contracts](/stellar/contracts) for the function-level view, [Deployments](/stellar/deployments) for the addresses.
- **Everyone**: read [Risks](/risks) before depositing. Real-world credit exposure carries risks that do not exist in purely on-chain systems, and the withdrawal queue is not instant.
