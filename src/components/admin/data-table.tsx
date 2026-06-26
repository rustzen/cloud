'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** When provided, the column is sortable by this value. */
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: 'left' | 'right';
};

export type ExportSpec<T> = {
  filename: string;
  columns: { header: string; value: (row: T) => string | number }[];
};

type Density = 'comfortable' | 'compact';

/**
 * Client-side data table with search, column sort, pagination, optional density
 * toggle and CSV export. Columns and renderers are defined in a client parent
 * (functions must not cross the server/client boundary).
 */
export function DataTable<T>({
  columns,
  rows,
  search,
  pageSize = 10,
  emptyMessage,
  getRowId,
  exportSpec,
  densityToggle = true,
}: {
  columns: Column<T>[];
  rows: T[];
  search?: { placeholder: string; text: (row: T) => string };
  pageSize?: number;
  emptyMessage: string;
  getRowId: (row: T) => string;
  exportSpec?: ExportSpec<T>;
  densityToggle?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [density, setDensity] = useState<Density>('comfortable');

  const filtered = useMemo(() => {
    if (!query.trim() || !search) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => search.text(r).toLowerCase().includes(q));
  }, [rows, query, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const paged = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortValue) return;
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function exportCsv() {
    if (!exportSpec) return;
    const esc = (value: unknown) => {
      const s = String(value ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [exportSpec.columns.map((c) => esc(c.header)).join(',')];
    for (const row of rows) {
      lines.push(exportSpec.columns.map((c) => esc(c.value(row))).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportSpec.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const hasToolbar = search || exportSpec || densityToggle;

  return (
    <div>
      {hasToolbar ? (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {search ? (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={search.placeholder}
                className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          ) : null}
          {search ? <span className="text-xs text-muted-foreground">{filtered.length} / {rows.length}</span> : null}

          <div className="ml-auto flex items-center gap-2">
            {densityToggle ? (
              <div className="inline-flex overflow-hidden rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setDensity('comfortable')}
                  className={cn('px-2.5 py-1.5 transition-colors', density === 'comfortable' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent')}
                >
                  Cozy
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  className={cn('border-l border-border px-2.5 py-1.5 transition-colors', density === 'compact' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent')}
                >
                  Compact
                </button>
              </div>
            ) : null}
            {exportSpec ? (
              <Button variant="outline" size="sm" type="button" onClick={exportCsv}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(c.sortValue && 'cursor-pointer select-none', c.align === 'right' && 'text-right', c.className)}
                  onClick={() => toggleSort(c.key)}
                >
                  <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                    {c.header}
                    {c.sortValue ? (
                      sortKey === c.key ? (
                        sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )
                    ) : null}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(c.align === 'right' && 'text-right', c.className, density === 'compact' && 'py-1.5')}
                    >
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {safePage + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
