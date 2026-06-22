import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function configuredHosts() {
  return (process.env.RUSTZEN_ADMIN_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeHost(value: string | null) {
  if (!value) return null;
  const host = value.trim().toLowerCase();
  if (host.startsWith('[')) return host.slice(1, host.indexOf(']'));
  return host.split(':')[0] || null;
}

function hostMatches(host: string, allowedHost: string) {
  if (allowedHost.startsWith('*.')) {
    const suffix = allowedHost.slice(1);
    return host.endsWith(suffix) && host.length > suffix.length;
  }

  return host === allowedHost;
}

function isAllowedAdminHost(host: string | null) {
  if (!host) return false;

  const allowedHosts = configuredHosts();
  if (allowedHosts.length === 0 && process.env.NODE_ENV !== 'production') {
    return LOCAL_HOSTS.has(host);
  }

  return allowedHosts.some((allowedHost) => hostMatches(host, allowedHost));
}

function originHost(value: string | null) {
  if (!value) return null;

  try {
    return normalizeHost(new URL(value).host);
  } catch {
    return null;
  }
}

export async function assertAdminRequestAllowed() {
  const store = await headers();
  const host = normalizeHost(store.get('host') ?? store.get('x-forwarded-host'));

  if (!isAllowedAdminHost(host)) {
    notFound();
  }

  const origin = originHost(store.get('origin'));
  if (origin && origin !== host) {
    notFound();
  }
}
