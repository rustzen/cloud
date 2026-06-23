import { NextRequest, NextResponse } from 'next/server';
import { publicRuntimeError } from '@/lib/error-message';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get('product');
  const platform = searchParams.get('platform') ?? 'macos';

  if (!product) {
    return NextResponse.json({ error: 'Missing product' }, { status: 400 });
  }

  let version;
  try {
    version = await prisma.appVersion.findFirst({
      where: {
        platform,
        product: { code: product },
      },
      orderBy: { publishedAt: 'desc' },
      include: { product: true },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'database_unavailable',
        detail: publicRuntimeError(error),
      },
      { status: 503 },
    );
  }

  if (!version) {
    return NextResponse.json({ product, platform, version: null });
  }

  return NextResponse.json({
    product: version.product.code,
    platform: version.platform,
    version: version.version,
    download_url: version.downloadUrl,
    notes: version.notes,
    published_at: version.publishedAt,
  });
}
