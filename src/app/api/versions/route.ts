import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get('product');
  const platform = searchParams.get('platform') ?? 'macos';

  if (!product) {
    return NextResponse.json({ error: 'Missing product' }, { status: 400 });
  }

  const version = await prisma.appVersion.findFirst({
    where: {
      platform,
      product: { code: product },
    },
    orderBy: { publishedAt: 'desc' },
    include: { product: true },
  });

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
