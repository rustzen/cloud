import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import type { Prisma, Product } from '@prisma/client';
import { Ban, KeyRound, MonitorSmartphone, Plus, Unlink } from 'lucide-react';
import { AdminEmptyState, AdminSection, AdminShell, StatCard } from '@/components/admin/admin-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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

function maskLicenseKey(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 7)}...${value.slice(-5)}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown database error';
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
        take: 100,
      }),
    ]);

    return { products, licenses, loadError: null };
  } catch (error) {
    return { products: [], licenses: [], loadError: errorMessage(error) };
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
          <StatCard title="Licenses" value={licenses.length} description="Latest 100 records" icon={<KeyRound className="h-4 w-4" />} />
          <StatCard title="Active" value={activeLicenses} description="Keys allowed to activate" icon={<KeyRound className="h-4 w-4" />} />
          <StatCard title="Devices" value={devices.length} description="Currently bound clients" icon={<MonitorSmartphone className="h-4 w-4" />} />
          <StatCard title="Capacity" value={`${devices.length}/${totalCapacity}`} description="Bound devices vs total limit" icon={<MonitorSmartphone className="h-4 w-4" />} />
        </div>

        <AdminSection title="Create license" description="Issue a manual key for an existing product.">
          <form action={createLicense} className="grid gap-4 xl:grid-cols-[1.2fr_0.75fr_0.75fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select id="product" name="product" required disabled={products.length === 0}>
                {products.map((product) => (
                  <option key={product.id} value={product.code}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Input id="plan" name="plan" defaultValue="pro" placeholder="pro" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDevices">Max devices</Label>
              <Input id="maxDevices" name="maxDevices" defaultValue="3" type="number" min="1" placeholder="3" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires</Label>
              <Input id="expiresAt" name="expiresAt" type="datetime-local" />
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit" disabled={products.length === 0}>
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </div>
          </form>
          {products.length === 0 ? (
            <p className="mt-3 text-sm text-destructive">No products available. Seed products before creating licenses.</p>
          ) : null}
        </AdminSection>

        <AdminSection title="License list" description="Keys, product ownership, device usage, and revocation state.">
          {licenses.length === 0 ? (
            <AdminEmptyState title="No licenses found" description="Create a license or sync billing orders to populate this table." />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((license) => (
                    <TableRow key={license.id}>
                      <TableCell>
                        <code className="font-mono text-xs" title={license.licenseKey}>
                          {maskLicenseKey(license.licenseKey)}
                        </code>
                      </TableCell>
                      <TableCell>{license.product.name}</TableCell>
                      <TableCell>{license.plan}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(license.status)}>{license.status}</Badge>
                      </TableCell>
                      <TableCell>{license.devices.length}/{license.maxDevices}</TableCell>
                      <TableCell>{formatDate(license.expiresAt)}</TableCell>
                      <TableCell>{formatDate(license.createdAt)}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </AdminSection>

        <AdminSection title="Device list" description="Activated clients currently bound to license keys.">
          {devices.length === 0 ? (
            <AdminEmptyState title="No activated devices found" description="Device rows appear after desktop clients activate a license." />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Device ID</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Activated</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>{device.deviceName || '-'}</TableCell>
                      <TableCell>
                        <code className="font-mono text-xs">{device.deviceId}</code>
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-xs" title={device.licenseKey}>
                          {maskLicenseKey(device.licenseKey)}
                        </code>
                      </TableCell>
                      <TableCell>{device.productName}</TableCell>
                      <TableCell>{device.appVersion || '-'}</TableCell>
                      <TableCell>{formatDate(device.activatedAt)}</TableCell>
                      <TableCell>{formatDate(device.lastSeenAt)}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </AdminSection>
      </div>
    </AdminShell>
  );
}
