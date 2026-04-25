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
      { title: 'Overview', href: '/docs/overview' },
      { title: 'How It Works', href: '/docs/how-it-works' },
    ],
  },
  {
    title: 'Protocol',
    icon: 'cube',
    items: [
      { title: 'Introduction', href: '/docs/introduction' },
      {
        title: 'Lending Pool',
        items: [
          { title: 'Overview', href: '/docs/lending-pool/overview' },
          { title: 'Functions', href: '/docs/lending-pool/functions' },
          { title: 'Interest Rate Model', href: '/docs/lending-pool/interest-rate-model' },
          { title: 'Asset Adapter Interface', href: '/docs/lending-pool/adapter-interface' },
        ],
      },
      {
        title: 'Stability Pool',
        items: [
          { title: 'Overview', href: '/docs/stability-pool/overview' },
          { title: 'Functions', href: '/docs/stability-pool/functions' },
          { title: 'Liquidations', href: '/docs/stability-pool/liquidations' },
        ],
      },
      {
        title: 'Settlement Vault',
        items: [
          { title: 'Overview', href: '/docs/settlement-vault/overview' },
          { title: 'Functions', href: '/docs/settlement-vault/functions' },
        ],
      },
      {
        title: 'Collectors',
        items: [
          { title: 'Fee Collector', href: '/docs/collectors/fee-collector' },
          { title: 'Treasury', href: '/docs/collectors/treasury' },
          { title: 'Reserve Fund', href: '/docs/collectors/reserve-fund' },
        ],
      },
    ],
  },
  {
    title: 'Developers',
    icon: 'code',
    items: [
      { title: 'API', href: '/docs/api' },
    ],
  },
  {
    title: 'Reference',
    icon: 'help',
    items: [
      { title: 'FAQ', href: '/docs/faq' },
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

/** Derive breadcrumb slug from pathname (shows last segment). */
export function breadcrumbSlug(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'home';
}
