export interface NavItem {
  title: string;
  href?: string;
  items?: NavItem[];
}

export const navigation: NavItem[] = [
  { title: 'Home', href: '/docs' },
  {
    title: 'Overview',
    items: [
      { title: 'Introduction', href: '/docs/overview/introduction' },
      { title: 'Why Agama', href: '/docs/overview/why-agama' },
      { title: 'The three actors', href: '/docs/overview/actors' },
      { title: 'Glossary', href: '/docs/overview/glossary' },
    ],
  },
  {
    title: 'Core V1',
    items: [
      { title: 'Introduction', href: '/docs/core/introduction' },
      { title: 'Architecture', href: '/docs/core/architecture' },
      {
        title: 'Lending Pool',
        items: [
          { title: 'Overview', href: '/docs/core/lending-pool/overview' },
          { title: 'Functions', href: '/docs/core/lending-pool/functions' },
          { title: 'Interest Rate Model', href: '/docs/core/lending-pool/interest-rate-model' },
        ],
      },
      { title: 'Asset Adapter Interface', href: '/docs/core/adapters/interface' },
      {
        title: 'Stability Pool',
        items: [
          { title: 'Overview', href: '/docs/core/stability-pool/overview' },
          { title: 'Functions', href: '/docs/core/stability-pool/functions' },
          { title: 'Liquidations', href: '/docs/core/stability-pool/liquidations' },
        ],
      },
      {
        title: 'Settlement Vault',
        items: [
          { title: 'Overview', href: '/docs/core/settlement-vault/overview' },
          { title: 'Functions', href: '/docs/core/settlement-vault/functions' },
        ],
      },
      {
        title: 'Adapters',
        items: [
          { title: 'AmFi Adapter', href: '/docs/core/adapters/amfi' },
          { title: 'Nimofast Adapter', href: '/docs/core/adapters/nimofast' },
        ],
      },
      {
        title: 'Tokens',
        items: [
          { title: 'agTOKEN', href: '/docs/core/tokens/agtoken' },
          { title: 'DebtToken', href: '/docs/core/tokens/debt-token' },
          { title: 'agaSP', href: '/docs/core/tokens/agasp' },
          { title: 'USDXP', href: '/docs/core/tokens/usdxp' },
        ],
      },
      {
        title: 'Compliance',
        items: [
          { title: 'KYC Registry', href: '/docs/core/compliance/kyc-registry' },
          { title: 'Qualified Investors', href: '/docs/core/compliance/qualified-investors' },
        ],
      },
      {
        title: 'Collectors',
        items: [
          { title: 'Fee Collector', href: '/docs/core/collectors/fee-collector' },
          { title: 'Treasury', href: '/docs/core/collectors/treasury' },
          { title: 'Reserve Fund', href: '/docs/core/collectors/reserve-fund' },
        ],
      },
      { title: 'Governance', href: '/docs/core/governance' },
      {
        title: 'Appendix',
        items: [
          { title: 'RAAC Mapping', href: '/docs/core/appendix/raac-mapping' },
          { title: 'Error Catalog', href: '/docs/core/appendix/errors' },
        ],
      },
    ],
  },
  { title: 'Parameters', href: '/docs/parameters' },
  { title: 'Design Review', href: '/docs/challenges' },
  {
    title: 'Security',
    items: [
      { title: 'Overview', href: '/docs/security/overview' },
      { title: 'Invariants', href: '/docs/security/invariants' },
      { title: 'Threat Model', href: '/docs/security/threat-model' },
      { title: 'Audits', href: '/docs/security/audits' },
      { title: 'Bug Bounty', href: '/docs/security/bug-bounty' },
      { title: 'Incident Response', href: '/docs/security/incident-response' },
    ],
  },
  {
    title: 'Integrate',
    items: [
      { title: 'For Issuers', href: '/docs/integrate/for-issuers' },
      { title: 'For Developers', href: '/docs/integrate/for-developers' },
      { title: 'For Institutions', href: '/docs/integrate/for-institutions' },
    ],
  },
];

// Flat list for prev/next and lookup
export function flatten(items: NavItem[] = navigation, out: NavItem[] = []): NavItem[] {
  for (const it of items) {
    if (it.href) out.push(it);
    if (it.items) flatten(it.items, out);
  }
  return out;
}

export function findBreadcrumbs(pathname: string): { title: string; href?: string }[] {
  const crumbs: { title: string; href?: string }[] = [];
  function walk(items: NavItem[], trail: { title: string; href?: string }[]): boolean {
    for (const it of items) {
      const nextTrail = [...trail, { title: it.title, href: it.href }];
      if (it.href === pathname) {
        crumbs.push(...nextTrail);
        return true;
      }
      if (it.items && walk(it.items, nextTrail)) return true;
    }
    return false;
  }
  walk(navigation, []);
  return crumbs;
}

export function prevNext(pathname: string) {
  const flat = flatten();
  const idx = flat.findIndex((x) => x.href === pathname);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}
