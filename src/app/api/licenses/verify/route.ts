import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  bearerToken,
  inactiveLicenseStatus,
  isLicenseTokenConfigError,
  licenseError,
  licenseStatus,
  licenseTokenConfigError,
  verifyLicenseToken,
} from '@/lib/license-api';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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

  const device = await prisma.licenseDevice.findUnique({
    where: {
      licenseId_deviceId: {
        licenseId: license.id,
        deviceId: claims.device_id,
      },
    },
  });

  if (!device) {
    return licenseError('device_not_found', 404);
  }

  const boundDeviceCount = await prisma.licenseDevice.count({
    where: { licenseId: license.id },
  });

  if (license.status !== 'ACTIVE') {
    return NextResponse.json({
      success: true,
      status: inactiveLicenseStatus(license.plan, license.expiresAt, boundDeviceCount),
    });
  }

  if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({
      success: true,
      status: inactiveLicenseStatus(license.plan, license.expiresAt, boundDeviceCount),
    });
  }

  await prisma.licenseDevice.update({
    where: { licenseId_deviceId: { licenseId: license.id, deviceId: claims.device_id } },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({
    success: true,
    status: licenseStatus(license.plan, license.expiresAt, boundDeviceCount),
  });
}
