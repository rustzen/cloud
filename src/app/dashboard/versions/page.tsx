import { redirect } from 'next/navigation';
import { hasAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function publishVersion(formData: FormData) {
  'use server';

  if (!(await hasAdminSession())) redirect('/login');

  const productCode = String(formData.get('product') ?? '');
  const version = String(formData.get('version') ?? '');
  const platform = String(formData.get('platform') ?? 'macos');
  const downloadUrl = String(formData.get('downloadUrl') ?? '');
  const notes = String(formData.get('notes') ?? '');

  const product = await prisma.product.findUnique({ where: { code: productCode } });
  if (!product) throw new Error('Product not found');

  await prisma.appVersion.upsert({
    where: {
      productId_version_platform: {
        productId: product.id,
        version,
        platform,
      },
    },
    update: {
      downloadUrl: downloadUrl || null,
      notes: notes || null,
      publishedAt: new Date(),
    },
    create: {
      productId: product.id,
      version,
      platform,
      downloadUrl: downloadUrl || null,
      notes: notes || null,
    },
  });

  redirect('/dashboard/versions');
}

export default async function VersionsPage() {
  if (!(await hasAdminSession())) redirect('/login');

  const [products, versions] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.appVersion.findMany({
      include: { product: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">Versions</h1>
          </div>
          <a className="text-sm font-medium text-sky-700" href="/dashboard">Back to dashboard</a>
        </div>

        <form action={publishVersion} className="mb-8 grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <select name="product" className="rounded-xl border border-gray-300 px-3 py-2 text-sm" required>
            {products.map((product) => (
              <option key={product.id} value={product.code}>{product.name}</option>
            ))}
          </select>
          <input name="version" className="rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="Version, e.g. 1.0.0" required />
          <input name="platform" defaultValue="macos" className="rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="Platform" />
          <input name="downloadUrl" className="rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="Download URL" />
          <textarea name="notes" className="rounded-xl border border-gray-300 px-3 py-2 text-sm md:col-span-2" placeholder="Release notes" rows={4} />
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:col-span-2" type="submit">Publish version</button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {versions.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.product.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.version}</td>
                  <td className="px-4 py-3">{item.platform}</td>
                  <td className="px-4 py-3">{item.publishedAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3">{item.downloadUrl ? <a className="text-sky-700" href={item.downloadUrl}>Open</a> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
