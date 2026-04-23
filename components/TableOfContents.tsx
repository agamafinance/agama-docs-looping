'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { TocEntry } from '@/lib/content';

export function TableOfContents({ toc }: { toc: TocEntry[] }) {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined' || toc.length === 0) return;
    const ids = toc.map((t) => t.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((x): x is HTMLElement => x !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the topmost
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  return (
    <aside className="hidden xl:block w-60 flex-shrink-0">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto custom-scrollbar py-6 pl-4 pr-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-fg-dim mb-3">
          On this page
        </div>
        <nav className="space-y-1 text-[13px]">
          {toc.map((entry) => (
            <a
              key={entry.id}
              href={`#${entry.id}`}
              className={clsx(
                'block py-1 transition-colors leading-snug',
                entry.depth === 3 && 'pl-3',
                active === entry.id ? 'text-brand' : 'text-fg-muted hover:text-fg',
              )}
            >
              {entry.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
