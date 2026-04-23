'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { findBreadcrumbs } from '@/lib/navigation';
import { usePathname } from 'next/navigation';

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = findBreadcrumbs(pathname);
  if (crumbs.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[13px] text-fg-muted mb-4">
      <Link href="/docs" className="hover:text-fg transition-colors">
        Docs
      </Link>
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-fg-dim flex-shrink-0" />
          {c.href && i < crumbs.length - 1 ? (
            <Link href={c.href} className="hover:text-fg transition-colors">
              {c.title}
            </Link>
          ) : (
            <span className="text-fg">{c.title}</span>
          )}
        </span>
      ))}
    </div>
  );
}
