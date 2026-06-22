import { createHmac, timingSafeEqual } from 'crypto';

type JsonObject = Record<string, unknown>;

export type CreemCheckoutProductCode = 'rustzen-clear';

export type CreemCheckoutRequest = {
  product_id: string;
  request_id: string;
  success_url: string;
  metadata: {
    product: CreemCheckoutProductCode;
    source: string;
  };
};

export type CreemWebhookFulfillment = {
  provider: 'creem';
  eventId: string | null;
  eventName: string;
  orderId: string;
  customerEmail: string | null;
  productCode: string | null;
  licenseKey: string | null;
};

export type CreemLicenseImport = {
  id: string;
  key: string;
  maxDevices: number;
  expiresAt: Date | null;
};

const CREEM_PRODUCTION_API_BASE_URL = 'https://api.creem.io';
const CREEM_TEST_API_BASE_URL = 'https://test-api.creem.io';

export function getCreemApiBaseUrl(input: { apiKey?: string; testMode?: boolean }) {
  if (input.testMode || input.apiKey?.startsWith('creem_test_')) {
    return CREEM_TEST_API_BASE_URL;
  }

  return CREEM_PRODUCTION_API_BASE_URL;
}

export function buildCreemCheckoutRequest(input: {
  productCode: CreemCheckoutProductCode;
  productIds: Record<CreemCheckoutProductCode, string | undefined>;
  requestId: string;
  successUrl: string;
  source?: string;
}): CreemCheckoutRequest {
  const productId = input.productIds[input.productCode];
  if (!productId) {
    throw new Error(`Creem product id is not configured for ${input.productCode}`);
  }

  return {
    product_id: productId,
    request_id: input.requestId,
    success_url: input.successUrl,
    metadata: {
      product: input.productCode,
      source: input.source ?? 'rustzen-cloud',
    },
  };
}

export function buildCreemLicenseActivationRequest(key: string, deviceId: string) {
  return {
    key,
    instance_name: deviceId,
  };
}

export function normalizeCreemLicense(payload: unknown, expectedProductId: string): CreemLicenseImport | null {
  const license = objectValue(payload);
  const productId = stringValue(license.product_id);
  const status = stringValue(license.status);
  const key = stringValue(license.key);
  const id = stringValue(license.id);

  if (productId !== expectedProductId || status !== 'active' || !key || !id) {
    return null;
  }

  const activationLimit = numberValue(license.activation_limit);
  const expiresAtValue = stringValue(license.expires_at);

  return {
    id,
    key,
    maxDevices: activationLimit ?? 3,
    expiresAt: expiresAtValue ? new Date(expiresAtValue) : null,
  };
}

export function verifyCreemSignature(rawBody: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function normalizeCreemWebhook(payload: unknown, fallbackEventName = 'unknown'): CreemWebhookFulfillment {
  const body = objectValue(payload);
  const object = objectValue(body.object);
  const order = objectValue(object.order);
  const customer = objectValue(object.customer);
  const product = objectValue(object.product);
  const metadata = objectValue(object.metadata);
  const license = objectValue(object.license);

  return {
    provider: 'creem',
    eventId: stringValue(body.id),
    eventName: stringValue(body.eventType) ?? fallbackEventName,
    orderId: stringValue(order.id) ?? stringValue(object.id) ?? '',
    customerEmail: stringValue(customer.email),
    productCode: stringValue(metadata.product) ?? stringValue(body.product) ?? creemProductCode(product),
    licenseKey: stringValue(license.key) ?? stringValue(object.license_key) ?? stringValue(metadata.license_key),
  };
}

function creemProductCode(product: JsonObject) {
  const metadata = objectValue(product.metadata);
  return stringValue(metadata.product);
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' ? (value as JsonObject) : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
