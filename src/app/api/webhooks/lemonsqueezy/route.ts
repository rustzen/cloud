import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type JsonObject = Record<string, unknown>;
type LemonPayload = JsonObject;

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' ? (value as JsonObject) : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function getProductCode(payload: LemonPayload) {
  const meta = objectValue(payload.meta);
  const metaCustomData = objectValue(meta.custom_data);
  const data = objectValue(payload.data);
  const attributes = objectValue(data.attributes);
  const attributeCustomData = objectValue(attributes.custom_data);

  return stringValue(metaCustomData.product) ?? stringValue(attributeCustomData.product);
}

function getCustomerEmail(payload: LemonPayload) {
  const data = objectValue(payload.data);
  const attributes = objectValue(data.attributes);

  return stringValue(attributes.user_email) ?? stringValue(attributes.customer_email);
}

function getOrderId(payload: LemonPayload) {
  const data = objectValue(payload.data);
  const attributes = objectValue(data.attributes);
  const value = stringValue(data.id) ?? stringValue(attributes.order_id);

  return value ?? '';
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: LemonPayload;
  try {
    payload = JSON.parse(rawBody) as LemonPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const meta = objectValue(payload.meta);
  const eventName = request.headers.get('x-event-name') ?? stringValue(meta.event_name) ?? 'unknown';
  const eventId = stringValue(meta.webhook_id);
  const fallbackEventKey = getOrderId(payload) || createHash('sha256').update(rawBody).digest('hex');
  const fallbackEventId = `${eventName}:${fallbackEventKey}`;
  const effectiveEventId = eventId ?? fallbackEventId;
  const orderId = getOrderId(payload);
  const customerEmail = getCustomerEmail(payload);
  const payloadJson = payload as Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    const existingEvent = await tx.billingEvent.findUnique({
      where: { eventId: effectiveEventId },
    });

    await tx.billingEvent.upsert({
      where: { eventId: effectiveEventId },
      update: { payload: payloadJson },
      create: {
        provider: 'lemonsqueezy',
        eventName,
        eventId: effectiveEventId,
        orderId,
        customerEmail,
        payload: payloadJson,
      },
    });

    if (eventName !== 'order_created' && eventName !== 'subscription_created') {
      return;
    }

    const productCode = getProductCode(payload);
    const product = productCode
      ? await tx.product.findUnique({ where: { code: productCode } })
      : null;

    if (!product || !customerEmail || existingEvent) {
      return;
    }

    const existingLicense = orderId
      ? await tx.license.findFirst({
          where: {
            productId: product.id,
            customerEmail,
            provider: 'lemonsqueezy',
            providerOrderId: orderId,
          },
        })
      : null;

    if (existingLicense) {
      return;
    }

    await tx.license.create({
      data: {
        productId: product.id,
        licenseKey: `RZ-${randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase()}`,
        status: 'ACTIVE',
        plan: 'pro',
        customerEmail,
        provider: 'lemonsqueezy',
        providerOrderId: orderId,
        maxDevices: 3,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
