'use client';

import Link from 'next/link';
import { Github, Search } from 'lucide-react';

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto h-14 px-4 sm:px-6 flex items-center gap-4">
        <Link href="/docs" className="flex items-center gap-2 font-medium flex-shrink-0">
          <span
            aria-hidden
            className="inline-block w-5 h-5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #26E994 0%, #1bb477 100%)',
            }}
          />
          <span className="text-fg">Agama</span>
          <span className="text-fg-muted text-sm hidden sm:inline">Documentation</span>
        </Link>

        <nav className="ml-6 hidden md:flex items-center gap-6 text-sm text-fg-muted">
          <a href="https://agama.fi" target="_blank" rel="noreferrer" className="hover:text-fg transition-colors">
            Home
          </a>
          <Link href="/docs" className="text-brand transition-colors">
            Docs
          </Link>
          <a href="https://github.com/agamafinance" target="_blank" rel="noreferrer" className="hover:text-fg transition-colors">
            GitHub
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="hidden md:flex items-center gap-2 h-9 px-3 text-xs text-fg-muted bg-bg-input border border-line rounded-md hover:border-line-soft transition-colors w-64"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search documentation…</span>
            <kbd className="ml-auto font-mono text-[10px] px-1.5 py-0.5 bg-bg-raised border border-line rounded">⌘K</kbd>
          </button>
          <a
            href="https://github.com/agamafinance/agama-docs-looping"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-fg-muted hover:text-fg transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
