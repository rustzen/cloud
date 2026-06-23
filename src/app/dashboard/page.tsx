import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Activity, ExternalLink, KeyRound, MonitorSmartphone, Package, Rocket } from 'lucide-react';
import {
  AdminEmptyState,
  AdminHealthLine,
  AdminSection,
  AdminShell,
  StatCard,
} from '@/components/admin/admin-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { assertAdminRequestAllowed } from '@/lib/admin-security';
import { hasAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type DashboardProduct = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  _count: {
    licenses: number;
    versions: number;
  };
};

type DashboardData = {
  products: DashboardProduct[];
  licenseCount: number;
  activeLicenseCount: number;
  deviceCount: number;
  versionCount: number;
  billingEventCount: number;
  loadError: string | null;
};

const apiEndpoints = [
  ['POST', '/api/licenses/activate', 'Activate a local client license.'],
  ['GET', '/api/licenses/verify', 'Verify key and device entitlement.'],
  ['POST', '/api/licenses/refresh', 'Refresh local license state.'],
  ['POST', '/api/licenses/deactivate', 'Deactivate a bound device.'],
  ['GET', '/api/licenses/health', 'Check Prisma-backed license API health.'],
  ['GET', '/api/versions?product=rustzen-clear', 'Read release metadata.'],
  ['POST', '/api/webhooks/lemonsqueezy', 'Consume billing webhooks.'],
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown database error';
}

async function getRequestOrigin() {
  const store = await headers();
  const forwardedHost = store.get('x-forwarded-host');
  const host = forwardedHost ?? store.get('host');

  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'Not configured';
  }

  const protocol = store.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

async function loadDashboardData(): Promise<DashboardData> {
  try {
    const [products, licenseCount, activeLicenseCount, deviceCount, versionCount, billingEventCount] = await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { licenses: true, versions: true } } },
      }),
      prisma.license.count(),
      prisma.license.count({ where: { status: 'ACTIVE' } }),
      prisma.licenseDevice.count(),
      prisma.appVersion.count(),
      prisma.billingEvent.count(),
    ]);

    return {
      products,
      licenseCount,
      activeLicenseCount,
      deviceCount,
      versionCount,
      billingEventCount,
      loadError: null,
    };
  } catch (error) {
    return {
      products: [],
      licenseCount: 0,
      activeLicenseCount: 0,
      deviceCount: 0,
      versionCount: 0,
      billingEventCount: 0,
      loadError: errorMessage(error),
    };
  }
}

export default async function DashboardPage() {
  await assertAdminRequestAllowed();

  if (!(await hasAdminSession())) {
    redirect('/login');
  }

  const origin = await getRequestOrigin();
  const data = await loadDashboardData();

  return (
    <AdminShell
      active="overview"
      title="Operations overview"
      description="Monitor RustZen products, license coverage, device bindings, release metadata, and cloud API entrypoints."
    >
      <div className="space-y-6">
        {data.loadError ? (
          <Alert className="border-destructive/30 bg-red-50 text-red-900">
            <AlertTitle>Database read failed</AlertTitle>
            <AlertDescription className="text-red-800">{data.loadError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Licenses"
            value={data.licenseCount}
            description={`${data.activeLicenseCount} active keys`}
            icon={<KeyRound className="h-4 w-4" />}
          />
          <StatCard
            title="Devices"
            value={data.deviceCount}
            description="Bound macOS clients"
            icon={<MonitorSmartphone className="h-4 w-4" />}
          />
          <StatCard
            title="Versions"
            value={data.versionCount}
            description="Published update records"
            icon={<Rocket className="h-4 w-4" />}
          />
          <StatCard
            title="Billing events"
            value={data.billingEventCount}
            description="Webhook events retained"
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <AdminSection
            title="Products"
            description="Configured RustZen clients and their operational coverage."
          >
            {data.products.length === 0 ? (
              <AdminEmptyState
                title="No products available"
                description="Seed or create products before issuing licenses and release metadata."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Licenses</TableHead>
                      <TableHead>Versions</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                          <div className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                            {product.description ?? 'No description configured.'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded-md bg-muted px-2 py-1 text-xs">{product.code}</code>
                        </TableCell>
                        <TableCell>{product._count.licenses}</TableCell>
                        <TableCell>{product._count.versions}</TableCell>
                        <TableCell className="text-right">
                          <Link href="/dashboard/licenses">
                            <Button variant="outline" size="sm" type="button">
                              <KeyRound className="h-4 w-4" />
                              Manage
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </AdminSection>

          <AdminSection title="Runtime" description="Current request origin and public service routes.">
            <div className="space-y-3">
              <AdminHealthLine label="API base URL" value={origin} />
              <Link href="/api/licenses/health" target="_blank">
                <Button variant="outline" className="w-full justify-between" type="button">
                  Check license API health
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </AdminSection>
        </div>

        <AdminSection title="API surface" description="Endpoints consumed by desktop clients and billing providers.">
          <div className="grid gap-2">
            {apiEndpoints.map(([method, path, description]) => (
              <div
                key={`${method}-${path}`}
                className="grid gap-3 rounded-md border border-border px-3 py-3 text-sm md:grid-cols-[84px_minmax(0,1fr)_1.2fr]"
              >
                <Badge variant={method === 'GET' ? 'secondary' : 'outline'}>{method}</Badge>
                <code className="min-w-0 truncate font-mono text-xs text-foreground">{path}</code>
                <span className="text-muted-foreground">{description}</span>
              </div>
            ))}
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}
