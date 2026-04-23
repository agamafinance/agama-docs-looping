'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';
import { navigation, NavSection, NavChild, NavChildGroup } from '@/lib/navigation';
import {
  HomeIcon,
  CubeIcon,
  CodeIcon,
  HelpIcon,
  ShieldIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
  GithubIcon,
  ExternalLinkIcon,
  MenuIcon,
  ChevronLeftIcon,
} from './icons/SectionIcons';

const iconMap = {
  home: HomeIcon,
  cube: CubeIcon,
  code: CodeIcon,
  help: HelpIcon,
  shield: ShieldIcon,
};

function LogoBlock() {
  return (
    <Link href="/docs" className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/agama-logo-beige.svg"
        alt="Agama"
        className="h-8 w-auto select-none"
        draggable={false}
      />
    </Link>
  );
}

function SearchButton() {
  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 h-[46px] px-3 rounded-lg text-base leading-none text-[#9BA9B6] transition-colors hover:text-[#E9EDF2] cursor-text"
      style={{
        background: 'rgba(233,237,242,0.03)',
        border: '1px solid rgba(233,237,242,0.06)',
      }}
      aria-label="Search documentation"
    >
      <SearchIcon />
      <span style={{ opacity: 0.5 }}>Search...</span>
      <kbd
        className="ml-auto text-xs leading-none px-[5px] py-1 rounded"
        style={{
          background: 'rgba(233,237,242,0.06)',
          color: '#9BA9B6',
          border: '1px solid rgba(233,237,242,0.08)',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        ⌘K
      </kbd>
    </button>
  );
}

function NavLinkItem({ title, href, active }: { title: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        'block px-2 py-[6px] text-base transition-colors duration-200',
        active ? 'text-[#26E994]' : 'text-[#9BA9B6] hover:text-[#E9EDF2]',
      )}
    >
      {title}
    </Link>
  );
}

function SubGroup({ group, pathname }: { group: NavChildGroup; pathname: string }) {
  const containsActive = group.items.some((it) => it.href === pathname);
  const [open, setOpen] = useState(containsActive);

  const ChevronIcon = open ? ChevronDownIcon : ChevronRightIcon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-2 py-[6px] text-base text-[#9BA9B6] hover:text-[#E9EDF2] transition-colors duration-200 text-left"
        aria-expanded={open}
      >
        <ChevronIcon className="w-3 h-3 flex-shrink-0 opacity-70" />
        <span>{group.title}</span>
      </button>
      {open && (
        <div className="pl-4">
          {group.items.map((item) => (
            <NavLinkItem
              key={item.href}
              title={item.title}
              href={item.href}
              active={item.href === pathname}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavChildElement({ child, pathname }: { child: NavChild; pathname: string }) {
  if ('href' in child) {
    return <NavLinkItem title={child.title} href={child.href} active={child.href === pathname} />;
  }
  return <SubGroup group={child} pathname={pathname} />;
}

function Section({ section, pathname }: { section: NavSection; pathname: string }) {
  const Icon = iconMap[section.icon] || HomeIcon;
  return (
    <div className="mb-6 last:mb-2">
      <div className="flex items-center gap-2.5 px-2 mb-2">
        <span className="text-[#9BA9B6]">
          <Icon />
        </span>
        <h4 className="text-base font-medium select-none text-[#E9EDF2]">{section.title}</h4>
      </div>
      <div className="pl-[34px]">
        {section.items.map((it, i) => (
          <NavChildElement key={i} child={it} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(233,237,242,0.06)' }}>
      <div className="flex items-center gap-3">
        <a
          href="https://x.com/agamafi"
          target="_blank"
          rel="noreferrer"
          className="text-[#9BA9B6] hover:text-[#26E994] transition-colors"
          aria-label="X (Twitter)"
        >
          <XIcon />
        </a>
        <a
          href="https://github.com/agamafinance"
          target="_blank"
          rel="noreferrer"
          className="text-[#9BA9B6] hover:text-[#26E994] transition-colors"
          aria-label="GitHub"
        >
          <GithubIcon />
        </a>
        <a
          href="https://agama.fi"
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-base text-[#9BA9B6] hover:text-[#26E994] transition-colors"
        >
          Agama Labs
          <ExternalLinkIcon className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-5 left-5 z-50 flex items-center gap-2 h-10 px-4 backdrop-blur-md text-[#9BA9B6] hover:text-[#E9EDF2] transition-all rounded-full"
        style={{
          background: 'rgba(10, 17, 20, 0.85)',
          border: '1px solid rgba(233,237,242,0.06)',
        }}
      >
        <MenuIcon />
        <span className="text-base">Docs</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40',
          'w-[85vw] max-w-[296px] sm:w-[296px] flex flex-col h-screen',
          'transform transition-transform duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)]',
          'lg:sticky lg:top-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        )}
        style={{
          background: 'lab(13.0536% -10.7839 -5.5266)',
          borderRight: '1px solid rgba(233,237,242,0.06)',
        }}
      >
        <div
          className="px-6 pt-[18px] pb-4"
          style={{ borderBottom: '1px solid rgba(233,237,242,0.06)' }}
        >
          <div className="mb-1.5 -ml-[4px]">
            <LogoBlock />
          </div>
          <SearchButton />
        </div>
        <nav className="flex-1 px-4 py-4 overflow-y-auto custom-scrollbar">
          {navigation.map((section, i) => (
            <Section key={i} section={section} pathname={pathname} />
          ))}
        </nav>
        <SidebarFooter />
      </aside>
    </>
  );
}
