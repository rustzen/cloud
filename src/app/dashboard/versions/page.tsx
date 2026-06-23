import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { AppVersion, Prisma, Product } from '@prisma/client';
import { ExternalLink, Rocket, Upload } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { assertAdminRequestAllowed } from '@/lib/admin-security';
import { hasAdminSession } from '@/lib/auth';
import { publicRuntimeError } from '@/lib/error-message';
import { prisma } from '@/lib/prisma';

type VersionRow = Prisma.AppVersionGetPayload<{
  include: { product: true };
}>;

type VersionData = {
  products: Product[];
  versions: VersionRow[];
  loadError: string | null;
};

async function publishVersion(formData: FormData) {
  'use server';

  await assertAdminRequestAllowed();
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

function formatDate(value: Date | null | undefined) {
  if (!value) return '-';
  return value.toISOString().slice(0, 10);
}

async function loadVersionData(): Promise<VersionData> {
  try {
    const [products, versions] = await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.appVersion.findMany({
        include: { product: true },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      }),
    ]);

    return { products, versions, loadError: null };
  } catch (error) {
    return { products: [], versions: [], loadError: publicRuntimeError(error) };
  }
}

function latestVersion(versions: AppVersion[]) {
  return versions[0]?.version ?? '-';
}

export default async function VersionsPage() {
  await assertAdminRequestAllowed();
  if (!(await hasAdminSession())) redirect('/login');

  const { products, versions, loadError } = await loadVersionData();
  const productsWithVersions = new Set(versions.map((item) => item.productId)).size;

  return (
    <AdminShell
      active="versions"
      title="Release versions"
      description="Publish release metadata consumed by RustZen desktop update checks."
    >
      <div className="space-y-6">
        {loadError ? (
          <Alert className="border-destructive/30 bg-red-50 text-red-900">
            <AlertTitle>Database read failed</AlertTitle>
            <AlertDescription className="text-red-800">{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Published records" value={versions.length} description="Latest 50 releases" icon={<Rocket className="h-4 w-4" />} />
          <StatCard title="Products covered" value={`${productsWithVersions}/${products.length}`} description="Products with release metadata" icon={<Rocket className="h-4 w-4" />} />
          <StatCard title="Latest version" value={latestVersion(versions)} description="Most recently published row" icon={<Upload className="h-4 w-4" />} />
        </div>

        <AdminSection title="Publish version" description="Create or update release metadata for a product and platform.">
          <form action={publishVersion} className="grid gap-4 xl:grid-cols-2">
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
              <Label htmlFor="version">Version</Label>
              <Input id="version" name="version" placeholder="1.0.0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Input id="platform" name="platform" defaultValue="macos" placeholder="macos" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="downloadUrl">Download URL</Label>
              <Input id="downloadUrl" name="downloadUrl" placeholder="https://..." />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="notes">Release notes</Label>
              <Textarea id="notes" name="notes" placeholder="Fixes, compatibility notes, or rollout details." rows={4} />
            </div>
            <div className="xl:col-span-2">
              <Button type="submit" disabled={products.length === 0}>
                <Upload className="h-4 w-4" />
                Publish version
              </Button>
              {products.length === 0 ? (
                <p className="mt-3 text-sm text-destructive">No products available. Seed products before publishing versions.</p>
              ) : null}
            </div>
          </form>
        </AdminSection>

        <AdminSection title="Version list" description="Release records returned by the update metadata API.">
          {versions.length === 0 ? (
            <AdminEmptyState title="No versions found" description="Publish a version to make update metadata available to desktop clients." />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[940px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell>
                        <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{item.version}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.platform}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.publishedAt)}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">{item.notes || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.downloadUrl ? (
                          <Link href={item.downloadUrl} target="_blank">
                            <Button variant="outline" size="sm" type="button">
                              <ExternalLink className="h-4 w-4" />
                              Open
                            </Button>
                          </Link>
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
      </div>
    </AdminShell>
  );
}
