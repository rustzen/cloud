import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

function tokenFromRequest(request: NextRequest, headerName: string) {
  const explicitToken = request.headers.get(headerName);
  if (explicitToken) return explicitToken.trim();

  const authorization = request.headers.get('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : null;
}

function safeEqualSecret(actual: string, expected: string) {
  const actualHash = createHash('sha256').update(actual).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

function requireApiToken(request: NextRequest, options: {
  envName: string;
  headerName: string;
  missingConfigError: string;
  invalidTokenError: string;
}) {
  const expected = process.env[options.envName];
  if (!expected) {
    if (process.env.NODE_ENV !== 'production') return null;
    return NextResponse.json({ error: options.missingConfigError }, { status: 500 });
  }

  const actual = tokenFromRequest(request, options.headerName);
  if (!actual || !safeEqualSecret(actual, expected)) {
    return NextResponse.json({ error: options.invalidTokenError }, { status: 401 });
  }

  return null;
}

export function requireAdminApiToken(request: NextRequest) {
  return requireApiToken(request, {
    envName: 'RUSTZEN_ADMIN_API_TOKEN',
    headerName: 'x-rustzen-admin-token',
    missingConfigError: 'admin_api_token_missing',
    invalidTokenError: 'invalid_admin_api_token',
  });
}
