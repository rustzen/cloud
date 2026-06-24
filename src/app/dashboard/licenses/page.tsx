import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import type { Prisma, Product } from '@prisma/client';
import { Ban, KeyRound, MonitorSmartphone, Unlink } from 'lucide-react';
import { LicenseCreateDialog } from '@/components/admin/license-create-dialog';
import { AdminSection, AdminShell, StatCard } from '@/components/admin/admin-shell';
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
import { publicRuntimeError } from '@/lib/error-message';
import { prisma } from '@/lib/prisma';

type LicenseRow = Prisma.LicenseGetPayload<{
  include: { product: true; devices: true };
}>;

type LicenseData = {
  products: Product[];
  licenses: LicenseRow[];
  loadError: string | null;
};

async function createLicense(formData: FormData) {
  'use server';

  await assertAdminRequestAllowed();
  if (!(await hasAdminSession())) redirect('/login');

  const productCode = String(formData.get('product') ?? '');
  const plan = String(formData.get('plan') ?? 'pro');
  const maxDevices = Number(formData.get('maxDevices') ?? 3);
  const expiresAtValue = String(formData.get('expiresAt') ?? '');

  const product = await prisma.product.findUnique({ where: { code: productCode } });
  if (!product) throw new Error('Product not found');

  await prisma.license.create({
    data: {
      productId: product.id,
      licenseKey: `RZ-${randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase()}`,
      plan,
      maxDevices: Number.isFinite(maxDevices) ? maxDevices : 3,
      expiresAt: expiresAtValue ? new Date(expiresAtValue) : null,
    },
  });

  redirect('/dashboard/licenses');
}

async function revokeLicense(formData: FormData) {
  'use server';

  await assertAdminRequestAllowed();
  if (!(await hasAdminSession())) redirect('/login');

  const id = String(formData.get('id') ?? '');
  await prisma.license.update({ where: { id }, data: { status: 'REVOKED' } });
  redirect('/dashboard/licenses');
}

async function unbindDevice(formData: FormData) {
  'use server';

  await assertAdminRequestAllowed();
  if (!(await hasAdminSession())) redirect('/login');

  const deviceId = String(formData.get('deviceId') ?? '');
  if (deviceId) {
    await prisma.licenseDevice.delete({ where: { id: deviceId } });
  }

  redirect('/dashboard/licenses');
}

function formatDate(value: Date | null | undefined) {
  if (!value) return '-';
  return value.toISOString().slice(0, 10);
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return '-';
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

function statusVariant(status: string) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'EXPIRED') return 'warning';
  if (status === 'REVOKED') return 'destructive';
  return 'muted';
}

async function loadLicenseData(): Promise<LicenseData> {
  try {
    const [products, licenses] = await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.license.findMany({
        orderBy: { createdAt: 'desc' },
        include: { product: true, devices: { orderBy: { lastSeenAt: 'desc' } } },
      }),
    ]);

    return { products, licenses, loadError: null };
  } catch (error) {
    return { products: [], licenses: [], loadError: publicRuntimeError(error) };
  }
}

