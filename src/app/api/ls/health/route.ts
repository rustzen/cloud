import { NextResponse } from 'next/server';
import { callLicenseServer } from '@/lib/license-server';

export async function GET() {
  const result = await callLicenseServer('/health');
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
