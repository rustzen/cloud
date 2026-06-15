type Json = Record<string, unknown>;

function getLicenseServerUrl() {
  const url = process.env.RUSTZEN_LICENSE_SERVER_URL;
  if (!url) {
    throw new Error('RUSTZEN_LICENSE_SERVER_URL is required');
  }
  return url.replace(/\/$/, '');
}

function getLicenseServerToken() {
  return process.env.RUSTZEN_LICENSE_SERVER_TOKEN;
}

export async function callLicenseServer<T = Json>(path: string, init: RequestInit = {}) {
  const baseUrl = getLicenseServerUrl();
  const token = getLicenseServerToken();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
    } as const;
  }

  return {
    ok: true,
    status: response.status,
    data: data as T,
  } as const;
}