export default async function LicensesPage() {
  await assertAdminRequestAllowed();
  if (!(await hasAdminSession())) redirect('/login');

  const { products, licenses, loadError } = await loadLicenseData();

  const devices = licenses.flatMap((license) =>
    license.devices.map((device) => ({
      ...device,
      licenseKey: license.licenseKey,
      licenseStatus: license.status,
      productName: license.product.name,
      maxDevices: license.maxDevices,
      boundDevices: license.devices.length,
    })),
  );

  const activeLicenses = licenses.filter((license) => license.status === 'ACTIVE').length;
  const totalCapacity = licenses.reduce((sum, license) => sum + license.maxDevices, 0);

  return (
    <AdminShell
      active="licenses"
      title="Licenses and devices"
      description="Create license keys, inspect bound devices, enforce device limits, and revoke access from one operational view."
    >
      <div className="space-y-6">
        {loadError ? (
          <Alert className="border-destructive/30 bg-red-50 text-red-900">
            <AlertTitle>Database read failed</AlertTitle>
            <AlertDescription className="text-red-800">
              {loadError}
              <span className="mt-2 block">
                Check production PostgreSQL env values and whether the Prisma schema has been applied.
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Licenses" value={licenses.length} description="All stored records" icon={<KeyRound className="h-4 w-4" />} />
          <StatCard title="Active" value={activeLicenses} description="Keys allowed to activate" icon={<KeyRound className="h-4 w-4" />} />
          <StatCard title="Devices" value={devices.length} description="Currently bound clients" icon={<MonitorSmartphone className="h-4 w-4" />} />
          <StatCard title="Capacity" value={`${devices.length}/${totalCapacity}`} description="Bound devices vs total limit" icon={<MonitorSmartphone className="h-4 w-4" />} />
        </div>

        <div className="flex items-center justify-end">
          <LicenseCreateDialog
            products={products.map((product) => ({ code: product.code, name: product.name }))}
            createLicense={createLicense}
          />
        </div>

        <AdminSection title="License list" description="All license records with key, customer, order, product, device usage, and status.">
          <div className="overflow-x-auto">
            <Table className="min-w-[1360px]">
              <TableHeader>
                <TableRow>
                  <TableHead>License key</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-8 text-center text-muted-foreground" colSpan={11}>
                      No licenses found. Create a license or sync billing orders to populate this table.
                    </TableCell>
                  </TableRow>
                ) : (
                  licenses.map((license) => (
                    <TableRow key={license.id}>
                      <TableCell>
                        <code className="block max-w-[280px] break-all font-mono text-xs">{license.licenseKey}</code>
                      </TableCell>
                      <TableCell>{license.product.name}</TableCell>
                      <TableCell>{license.plan}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(license.status)}>{license.status}</Badge>
                      </TableCell>
                      <TableCell>{license.customerEmail ?? '-'}</TableCell>
                      <TableCell>{license.provider ?? '-'}</TableCell>
                      <TableCell>
                        <code className="block max-w-[180px] truncate font-mono text-xs" title={license.providerOrderId ?? undefined}>
                          {license.providerOrderId ?? '-'}
                        </code>
                      </TableCell>
                      <TableCell>{license.devices.length}/{license.maxDevices}</TableCell>
                      <TableCell>{formatDate(license.expiresAt)}</TableCell>
                      <TableCell>{formatDateTime(license.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {license.status !== 'REVOKED' ? (
                          <form action={revokeLicense}>
                            <input type="hidden" name="id" value={license.id} />
                            <Button variant="outline" size="sm" type="submit">
                              <Ban className="h-4 w-4" />
                              Revoke
                            </Button>
                          </form>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </AdminSection>

        <AdminSection title="Device list" description="All activated clients currently bound to license keys.">
          <div className="overflow-x-auto">
            <Table className="min-w-[1280px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>License key</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-8 text-center text-muted-foreground" colSpan={10}>
                      No activated devices found. Device rows appear after desktop clients activate a license.
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>{device.deviceName || '-'}</TableCell>
                      <TableCell>
                        <code className="block max-w-[240px] break-all font-mono text-xs">{device.deviceId}</code>
                      </TableCell>
                      <TableCell>
                        <code className="block max-w-[260px] break-all font-mono text-xs">{device.licenseKey}</code>
                      </TableCell>
                      <TableCell>{device.productName}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(device.licenseStatus)}>{device.licenseStatus}</Badge>
                      </TableCell>
                      <TableCell>{device.boundDevices}/{device.maxDevices}</TableCell>
                      <TableCell>{device.appVersion || '-'}</TableCell>
                      <TableCell>{formatDateTime(device.activatedAt)}</TableCell>
                      <TableCell>{formatDateTime(device.lastSeenAt)}</TableCell>
                      <TableCell className="text-right">
                        <form action={unbindDevice}>
                          <input type="hidden" name="deviceId" value={device.id} />
                          <Button variant="outline" size="sm" type="submit">
                            <Unlink className="h-4 w-4" />
                            Unbind
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}
