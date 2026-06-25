import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildCreemCheckoutRequest,
  getCreemApiBaseUrl,
  type CreemCheckoutProductCode,
} from '@/lib/creem';

export const runtime = 'nodejs';

type CreemCheckoutResponse = {
  checkout_url?: unknown;
};

const productIds: Record<CreemCheckoutProductCode, string | undefined> = {
  'rustzen-clear': process.env.CREEM_RUSTZEN_CLEAR_PRODUCT_ID,
};

function readProductCode(request: NextRequest) {
  const product = request.nextUrl.searchParams.get('product') ?? 'rustzen-clear';
  return product === 'rustzen-clear' ? product : null;
}

function successUrl(request: NextRequest) {
  if (process.env.CREEM_CHECKOUT_SUCCESS_URL) {
    return process.env.CREEM_CHECKOUT_SUCCESS_URL;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/checkout/success`;
  }

  return new URL('/checkout/success', request.nextUrl.origin).toString();
}

export async function GET(request: NextRequest) {
  const productCode = readProductCode(request);
  if (!productCode) {
    return NextResponse.json({ error: 'unsupported_product' }, { status: 400 });
  }

  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'creem_api_key_missing' }, { status: 500 });
  }

  let checkoutRequest;
  try {
    checkoutRequest = buildCreemCheckoutRequest({
      productCode,
      productIds,
      requestId: `rz_${productCode}_${randomUUID()}`,
      successUrl: successUrl(request),
      source: request.nextUrl.searchParams.get('source') ?? 'rustzen-cloud',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'creem_product_not_configured', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }

  const response = await fetch(`${getCreemApiBaseUrl({ apiKey })}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(checkoutRequest),
  });

  const data = (await response.json().catch(() => ({}))) as CreemCheckoutResponse;
  if (!response.ok || typeof data.checkout_url !== 'string') {
    return NextResponse.json(
      { error: 'creem_checkout_failed', status: response.status, detail: data },
      { status: 502 },
    );
  }

  return NextResponse.redirect(data.checkout_url, 303);
}
