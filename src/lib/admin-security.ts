import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

function normalizeHost(value: string | null) {
  if (!value) return null;
  const host = value.trim().toLowerCase();
  if (host.startsWith('[')) return host.slice(1, host.indexOf(']'));
  return host.split(':')[0] || null;
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

  const origin = originHost(store.get('origin'));
  if (origin && origin !== host) {
    notFound();
  }
}
