'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { prevNext } from '@/lib/navigation';

export function PrevNext() {
  const pathname = usePathname();
  const { prev, next } = prevNext(pathname);
  if (!prev && !next) return null;

  return (
    <div className="mt-16 pt-8" style={{ borderTop: '1px solid rgba(230, 254, 244, 0.06)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          {prev && (
            <Link
              href={prev.href}
              className="group block p-5 rounded-lg transition-colors"
              style={{ border: '1px solid rgba(230, 254, 244, 0.06)' }}
            >
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#9CA3AF] mb-2">
                ← PREVIOUS
              </div>
              <div className="text-[#E6FEF4] font-semibold group-hover:text-[#FFFFFF] transition-colors">
                {prev.title}
              </div>
            </Link>
          )}
        </div>
        <div>
          {next && (
            <Link
              href={next.href}
              className="group block p-5 rounded-lg transition-colors text-right"
              style={{ border: '1px solid rgba(230, 254, 244, 0.06)' }}
            >
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#9CA3AF] mb-2">
                NEXT →
              </div>
              <div className="text-[#E6FEF4] font-semibold group-hover:text-[#FFFFFF] transition-colors">
                {next.title}
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
