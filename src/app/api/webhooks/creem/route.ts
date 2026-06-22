import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { normalizeCreemWebhook, verifyCreemSignature } from '@/lib/creem';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const licenseCreatingEvents = new Set(['checkout.completed', 'subscription.paid']);

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('creem-signature');

  if (!verifyCreemSignature(rawBody, signature, process.env.CREEM_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const fulfillment = normalizeCreemWebhook(payload);
  const fallbackEventKey =
    fulfillment.orderId || fulfillment.eventId || createHash('sha256').update(rawBody).digest('hex');
  const effectiveEventId = fulfillment.eventId ?? `${fulfillment.eventName}:${fallbackEventKey}`;
  const payloadJson = payload as Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    const existingEvent = await tx.billingEvent.findUnique({
      where: { eventId: effectiveEventId },
    });

    await tx.billingEvent.upsert({
      where: { eventId: effectiveEventId },
      update: { payload: payloadJson },
      create: {
        provider: fulfillment.provider,
        eventName: fulfillment.eventName,
        eventId: effectiveEventId,
        orderId: fulfillment.orderId,
        customerEmail: fulfillment.customerEmail,
        payload: payloadJson,
      },
    });

    if (!licenseCreatingEvents.has(fulfillment.eventName)) return;
    if (!fulfillment.productCode || !fulfillment.customerEmail || !fulfillment.licenseKey || existingEvent) return;

    const product = await tx.product.findUnique({ where: { code: fulfillment.productCode } });
    if (!product) return;

    const existingLicense = fulfillment.orderId
      ? await tx.license.findFirst({
          where: {
            productId: product.id,
            customerEmail: fulfillment.customerEmail,
            provider: fulfillment.provider,
            providerOrderId: fulfillment.orderId,
          },
        })
      : null;

    if (existingLicense) return;

    await tx.license.create({
      data: {
        productId: product.id,
        licenseKey: fulfillment.licenseKey,
        status: 'ACTIVE',
        plan: 'pro',
        customerEmail: fulfillment.customerEmail,
        provider: fulfillment.provider,
        providerOrderId: fulfillment.orderId,
        maxDevices: 3,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
