import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiToken } from '@/lib/api-security';
import { callLicenseServer } from '@/lib/license-server';

export async function GET(request: NextRequest) {
  const apiAuthError = requireAdminApiToken(request);
  if (apiAuthError) return apiAuthError;

  const result = await callLicenseServer('/health');
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
