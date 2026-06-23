import { cookies } from 'next/headers';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

const SESSION_COOKIE = 'rustzen_admin_session';
const SESSION_VERSION = 1;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.RUSTZEN_ADMIN_SECRET;
  if (secret) {
    if (process.env.NODE_ENV === 'production' && secret.length < 32) {
      throw new Error('RUSTZEN_ADMIN_SECRET must be at least 32 characters in production');
    }

    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('RUSTZEN_ADMIN_SECRET is required in production');
  }

  return 'development-only-secret';
}

export function signAdminSession(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('hex');
}

function safeEqualString(actual: string, expected: string) {
  const actualHash = createHash('sha256').update(actual).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.RUSTZEN_ADMIN_USERNAME;
  const expectedPassword = process.env.RUSTZEN_ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) return false;
  if (process.env.NODE_ENV === 'production' && expectedPassword.length < 12) {
    throw new Error('RUSTZEN_ADMIN_PASSWORD must be at least 12 characters in production');
  }

  return safeEqualString(username, expectedUsername) && safeEqualString(password, expectedPassword);
}

function encodeSession(username: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  return Buffer.from(JSON.stringify({
    version: SESSION_VERSION,
    username,
    issuedAt,
    expiresAt: issuedAt + SESSION_MAX_AGE_SECONDS,
  })).toString('base64url');
}

function parseSession(value: string) {
  const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
  if (!decoded || typeof decoded !== 'object') return null;

  const session = decoded as Record<string, unknown>;
  if (
    session.version !== SESSION_VERSION ||
    typeof session.username !== 'string' ||
    typeof session.issuedAt !== 'number' ||
    typeof session.expiresAt !== 'number'
  ) {
    return null;
  }

  if (session.expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return session;
}

export async function createAdminSession(username: string) {
  const value = encodeSession(username);
  const signature = signAdminSession(value);
  const store = await cookies();
  store.set(SESSION_COOKIE, `${value}.${signature}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function hasAdminSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return false;

  const [value, signature] = raw.split('.');
  if (!value || !signature) return false;

  let expected: string;
  try {
    expected = signAdminSession(value);
  } catch {
    return false;
  }

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return false;

  try {
    return parseSession(value) !== null;
  } catch {
    return false;
  }
}
