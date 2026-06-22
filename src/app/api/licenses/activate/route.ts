import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  buildCreemLicenseActivationRequest,
  getCreemApiBaseUrl,
  normalizeCreemLicense,
} from '@/lib/creem';
import {
  isLicenseTokenConfigError,
  licenseError,
  licenseStatus,
  licenseTokenConfigError,
  readJsonBody,
  signLicenseToken,
} from '@/lib/license-api';
import { z } from 'zod';

export const runtime = 'nodejs';

const activateSchema = z.object({
  product: z.string().min(1),
  license_key: z.string().min(1),
  device_id: z.string().min(1),
  device_name: z.string().optional(),
  app_version: z.string().optional(),
});

const MAX_ACTIVATION_ATTEMPTS = 3;

async function importCreemLicenseIfNeeded(input: {
  product: string;
  licenseKey: string;
  deviceId: string;
}) {
  if (input.product !== 'rustzen-clear') return;

  const apiKey = process.env.CREEM_API_KEY;
  const productId = process.env.CREEM_RUSTZEN_CLEAR_PRODUCT_ID;
  if (!apiKey || !productId) return;

  const existingLicense = await prisma.license.findFirst({
    where: {
      licenseKey: input.licenseKey,
      product: { code: input.product },
    },
  });

  if (existingLicense) return;

  const response = await fetch(`${getCreemApiBaseUrl({ apiKey })}/v1/licenses/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(buildCreemLicenseActivationRequest(input.licenseKey, input.deviceId)),
  });

  if (!response.ok) return;

  const creemLicense = normalizeCreemLicense(await response.json().catch(() => null), productId);
  if (!creemLicense) return;

  const product = await prisma.product.findUnique({ where: { code: input.product } });
  if (!product) return;

  await prisma.license.upsert({
    where: { licenseKey: creemLicense.key },
    update: {
      status: 'ACTIVE',
      plan: 'pro',
      provider: 'creem',
      providerOrderId: creemLicense.id,
      expiresAt: creemLicense.expiresAt,
      maxDevices: creemLicense.maxDevices,
    },
    create: {
      productId: product.id,
      licenseKey: creemLicense.key,
      status: 'ACTIVE',
      plan: 'pro',
      provider: 'creem',
      providerOrderId: creemLicense.id,
      expiresAt: creemLicense.expiresAt,
      maxDevices: creemLicense.maxDevices,
    },
  });
}

function isRetryableActivationError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2034' || error.code === 'P2002')
  );
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body) {
    return licenseError('invalid_json', 400);
  }

  const parsed = activateSchema.safeParse(body);

  if (!parsed.success) {
    return licenseError('validation_failed', 400, parsed.error.issues);
  }

  const data = parsed.data;
  await importCreemLicenseIfNeeded({
    product: data.product,
    licenseKey: data.license_key,
    deviceId: data.device_id,
  });

  for (let attempt = 1; attempt <= MAX_ACTIVATION_ATTEMPTS; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const license = await tx.license.findFirst({
            where: {
              licenseKey: data.license_key,
              product: { code: data.product },
            },
            include: { product: true },
          });

          if (!license) {
            return { success: false as const, error: 'license_key_invalid', status: 403 as const };
          }

          if (license.status !== 'ACTIVE') {
            return { success: false as const, error: 'license_not_active', status: 403 as const };
          }

          if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
            return { success: false as const, error: 'license_not_active', status: 403 as const };
          }

          const deviceKey = {
            licenseId: license.id,
            deviceId: data.device_id,
          };

          const knownDevice = await tx.licenseDevice.findUnique({
            where: { licenseId_deviceId: deviceKey },
          });

          if (knownDevice) {
            await tx.licenseDevice.update({
              where: { licenseId_deviceId: deviceKey },
              data: {
                deviceName: data.device_name,
                appVersion: data.app_version,
                lastSeenAt: new Date(),
              },
            });
          } else {
            const activeDeviceCount = await tx.licenseDevice.count({
              where: { licenseId: license.id },
            });

            if (activeDeviceCount >= license.maxDevices) {
              return {
                success: false as const,
                error: 'device_limit_reached',
                status: 403 as const,
                detail: { max_devices: license.maxDevices },
              };
            }

            await tx.licenseDevice.create({
              data: {
                licenseId: license.id,
                deviceId: data.device_id,
                deviceName: data.device_name,
                appVersion: data.app_version,
              },
            });
          }

          const boundDeviceCount = await tx.licenseDevice.count({
            where: { licenseId: license.id },
          });

          return {
            success: true as const,
            token: signLicenseToken({
              licenseKey: license.licenseKey,
              product: data.product,
              deviceId: data.device_id,
              plan: license.plan,
              expiresAt: license.expiresAt,
            }),
            status: licenseStatus(license.plan, license.expiresAt, boundDeviceCount),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (!result.success) {
        return licenseError(result.error, result.status, 'detail' in result ? result.detail : undefined);
      }

      return NextResponse.json({ token: result.token, status: result.status });
    } catch (error) {
      if (isLicenseTokenConfigError(error)) {
        return licenseTokenConfigError();
      }

      if (isRetryableActivationError(error)) {
        if (attempt < MAX_ACTIVATION_ATTEMPTS) {
          continue;
        }

        return licenseError('activation_conflict', 409);
      }

      throw error;
    }
  }

  throw new Error('Unreachable activation retry state');
}
