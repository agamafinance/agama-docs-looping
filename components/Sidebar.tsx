'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { navigation, NavItem } from '@/lib/navigation';
import clsx from 'clsx';

function isInside(item: NavItem, pathname: string): boolean {
  if (item.href === pathname) return true;
  if (item.items) return item.items.some((c) => isInside(c, pathname));
  return false;
}

function NavLeaf({ item, pathname, depth }: { item: NavItem; pathname: string; depth: number }) {
  const active = item.href === pathname;
  return (
    <Link
      href={item.href!}
      className={clsx(
        'block py-1.5 text-[13px] leading-relaxed transition-colors pr-2',
        depth === 0 ? 'font-medium' : '',
        active ? 'text-brand' : 'text-fg-muted hover:text-fg',
      )}
      style={{ paddingLeft: depth * 12 + 8 }}
      data-active={active}
    >
      {item.title}
    </Link>
  );
}

function NavGroup({ item, pathname, depth }: { item: NavItem; pathname: string; depth: number }) {
  const containsActive = isInside(item, pathname);
  const [open, setOpen] = useState(containsActive || depth === 0);

  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={clsx(
          'w-full flex items-center gap-1.5 py-1.5 text-[13px] transition-colors text-left pr-2',
          depth === 0 ? 'font-medium text-fg' : 'text-fg-muted hover:text-fg',
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
        )}
        <span>{item.title}</span>
      </button>
      {open && (
        <div className="space-y-0">
          {item.items!.map((child, i) => (
            <NavEntry key={i} item={child} pathname={pathname} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavEntry({ item, pathname, depth }: { item: NavItem; pathname: string; depth: number }) {
  if (item.items && item.items.length > 0) {
    return <NavGroup item={item} pathname={pathname} depth={depth} />;
  }
  return <NavLeaf item={item} pathname={pathname} depth={depth} />;
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-line">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto custom-scrollbar py-6 pr-2">
        <nav className="space-y-1">
          {navigation.map((item, i) => (
            <NavEntry key={i} item={item} pathname={pathname} depth={0} />
          ))}
        </nav>

        <div className="mt-10 px-2 pt-6 border-t border-line text-[11px] text-fg-dim space-y-2">
          <p>
            Inherited from{' '}
            <a href="https://docs.raac.io" target="_blank" rel="noreferrer" className="text-fg-muted hover:text-brand">
              RAAC
            </a>
            .
          </p>
          <p>V1 spec · testnet June 2026</p>
        </div>
      </div>
    </aside>
  );
}
