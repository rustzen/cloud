import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity,
  Boxes,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Rocket,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { destroyAdminSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

type AdminNavKey = 'overview' | 'licenses' | 'versions';

type AdminShellProps = {
  active: AdminNavKey;
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
};

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
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

export function AdminShell({ active, title, description, badge = 'Production admin', children }: AdminShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-border bg-sidebar text-sidebar-foreground lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b border-sidebar-border px-6 py-5">
              <Link className="flex items-center gap-3" href="/dashboard">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                  R
                </span>
                <span>
                  <span className="block text-sm font-semibold">RustZen Cloud</span>
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
                      'flex items-start gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
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
            <div className="flex min-h-16 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{badge}</Badge>
                  <Badge variant="secondary">Next.js API</Badge>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
                <span className="hidden items-center gap-2 sm:inline-flex">
                  <Server className="h-4 w-4" />
                  rustzen-cloud.vercel.app
                </span>
                <form action={logout}>
                  <Button variant="outline" size="sm" type="submit">
                    <LogOut className="h-4 w-4" />
                    Sign out
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

          <div className="mx-auto w-full max-w-[1440px] px-5 py-6 lg:px-8 lg:py-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardDescription className="text-xs font-medium uppercase tracking-wide">{title}</CardDescription>
          <CardTitle className="mt-3 text-3xl">{value}</CardTitle>
        </div>
        {icon ? <div className="rounded-md border border-border bg-muted p-2 text-muted-foreground">{icon}</div> : null}
      </CardHeader>
      {description ? <CardContent className="pt-0 text-sm text-muted-foreground">{description}</CardContent> : null}
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
