import { createHmac } from 'crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreemCheckoutRequest,
  buildCreemLicenseActivationRequest,
  getCreemApiBaseUrl,
  normalizeCreemLicense,
  normalizeCreemWebhook,
  verifyCreemSignature,
} from './creem.ts';

const TEST_RUSTZEN_CLEAR_CREEM_PRODUCT_ID = 'prod_test_clear';

test('selects Creem sandbox API for test keys', () => {
  assert.equal(getCreemApiBaseUrl({ apiKey: 'creem_test_abc' }), 'https://test-api.creem.io');
});

test('builds a checkout request for the Rustzen Clear Creem product', () => {
  const request = buildCreemCheckoutRequest({
    productCode: 'rustzen-clear',
    requestId: 'rz_checkout_123',
    successUrl: 'https://app.rustzen.dev/checkout/success',
    productIds: { 'rustzen-clear': TEST_RUSTZEN_CLEAR_CREEM_PRODUCT_ID },
  });

  assert.deepEqual(request, {
    product_id: TEST_RUSTZEN_CLEAR_CREEM_PRODUCT_ID,
    request_id: 'rz_checkout_123',
    success_url: 'https://app.rustzen.dev/checkout/success',
    metadata: {
      product: 'rustzen-clear',
      source: 'rustzen-cloud',
    },
  });
});

test('normalizes a checkout.completed webhook into license fulfillment data', () => {
  const payload = {
    id: 'evt_test',
    eventType: 'checkout.completed',
    object: {
      id: 'ch_test',
      order: { id: 'ord_test' },
      subscription: { id: 'sub_test' },
      customer: { email: 'buyer@example.com' },
      product: { id: TEST_RUSTZEN_CLEAR_CREEM_PRODUCT_ID },
      metadata: { product: 'rustzen-clear' },
    },
  };

  assert.deepEqual(normalizeCreemWebhook(payload, 'checkout.completed'), {
    provider: 'creem',
    eventId: 'evt_test',
    eventName: 'checkout.completed',
    orderId: 'ord_test',
    subscriptionId: 'sub_test',
    customerEmail: 'buyer@example.com',
    productId: TEST_RUSTZEN_CLEAR_CREEM_PRODUCT_ID,
    productCode: 'rustzen-clear',
    licenseKey: null,
    currentPeriodEndDate: null,
  });
});

test('normalizes subscription paid webhooks with period end dates', () => {
  const license = normalizeCreemWebhook(
    {
      id: 'evt_paid',
      eventType: 'subscription.paid',
      object: {
        id: 'sub_test',
        object: 'subscription',
        product: { id: TEST_RUSTZEN_CLEAR_CREEM_PRODUCT_ID },
        customer: { email: 'buyer@example.com' },
        current_period_end_date: '2027-01-01T00:00:00.000Z',
      },
    },
    'subscription.paid',
  );

  assert.equal(license.subscriptionId, 'sub_test');
  assert.equal(license.productId, TEST_RUSTZEN_CLEAR_CREEM_PRODUCT_ID);
  assert.equal(license.currentPeriodEndDate?.toISOString(), '2027-01-01T00:00:00.000Z');
});

test('verifies Creem HMAC signatures over the raw payload', () => {
  const rawBody = JSON.stringify({ eventType: 'checkout.completed' });
  const secret = 'test-webhook-secret';
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(verifyCreemSignature(rawBody, signature, secret), true);
  assert.equal(verifyCreemSignature(rawBody, 'invalid', secret), false);
});

test('builds a Creem license activation request from the desktop device id', () => {
  assert.deepEqual(buildCreemLicenseActivationRequest('CREEM-KEY', 'device-123'), {
    key: 'CREEM-KEY',
    instance_name: 'device-123',
  });
});

test('normalizes an active Creem license response for local import', () => {
  const license = normalizeCreemLicense(
    {
      id: 'lic_123',
      product_id: 'prod_test_clear',
      key: 'CREEM-KEY',
      status: 'active',
      activation_limit: 2,
      expires_at: null,
    },
    'prod_test_clear',
  );

  assert.deepEqual(license, {
    id: 'lic_123',
    key: 'CREEM-KEY',
    maxDevices: 2,
    expiresAt: null,
  });
});
