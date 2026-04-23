export interface NavLink {
  title: string;
  href: string;
}

export interface NavChildGroup {
  title: string;
  items: NavLink[];
}

export type NavChild = NavLink | NavChildGroup;

export interface NavSection {
  title: string;
  icon: 'home' | 'cube' | 'code' | 'help' | 'shield';
  items: NavChild[];
}

export const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    icon: 'home',
    items: [
      { title: 'Introduction', href: '/docs/overview/introduction' },
      { title: 'Why Agama', href: '/docs/overview/why-agama' },
      { title: 'The three actors', href: '/docs/overview/actors' },
      { title: 'Glossary', href: '/docs/overview/glossary' },
    ],
  },
  {
    title: 'Protocol',
    icon: 'cube',
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
          { title: 'AmFi', href: '/docs/core/adapters/amfi' },
          { title: 'Nimofast', href: '/docs/core/adapters/nimofast' },
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
      { title: 'Parameters', href: '/docs/parameters' },
    ],
  },
  {
    title: 'Developers',
    icon: 'code',
    items: [
      { title: 'API', href: '/docs/integrate/api' },
    ],
  },
  {
    title: 'Reference',
    icon: 'help',
    items: [
      { title: 'FAQ', href: '/docs/reference/faq' },
    ],
  },
];

export function flatten(): NavLink[] {
  const out: NavLink[] = [];
  for (const section of navigation) {
    for (const it of section.items) {
      if ('href' in it) out.push(it);
      else for (const sub of it.items) out.push(sub);
    }
  }
  return out;
}

export function findPageInfo(pathname: string): {
  section?: NavSection;
  group?: NavChildGroup;
  current?: NavLink;
} {
  for (const section of navigation) {
    for (const it of section.items) {
      if ('href' in it && it.href === pathname) {
        return { section, current: it };
      }
      if ('items' in it) {
        for (const sub of it.items) {
          if (sub.href === pathname) {
            return { section, group: it, current: sub };
          }
        }
      }
    }
  }
  return {};
}

export function prevNext(pathname: string): { prev: NavLink | null; next: NavLink | null } {
  const flat = flatten();
  const idx = flat.findIndex((x) => x.href === pathname);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

/** Derive breadcrumb slug from pathname, RAVA-style (shows last segment). */
export function breadcrumbSlug(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'home';
}
