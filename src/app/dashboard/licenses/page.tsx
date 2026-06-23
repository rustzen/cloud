import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import type { Prisma, Product } from '@prisma/client';
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

const statusClassName: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  INACTIVE: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  EXPIRED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  REVOKED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

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
    <main className="min-h-screen bg-[var(--rz-page)] px-5 py-8 text-[var(--rz-ink)] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-[var(--rz-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--rz-clipboard)]">RustZen Cloud</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--rz-ink)]">Licenses and devices</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--rz-muted)]">
              Create license keys, inspect bound devices, and revoke access from one operational view.
            </p>
          </div>
          <a className="text-sm font-medium text-[var(--rz-clipboard)]" href="/dashboard">Back to dashboard</a>
        </div>

        {loadError ? (
          <section className="mb-6 rounded-lg border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-700">Database read failed</p>
            <p className="mt-2 text-sm leading-6 text-red-700">{loadError}</p>
            <p className="mt-2 text-sm text-red-700">
              Check production PostgreSQL env values and whether the Prisma schema has been applied.
            </p>
          </section>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--rz-border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--rz-muted)]">Licenses</p>
            <p className="mt-3 text-3xl font-semibold">{licenses.length}</p>
          </div>
          <div className="rounded-lg border border-[var(--rz-border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--rz-muted)]">Active</p>
            <p className="mt-3 text-3xl font-semibold">{activeLicenses}</p>
          </div>
          <div className="rounded-lg border border-[var(--rz-border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--rz-muted)]">Devices</p>
            <p className="mt-3 text-3xl font-semibold">{devices.length}</p>
          </div>
          <div className="rounded-lg border border-[var(--rz-border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--rz-muted)]">Capacity</p>
            <p className="mt-3 text-3xl font-semibold">{devices.length}/{totalCapacity}</p>
          </div>
        </div>

        <section className="mb-6 rounded-lg border border-[var(--rz-border)] bg-white p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Create license</h2>
              <p className="text-sm text-[var(--rz-muted)]">Issue a manual key for an existing product.</p>
            </div>
            {products.length === 0 ? <p className="text-sm text-red-700">No products available.</p> : null}
          </div>
          <form action={createLicense} className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr_auto]">
            <select name="product" className="h-11 rounded-md border border-[var(--rz-border)] bg-white px-3 text-sm" required disabled={products.length === 0}>
              {products.map((product) => (
                <option key={product.id} value={product.code}>{product.name}</option>
              ))}
            </select>
            <input name="plan" defaultValue="pro" className="h-11 rounded-md border border-[var(--rz-border)] px-3 text-sm" placeholder="Plan" />
            <input name="maxDevices" defaultValue="3" type="number" min="1" className="h-11 rounded-md border border-[var(--rz-border)] px-3 text-sm" placeholder="Max devices" />
            <input name="expiresAt" type="datetime-local" className="h-11 rounded-md border border-[var(--rz-border)] px-3 text-sm" />
            <button className="h-11 rounded-md bg-[var(--rz-ink)] px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={products.length === 0}>
              Create
            </button>
          </form>
        </section>

        <section className="mb-6 overflow-hidden rounded-lg border border-[var(--rz-border)] bg-white">
          <div className="border-b border-[var(--rz-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">License list</h2>
          </div>
          {licenses.length === 0 ? (
            <p className="p-5 text-sm text-[var(--rz-muted)]">No licenses found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-[var(--rz-border)] bg-gray-50 text-xs uppercase tracking-wide text-[var(--rz-muted)]">
                  <tr>
                    <th className="px-5 py-3">Key</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Devices</th>
                    <th className="px-5 py-3">Expires</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {licenses.map((license) => (
                    <tr key={license.id}>
                      <td className="px-5 py-4 font-mono text-xs" title={license.licenseKey}>{maskLicenseKey(license.licenseKey)}</td>
                      <td className="px-5 py-4">{license.product.name}</td>
                      <td className="px-5 py-4">{license.plan}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClassName[license.status] ?? statusClassName.INACTIVE}`}>
                          {license.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">{license.devices.length}/{license.maxDevices}</td>
                      <td className="px-5 py-4">{formatDate(license.expiresAt)}</td>
                      <td className="px-5 py-4">{formatDate(license.createdAt)}</td>
                      <td className="px-5 py-4">
                        {license.status !== 'REVOKED' ? (
                          <form action={revokeLicense}>
                            <input type="hidden" name="id" value={license.id} />
                            <button className="text-sm font-medium text-red-700" type="submit">Revoke</button>
                          </form>
                        ) : <span className="text-[var(--rz-muted)]">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-[var(--rz-border)] bg-white">
          <div className="border-b border-[var(--rz-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">Device list</h2>
          </div>
          {devices.length === 0 ? (
            <p className="p-5 text-sm text-[var(--rz-muted)]">No activated devices found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-[var(--rz-border)] bg-gray-50 text-xs uppercase tracking-wide text-[var(--rz-muted)]">
                  <tr>
                    <th className="px-5 py-3">Device</th>
                    <th className="px-5 py-3">Device ID</th>
                    <th className="px-5 py-3">License</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">App</th>
                    <th className="px-5 py-3">Activated</th>
                    <th className="px-5 py-3">Last seen</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {devices.map((device) => (
                    <tr key={device.id}>
                      <td className="px-5 py-4">{device.deviceName || '-'}</td>
                      <td className="px-5 py-4 font-mono text-xs">{device.deviceId}</td>
                      <td className="px-5 py-4 font-mono text-xs" title={device.licenseKey}>{maskLicenseKey(device.licenseKey)}</td>
                      <td className="px-5 py-4">{device.productName}</td>
                      <td className="px-5 py-4">{device.appVersion || '-'}</td>
                      <td className="px-5 py-4">{formatDate(device.activatedAt)}</td>
                      <td className="px-5 py-4">{formatDate(device.lastSeenAt)}</td>
                      <td className="px-5 py-4">
                        <form action={unbindDevice}>
                          <input type="hidden" name="deviceId" value={device.id} />
                          <button className="text-sm font-medium text-red-700" type="submit">Unbind</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
