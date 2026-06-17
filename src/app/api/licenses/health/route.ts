import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const products = await prisma.product.count();
    return NextResponse.json({
      ok: true,
      service: 'licenses',
      products,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown database error';
    return NextResponse.json(
      {
        ok: false,
        service: 'licenses',
        error: 'database_unavailable',
        detail: message,
      },
      { status: 503 },
    );
  }
}
