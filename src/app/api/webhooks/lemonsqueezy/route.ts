import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type LemonPayload = Record<string, any>;

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function getProductCode(payload: LemonPayload) {
  return payload?.meta?.custom_data?.product ?? payload?.data?.attributes?.custom_data?.product ?? 'rustzen-clear';
}

function getCustomerEmail(payload: LemonPayload) {
  return payload?.data?.attributes?.user_email ?? payload?.data?.attributes?.customer_email ?? null;
}

function getOrderId(payload: LemonPayload) {
  return String(payload?.data?.id ?? payload?.data?.attributes?.order_id ?? '');
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as LemonPayload;
  const eventName = request.headers.get('x-event-name') ?? payload?.meta?.event_name ?? 'unknown';
  const eventId = payload?.meta?.webhook_id ? String(payload.meta.webhook_id) : null;
  const fallbackEventId = `${eventName}:${getOrderId(payload) || randomUUID()}`;
  const orderId = getOrderId(payload);
  const customerEmail = getCustomerEmail(payload);
  const payloadJson = payload as Prisma.InputJsonValue;

  await prisma.billingEvent.upsert({
    where: { eventId: eventId ?? fallbackEventId },
    update: { payload: payloadJson },
    create: {
      provider: 'lemonsqueezy',
      eventName,
      eventId: eventId ?? fallbackEventId,
      orderId,
      customerEmail,
      payload: payloadJson,
    },
  });

  if (eventName === 'order_created' || eventName === 'subscription_created') {
    const productCode = getProductCode(payload);
    const product = await prisma.product.findUnique({ where: { code: productCode } });

    if (product && customerEmail) {
      await prisma.license.create({
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
    }
  }

  return NextResponse.json({ ok: true });
}
