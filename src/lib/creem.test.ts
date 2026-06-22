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

test('selects Creem sandbox API for test keys', () => {
  assert.equal(getCreemApiBaseUrl({ apiKey: 'creem_test_abc' }), 'https://test-api.creem.io');
});

test('builds a checkout request for the Rustzen Clear Creem product', () => {
  const request = buildCreemCheckoutRequest({
    productCode: 'rustzen-clear',
    requestId: 'rz_checkout_123',
    successUrl: 'https://rustzen.com/checkout/success',
    productIds: { 'rustzen-clear': 'prod_test_clear' },
  });

  assert.deepEqual(request, {
    product_id: 'prod_test_clear',
    request_id: 'rz_checkout_123',
    success_url: 'https://rustzen.com/checkout/success',
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
      customer: { email: 'buyer@example.com' },
      product: { id: 'prod_test_clear' },
      metadata: { product: 'rustzen-clear' },
    },
  };

  assert.deepEqual(normalizeCreemWebhook(payload, 'checkout.completed'), {
    provider: 'creem',
    eventId: 'evt_test',
    eventName: 'checkout.completed',
    orderId: 'ord_test',
    customerEmail: 'buyer@example.com',
    productCode: 'rustzen-clear',
    licenseKey: null,
  });
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
