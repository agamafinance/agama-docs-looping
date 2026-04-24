'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRightIcon } from './icons/SectionIcons';
import { breadcrumbSlug } from '@/lib/navigation';

export function Breadcrumbs() {
  const pathname = usePathname();
  const slug = breadcrumbSlug(pathname);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base mb-6">
      <Link
        href="/docs"
        className="font-mono text-[#9CA3AF] hover:text-[#E6FEF4] transition-colors py-1 px-1 -mx-1 inline-block break-words"
      >
        Documentation
      </Link>
      <div className="flex items-center">
        <ChevronRightIcon
          className="w-4 h-4 mx-1 sm:mx-2 flex-shrink-0"
          // @ts-ignore -- pass color via style
        />
        <span className="font-mono text-[#14B87B] break-words">{slug}</span>
      </div>
    </div>
  );
}
