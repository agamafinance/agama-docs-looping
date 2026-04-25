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
      { title: 'Overview', href: '/overview' },
      { title: 'How It Works', href: '/how-it-works' },
    ],
  },
  {
    title: 'Protocol',
    icon: 'cube',
    items: [
      { title: 'Introduction', href: '/introduction' },
      {
        title: 'Lending Pool',
        items: [
          { title: 'Overview', href: '/lending-pool/overview' },
          { title: 'Functions', href: '/lending-pool/functions' },
          { title: 'Interest Rate Model', href: '/lending-pool/interest-rate-model' },
          { title: 'Asset Adapter Interface', href: '/lending-pool/adapter-interface' },
        ],
      },
      {
        title: 'Stability Pool',
        items: [
          { title: 'Overview', href: '/stability-pool/overview' },
          { title: 'Functions', href: '/stability-pool/functions' },
          { title: 'Liquidations', href: '/stability-pool/liquidations' },
        ],
      },
      {
        title: 'Settlement Vault',
        items: [
          { title: 'Overview', href: '/settlement-vault/overview' },
          { title: 'Functions', href: '/settlement-vault/functions' },
        ],
      },
      {
        title: 'Collectors',
        items: [
          { title: 'Fee Collector', href: '/collectors/fee-collector' },
          { title: 'Treasury', href: '/collectors/treasury' },
          { title: 'Reserve Fund', href: '/collectors/reserve-fund' },
        ],
      },
    ],
  },
  {
    title: 'Developers',
    icon: 'code',
    items: [
      { title: 'API', href: '/api' },
    ],
  },
  {
    title: 'Reference',
    icon: 'help',
    items: [
      { title: 'FAQ', href: '/faq' },
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
