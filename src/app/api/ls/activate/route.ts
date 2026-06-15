import { NextRequest, NextResponse } from 'next/server';
import { callLicenseServer } from '@/lib/license-server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await callLicenseServer('/licenses/activate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return NextResponse.json(result.data, { status: result.ok ? 200 : result.status });
}
