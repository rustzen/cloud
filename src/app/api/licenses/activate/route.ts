import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const activateSchema = z.object({
  product: z.string().min(1),
  license_key: z.string().min(1),
  device_id: z.string().min(1),
  device_name: z.string().optional(),
  app_version: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = activateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 });
  }

  const data = parsed.data;

  const license = await prisma.license.findFirst({
    where: {
      licenseKey: data.license_key,
      product: { code: data.product },
    },
    include: { devices: true, product: true },
  });

  if (!license || license.status !== 'ACTIVE') {
    return NextResponse.json({ valid: false, error: 'Invalid license' }, { status: 403 });
  }

  if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ valid: false, error: 'License expired' }, { status: 403 });
  }

  const knownDevice = license.devices.find((device) => device.deviceId === data.device_id);

  if (!knownDevice && license.devices.length >= license.maxDevices) {
    return NextResponse.json({ valid: false, error: 'Device limit reached' }, { status: 403 });
  }

  await prisma.licenseDevice.upsert({
    where: {
      licenseId_deviceId: {
        licenseId: license.id,
        deviceId: data.device_id,
      },
    },
    update: {
      deviceName: data.device_name,
      appVersion: data.app_version,
      lastSeenAt: new Date(),
    },
    create: {
      licenseId: license.id,
      deviceId: data.device_id,
      deviceName: data.device_name,
      appVersion: data.app_version,
    },
  });

  return NextResponse.json({
    valid: true,
    product: license.product.code,
    plan: license.plan,
    expires_at: license.expiresAt,
    max_devices: license.maxDevices,
  });
}
