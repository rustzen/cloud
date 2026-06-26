'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { KeyRound, LayoutDashboard, Rocket, Search } from 'lucide-react';

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
};

const commands: Command[] = [
  { id: 'overview', label: 'Overview', hint: 'Products and API surface', icon: <LayoutDashboard className="h-4 w-4" />, href: '/dashboard' },
  { id: 'licenses', label: 'Licenses', hint: 'Keys, devices, limits', icon: <KeyRound className="h-4 w-4" />, href: '/dashboard/licenses' },
  { id: 'versions', label: 'Versions', hint: 'Release metadata', icon: <Rocket className="h-4 w-4" />, href: '/dashboard/versions' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((o) => !o);
      }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.hint ?? ''}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search</span>
        <kbd className="ml-1 hidden rounded border border-border bg-muted px-1.5 text-[10px] font-medium md:inline">⌘K</kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="max-h-80 overflow-auto p-2">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">No results</li>
              ) : (
                filtered.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={c.href}
                      onClick={() => {
                        setOpen(false);
                        setQuery('');
                      }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="text-muted-foreground">{c.icon}</span>
                      <span className="font-medium">{c.label}</span>
                      {c.hint ? <span className="ml-auto text-xs text-muted-foreground">{c.hint}</span> : null}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
