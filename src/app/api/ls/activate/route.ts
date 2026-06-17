import { NextRequest, NextResponse } from 'next/server';
import { callLicenseServer } from '@/lib/license-server';
import { readJsonBody } from '@/lib/license-api';

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const result = await callLicenseServer('/licenses/activate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return NextResponse.json(result.data, { status: result.ok ? 200 : result.status });
}
