import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const TOKEN_VERSION = 1;
const LOCAL_DEV_JWT_SECRET = 'dev-license-secret-change-in-production';
const LICENSE_JWT_SECRET_MISSING = 'LICENSE_JWT_SECRET is required in production';

export type LicenseClaims = {
  license_key: string;
  product: string;
  device_id: string;
  plan: string;
  version: number;
  expires_at: number | null;
  issued_at: number;
  iat: number;
  exp?: number;
};

export function unixSeconds(date: Date | null) {
  return date ? Math.floor(date.getTime() / 1000) : null;
}

export function licenseStatus(plan: string, expiresAt: Date | null, boundDeviceCount: number) {
  return {
    plan,
    is_active: true,
    expires_at: unixSeconds(expiresAt),
    bound_device_count: boundDeviceCount,
  };
}

export function inactiveLicenseStatus(
  plan: string,
  expiresAt: Date | null,
  boundDeviceCount: number,
) {
  return {
    plan,
    is_active: false,
    expires_at: unixSeconds(expiresAt),
    bound_device_count: boundDeviceCount,
  };
}

export function licenseError(error: string, status: number, detail?: unknown) {
  return NextResponse.json(
    detail === undefined ? { error } : { error, detail },
    { status },
  );
}

export async function readJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function bearerToken(request: NextRequest) {
  const value = request.headers.get('authorization');
  return value?.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() : null;
}

export function signLicenseToken(input: {
  licenseKey: string;
  product: string;
  deviceId: string;
  plan: string;
  expiresAt: Date | null;
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = unixSeconds(input.expiresAt);
  const claims: LicenseClaims = {
    license_key: input.licenseKey,
    product: input.product,
    device_id: input.deviceId,
    plan: input.plan,
    version: TOKEN_VERSION,
    expires_at: expiresAt,
    issued_at: issuedAt,
    iat: issuedAt,
  };

  if (expiresAt) {
    claims.exp = expiresAt;
  }

  return signJwt(claims);
}

export function verifyLicenseToken(token: string) {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) {
    throw new Error('invalid token shape');
  }

  const expected = hmac(`${header}.${payload}`);
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);
  if (
    expectedBytes.length !== signatureBytes.length ||
    !timingSafeEqual(expectedBytes, signatureBytes)
  ) {
    throw new Error('invalid token signature');
  }

  return parseLicenseClaims(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
}

export function isLicenseTokenConfigError(error: unknown) {
  return error instanceof Error && error.message === LICENSE_JWT_SECRET_MISSING;
}

export function licenseTokenConfigError() {
  return licenseError('license_service_misconfigured', 500);
}

function signJwt(claims: LicenseClaims) {
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson(claims);
  return `${header}.${payload}.${hmac(`${header}.${payload}`)}`;
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function hmac(value: string) {
  return createHmac('sha256', jwtSecret()).update(value).digest('base64url');
}

function jwtSecret() {
  const configuredSecret = process.env.LICENSE_JWT_SECRET;
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return LOCAL_DEV_JWT_SECRET;
  }

  throw new Error(LICENSE_JWT_SECRET_MISSING);
}

function parseLicenseClaims(value: unknown): LicenseClaims {
  if (!value || typeof value !== 'object') {
    throw new Error('invalid token claims');
  }

  const claims = value as Record<string, unknown>;
  const licenseKey = claims.license_key;
  const product = claims.product;
  const deviceId = claims.device_id;
  const plan = claims.plan;
  const version = claims.version;
  const expiresAt = claims.expires_at;
  const issuedAt = claims.issued_at;
  const iat = claims.iat;
  const exp = claims.exp;

  if (
    typeof licenseKey !== 'string' ||
    typeof product !== 'string' ||
    typeof deviceId !== 'string' ||
    typeof plan !== 'string' ||
    version !== TOKEN_VERSION ||
    (expiresAt !== null && typeof expiresAt !== 'number') ||
    typeof issuedAt !== 'number' ||
    typeof iat !== 'number' ||
    (exp !== undefined && typeof exp !== 'number')
  ) {
    throw new Error('invalid token claims');
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof exp === 'number' && exp <= now) {
    throw new Error('token expired');
  }

  return {
    license_key: licenseKey,
    product,
    device_id: deviceId,
    plan,
    version,
    expires_at: expiresAt,
    issued_at: issuedAt,
    iat,
    ...(exp === undefined ? {} : { exp }),
  };
}
