'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SearchIcon, XIcon } from './icons/SectionIcons';
import type { SearchEntry } from '@/lib/content';

interface Match {
  entry: SearchEntry;
  score: number;
  snippet: string;
  matchedHeading?: { id: string; text: string };
}

function buildSnippet(body: string, q: string): string {
  const idx = body.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return body.slice(0, 140) + (body.length > 140 ? '…' : '');
  const radius = 70;
  const start = Math.max(0, idx - radius);
  const end = Math.min(body.length, idx + q.length + radius);
  let s = body.slice(start, end);
  if (start > 0) s = '…' + s;
  if (end < body.length) s += '…';
  return s;
}

function scoreEntry(e: SearchEntry, qLower: string): Match | null {
  const titleLower = e.title.toLowerCase();
  const bodyLower = e.body.toLowerCase();
  const titleHit = titleLower.includes(qLower);
  const bodyIdx = bodyLower.indexOf(qLower);
  const matchedHeading = e.headings.find((h) => h.text.toLowerCase().includes(qLower));

  let score = 0;
  if (titleHit) score += 100;
  if (matchedHeading) score += 30;
  if (bodyIdx >= 0) score += 10;
  if (score === 0) return null;

  return {
    entry: e,
    score,
    snippet: buildSnippet(e.body, qLower),
    matchedHeading,
  };
}

export function SearchDialog({
  open,
  onClose,
  index,
}: {
  open: boolean;
  onClose: () => void;
  index: SearchEntry[];
}) {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useMemo<Match[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const matches: Match[] = [];
    for (const entry of index) {
      const m = scoreEntry(entry, query);
      if (m) matches.push(m);
    }
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 20);
  }, [q, index]);

  useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, Math.max(0, results.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === 'Enter') {
        const m = results[cursor];
        if (m) {
          const href = m.matchedHeading
            ? `${m.entry.href}#${m.matchedHeading.id}`
            : m.entry.href;
          router.push(href);
          onClose();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, cursor, onClose, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-xl overflow-hidden flex flex-col"
        style={{
          background: '#0D2B28',
          border: '1px solid rgba(230, 254, 244, 0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          maxHeight: '70vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 h-14"
          style={{ borderBottom: '1px solid rgba(230, 254, 244, 0.08)' }}
        >
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documentation..."
            className="flex-1 bg-transparent outline-none text-base placeholder:text-[#9CA3AF] text-[#E6FEF4]"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#E6FEF4] transition-colors p-1 -mr-1"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar">
          {q.trim() === '' ? (
            <div className="px-4 py-10 text-center text-sm text-[#9CA3AF]">
              Start typing to search
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#9CA3AF]">
              No results for &ldquo;{q}&rdquo;
            </div>
          ) : (
            <ul className="py-2">
              {results.map((m, i) => {
                const href = m.matchedHeading
                  ? `${m.entry.href}#${m.matchedHeading.id}`
                  : m.entry.href;
                const active = i === cursor;
                return (
                  <li key={`${m.entry.href}-${m.matchedHeading?.id ?? ''}`}>
                    <Link
                      href={href}
                      onClick={onClose}
                      onMouseEnter={() => setCursor(i)}
                      className="block px-4 py-3 transition-colors"
                      style={{
                        background: active ? 'rgba(95, 181, 144, 0.08)' : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#E6FEF4] font-medium">{m.entry.title}</span>
                        {m.matchedHeading && (
                          <>
                            <span className="text-[#9CA3AF]">›</span>
                            <span className="text-[#5FB590]">{m.matchedHeading.text}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-[#9CA3AF] mt-1 line-clamp-2">
                        {m.snippet}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-4 px-4 h-10 text-[11px] text-[#9CA3AF]"
          style={{ borderTop: '1px solid rgba(230, 254, 244, 0.08)' }}
        >
          <div className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
          </div>
          {results.length > 0 && <span>{results.length} result{results.length === 1 ? '' : 's'}</span>}
        </div>
      </div>
    </div>
  );
}
