'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { prevNext } from '@/lib/navigation';
import { usePathname } from 'next/navigation';

export function PrevNext() {
  const pathname = usePathname();
  const { prev, next } = prevNext(pathname);
  if (!prev && !next) return null;

  return (
    <div className="mt-16 pt-8 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        {prev && prev.href && (
          <Link
            href={prev.href}
            className="group block p-4 border border-line rounded-lg hover:border-line-soft transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-fg-dim mb-1">
              <ArrowLeft className="w-3 h-3" /> Previous
            </div>
            <div className="text-fg font-medium group-hover:text-brand transition-colors">{prev.title}</div>
          </Link>
        )}
      </div>
      <div>
        {next && next.href && (
          <Link
            href={next.href}
            className="group block p-4 border border-line rounded-lg hover:border-line-soft transition-colors text-right"
          >
            <div className="flex items-center justify-end gap-1.5 text-[11px] uppercase tracking-wider text-fg-dim mb-1">
              Next <ArrowRight className="w-3 h-3" />
            </div>
            <div className="text-fg font-medium group-hover:text-brand transition-colors">{next.title}</div>
          </Link>
        )}
      </div>
    </div>
  );
}
