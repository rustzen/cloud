import { NextRequest, NextResponse } from 'next/server';
import { publicRuntimeError } from '@/lib/error-message';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  try {
    const products = await prisma.product.count();
    return NextResponse.json({
      ok: true,
      service: 'licenses',
      products,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: 'licenses',
        error: 'database_unavailable',
        detail: publicRuntimeError(error),
      },
      { status: 503 },
    );
  }
}
