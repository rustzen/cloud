import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import type { Prisma, Product } from '@prisma/client';
import { KeyRound, MonitorSmartphone } from 'lucide-react';
import { LicenseCreateDialog } from '@/components/admin/license-create-dialog';
import { AdminSection, AdminShell, StatCard } from '@/components/admin/admin-shell';
import { DevicesTable, type DeviceRowDTO } from '@/components/admin/devices-table';
import { LicensesTable, type LicenseRowDTO } from '@/components/admin/licenses-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

function iso(value: Date | null) {
  return value ? value.toISOString() : '';
}

function fmtDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : '-';
}

function fmtDateTime(value: Date | null) {
  return value ? value.toISOString().replace('T', ' ').slice(0, 16) : '-';
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

  const licenseRows: LicenseRowDTO[] = licenses.map((license) => ({
    id: license.id,
    key: license.licenseKey,
    product: license.product.name,
    plan: license.plan,
    status: license.status,
    customer: license.customerEmail ?? '-',
    provider: license.provider ?? '-',
    order: license.providerOrderId ?? '-',
    usage: `${license.devices.length}/${license.maxDevices}`,
    expires: fmtDate(license.expiresAt),
    expiresSort: iso(license.expiresAt),
    created: fmtDateTime(license.createdAt),
    createdSort: iso(license.createdAt),
  }));

  const deviceRows: DeviceRowDTO[] = licenses.flatMap((license) =>
    license.devices.map((device) => ({
      id: device.id,
      deviceId: device.deviceId,
      deviceName: device.deviceName || '-',
      licenseKey: license.licenseKey,
      productName: license.product.name,
      status: license.status,
      usage: `${license.devices.length}/${license.maxDevices}`,
      appVersion: device.appVersion || '-',
      activated: fmtDateTime(device.activatedAt),
      activatedSort: iso(device.activatedAt),
      lastSeen: fmtDateTime(device.lastSeenAt),
      lastSeenSort: iso(device.lastSeenAt),
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
          <Alert className="border-danger/25 bg-danger/5 text-danger">
            <AlertTitle>Database read failed</AlertTitle>
            <AlertDescription className="text-danger/80">
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
          <StatCard title="Devices" value={deviceRows.length} description="Currently bound clients" icon={<MonitorSmartphone className="h-4 w-4" />} />
          <StatCard title="Capacity" value={`${deviceRows.length}/${totalCapacity}`} description="Bound devices vs total limit" icon={<MonitorSmartphone className="h-4 w-4" />} />
        </div>

        <div className="flex items-center justify-end">
          <LicenseCreateDialog
            products={products.map((product) => ({ code: product.code, name: product.name }))}
            createLicense={createLicense}
          />
        </div>

        <AdminSection title="License list" description="All license records with key, customer, order, product, device usage, and status. Search, sort, and paginate inline.">
          <LicensesTable rows={licenseRows} revokeAction={revokeLicense} />
        </AdminSection>

        <AdminSection title="Device list" description="All activated clients currently bound to license keys.">
          <DevicesTable rows={deviceRows} unbindAction={unbindDevice} />
        </AdminSection>
      </div>
    </AdminShell>
  );
}
