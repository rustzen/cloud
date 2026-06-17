import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  bearerToken,
  isLicenseTokenConfigError,
  licenseError,
  licenseTokenConfigError,
  verifyLicenseToken,
} from '@/lib/license-api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return licenseError('invalid_token', 401);
  }

  let claims;
  try {
    claims = verifyLicenseToken(token);
  } catch (error) {
    if (isLicenseTokenConfigError(error)) {
      return licenseTokenConfigError();
    }

    return licenseError('invalid_token', 401);
  }

  const license = await prisma.license.findFirst({
    where: { licenseKey: claims.license_key, product: { code: claims.product } },
  });

  if (!license) {
    return licenseError('license_not_found', 404);
  }

  if (license.status !== 'ACTIVE') {
    return licenseError('license_not_active', 403);
  }

  if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
    return licenseError('license_not_active', 403);
  }

  await prisma.licenseDevice.deleteMany({
    where: {
      licenseId: license.id,
      deviceId: claims.device_id,
    },
  });

  return NextResponse.json({ success: true, message: 'device deactivated' });
}
