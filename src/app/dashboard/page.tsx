import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasAdminSession } from '@/lib/auth';

const modules = [
  { title: 'Products', href: '/dashboard', description: 'Manage RustZen Clear, RustZen Clipboard, and future native macOS clients.' },
  { title: 'Licenses', href: '/dashboard/licenses', description: 'Create, verify, revoke, and inspect local-client license keys.' },
  { title: 'Devices', href: '/dashboard/licenses', description: 'Review activated macOS devices and enforce device limits.' },
  { title: 'Versions', href: '/dashboard/versions', description: 'Publish release metadata consumed by desktop update checks.' },
  { title: 'Orders', href: '/dashboard/licenses', description: 'Sync payment provider orders without storing private local client data.' },
  { title: 'License API', href: '/api/licenses/health', description: 'Check local Prisma-backed licensing API health.' },
];

export default async function DashboardPage() {
  if (!(await hasAdminSession())) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-5">
          <div className="rz-cloud-logo">
            <span className="rz-cloud-mark">R</span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--rz-clipboard)]">
                RustZen Cloud
              </p>
              <h1 className="mt-2 text-4xl font-bold text-[var(--rz-ink)]">
                Client control plane
              </h1>
            </div>
          </div>
          <p className="max-w-3xl text-base leading-7 text-[var(--rz-muted)]">
            Manage licensing, activated devices, release metadata, and API health for the
            native RustZen Clear and RustZen Clipboard macOS clients. Local cleanup data and
            clipboard history stay on the user&apos;s Mac.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="rz-cloud-pill">Licensing</span>
            <span className="rz-cloud-pill">Versions</span>
            <span className="rz-cloud-pill">Device limits</span>
            <span className="rz-cloud-pill">No local data runtime</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.title} href={module.href} className="rz-cloud-panel p-6 transition hover:border-[var(--rz-clipboard)]">
              <h2 className="text-xl font-semibold text-[var(--rz-ink)]">{module.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--rz-muted)]">{module.description}</p>
            </Link>
          ))}
        </div>

        <div className="rz-cloud-panel mt-10 p-6">
          <h2 className="text-xl font-semibold text-[var(--rz-ink)]">API endpoints</h2>
          <div className="mt-4 grid gap-2 text-sm text-[var(--rz-muted)] md:grid-cols-2">
            <code>POST /api/licenses/activate</code>
            <code>GET /api/licenses/verify</code>
            <code>POST /api/licenses/refresh</code>
            <code>POST /api/licenses/deactivate</code>
            <code>GET /api/licenses/health</code>
            <code>GET /api/versions?product=rustzen-clear</code>
            <code>POST /api/webhooks/lemonsqueezy</code>
          </div>
        </div>
      </div>
    </main>
  );
}
