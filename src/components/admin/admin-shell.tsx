import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity,
  Boxes,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommandPalette } from '@/components/admin/command-palette';
import { ThemeToggle } from '@/components/admin/theme-toggle';
import { ToasterProvider } from '@/components/admin/toaster';
import { destroyAdminSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

type AdminNavKey = 'overview' | 'licenses' | 'versions';

type AdminShellProps = {
  active: AdminNavKey;
  title: string;
  description: string;
  children: React.ReactNode;
};

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: number[];
};

const navItems = [
  {
    key: 'overview',
    href: '/dashboard',
    label: 'Overview',
    description: 'Products and API surface',
    icon: LayoutDashboard,
  },
  {
    key: 'licenses',
    href: '/dashboard/licenses',
    label: 'Licenses',
    description: 'Keys, devices, limits',
    icon: KeyRound,
  },
  {
    key: 'versions',
    href: '/dashboard/versions',
    label: 'Versions',
    description: 'Release metadata',
    icon: Rocket,
  },
] satisfies Array<{
  key: AdminNavKey;
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}>;

async function logout() {
  'use server';

  await destroyAdminSession();
  redirect('/login');
}

export function AdminShell({ active, title, description, children }: AdminShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start">
          <div className="flex h-full flex-col">
            <div className="border-b border-sidebar-border px-6 py-5">
              <Link className="flex items-center gap-3" href="/dashboard">
                <span className="rz-cloud-mark">R</span>
                <span>
                  <span className="block text-sm font-semibold">Rustzen Cloud</span>
                  <span className="block text-xs text-sidebar-foreground/58">Admin control plane</span>
                </span>
              </Link>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === active;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      'relative flex items-start gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary'
                        : 'text-sidebar-foreground/72 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block font-medium">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-current/58">{item.description}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-sidebar-border p-4">
              <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Admin only
                </div>
                <p className="mt-2 text-xs leading-5 text-sidebar-foreground/62">
                  Manage licensing and release metadata. Client private data stays local.
                </p>
              </div>
              <form action={logout} className="mt-3">
                <Button
                  className="w-full justify-start border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
                  variant="outline"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-border bg-background/94 backdrop-blur">
            <div className="flex min-h-14 items-center justify-between gap-4 px-5 py-3 lg:px-8">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-xl font-semibold tracking-normal">{title}</h1>
                </div>
                <p className="mt-0.5 hidden max-w-4xl truncate text-xs text-muted-foreground xl:block">{description}</p>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 text-xs text-muted-foreground">
                <CommandPalette />
                <ThemeToggle />
                <form action={logout}>
                  <Button variant="outline" size="sm" type="submit">
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign out</span>
                  </Button>
                </form>
              </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === active;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      'inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium',
                      isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <div className="mx-auto w-full max-w-[1440px] px-5 py-6 lg:px-8 lg:py-8">
            <ToasterProvider>{children}</ToasterProvider>
          </div>
        </section>
      </div>
    </main>
  );
}

export function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardDescription className="text-xs font-medium uppercase tracking-wide">{title}</CardDescription>
          <CardTitle className="mt-3 text-3xl">{value}</CardTitle>
        </div>
        {icon ? <div className="rounded-lg bg-brand-100 p-2 text-brand-600">{icon}</div> : null}
      </CardHeader>
      {description || (trend && trend.length > 1) ? (
        <CardContent className="pt-0">
          {trend && trend.length > 1 ? <Sparkline values={trend} className="mb-2 h-8 w-full" /> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const width = 100;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map(
    (v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`,
  );
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="rz-spark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand-600)" />
          <stop offset="100%" stopColor="var(--brand-400)" />
        </linearGradient>
      </defs>
      <path
        d={`M ${points.join(' L ')}`}
        fill="none"
        stroke="url(#rz-spark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`rz-skeleton rounded-md ${className ?? ''}`} />;
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

export function AdminSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
      <Boxes className="h-5 w-5 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function AdminHealthLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Activity className="h-4 w-4 shrink-0" />
        {label}
      </span>
      <code className="min-w-0 truncate text-right text-xs font-medium text-foreground">{value}</code>
    </div>
  );
}
