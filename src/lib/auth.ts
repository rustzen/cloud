import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_COOKIE = 'rustzen_admin_session';

function getSecret() {
  const secret = process.env.RUSTZEN_ADMIN_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('RUSTZEN_ADMIN_SECRET is required in production');
  }

  return 'development-only-secret';
}

export function signAdminSession(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('hex');
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.RUSTZEN_ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export async function createAdminSession() {
  const value = `admin:${Date.now()}`;
  const signature = signAdminSession(value);
  const store = await cookies();
  store.set(SESSION_COOKIE, `${value}.${signature}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function hasAdminSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return false;

  const [value, signature] = raw.split('.');
  if (!value || !signature) return false;

  const expected = signAdminSession(value);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}
