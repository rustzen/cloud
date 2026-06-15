import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import { hasAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function createLicense(formData: FormData) {
  'use server';

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

  if (!(await hasAdminSession())) redirect('/login');

  const id = String(formData.get('id') ?? '');
  await prisma.license.update({ where: { id }, data: { status: 'REVOKED' } });
  redirect('/dashboard/licenses');
}

async function unbindDevice(formData: FormData) {
  'use server';

  if (!(await hasAdminSession())) redirect('/login');

  const deviceId = String(formData.get('deviceId') ?? '');
  if (deviceId) {
    await prisma.licenseDevice.delete({ where: { id: deviceId } });
  }

  redirect('/dashboard/licenses');
}

export default async function LicensesPage() {
  if (!(await hasAdminSession())) redirect('/login');

  const [products, licenses] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.license.findMany({
      orderBy: { createdAt: 'desc' },
      include: { product: true, devices: { orderBy: { lastSeenAt: 'desc' } } },
      take: 50,
    }),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">Licenses</h1>
          </div>
          <a className="text-sm font-medium text-sky-700" href="/dashboard">Back to dashboard</a>
        </div>

        <form action={createLicense} className="mb-8 grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-5">
          <select name="product" className="rounded-xl border border-gray-300 px-3 py-2 text-sm" required>
            {products.map((product) => (
              <option key={product.id} value={product.code}>{product.name}</option>
            ))}
          </select>
          <input name="plan" defaultValue="pro" className="rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="Plan" />
          <input name="maxDevices" defaultValue="3" type="number" min="1" className="rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="Max devices" />
          <input name="expiresAt" type="datetime-local" className="rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">Create license</button>
        </form>

        <div className="space-y-4">
          {licenses.map((license) => (
            <section key={license.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="grid gap-4 border-b border-gray-100 p-5 text-sm md:grid-cols-7">
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">License</p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-950">{license.licenseKey}</p>
                </div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Product</p><p className="mt-1">{license.product.name}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Plan</p><p className="mt-1">{license.plan}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Status</p><p className="mt-1">{license.status}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Devices</p><p className="mt-1">{license.devices.length}/{license.maxDevices}</p></div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Action</p>
                  {license.status !== 'REVOKED' ? (
                    <form action={revokeLicense} className="mt-1">
                      <input type="hidden" name="id" value={license.id} />
                      <button className="text-red-600" type="submit">Revoke</button>
                    </form>
                  ) : <p className="mt-1 text-gray-400">-</p>}
                </div>
              </div>

              <div className="p-5">
                <h2 className="text-sm font-semibold text-gray-950">Bound devices</h2>
                {license.devices.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">No devices activated yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="py-2 pr-4">Device</th>
                          <th className="py-2 pr-4">Device ID</th>
                          <th className="py-2 pr-4">App Version</th>
                          <th className="py-2 pr-4">Activated</th>
                          <th className="py-2 pr-4">Last Seen</th>
                          <th className="py-2 pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {license.devices.map((device) => (
                          <tr key={device.id}>
                            <td className="py-3 pr-4">{device.deviceName || '-'}</td>
                            <td className="py-3 pr-4 font-mono text-xs">{device.deviceId}</td>
                            <td className="py-3 pr-4">{device.appVersion || '-'}</td>
                            <td className="py-3 pr-4">{device.activatedAt.toISOString().slice(0, 10)}</td>
                            <td className="py-3 pr-4">{device.lastSeenAt.toISOString().slice(0, 10)}</td>
                            <td className="py-3 pr-4">
                              <form action={unbindDevice}>
                                <input type="hidden" name="deviceId" value={device.id} />
                                <button className="text-red-600" type="submit">Unbind</button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
