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
        title: 'Lending Pools',
        items: [{ title: 'Overview', href: '/lending-pools/overview' }],
      },
      {
        title: 'agUSD',
        items: [{ title: 'Overview', href: '/agusd/overview' }],
      },
      {
        title: 'sagUSD',
        items: [{ title: 'Overview', href: '/sagusd/overview' }],
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
      { title: 'Risks', href: '/risks' },
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
