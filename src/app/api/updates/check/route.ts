import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_RUSTZEN_CLEAR_UPDATE_MANIFEST_URL =
  'https://zlobtosdpjhocxfj.public.blob.vercel-storage.com/rustzen-clear/releases/latest/zen-clear-updates.json';

const MANIFEST_FETCH_TIMEOUT_MS = 8_000;

function manifestUrls() {
  const configuredUrl = process.env.RUSTZEN_CLEAR_UPDATE_MANIFEST_URL?.trim();
  return [
    ...new Set(
      [configuredUrl, DEFAULT_RUSTZEN_CLEAR_UPDATE_MANIFEST_URL].filter(
        (url): url is string => Boolean(url),
      ),
    ),
  ];
}

async function fetchManifest(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MANIFEST_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false as const, error: 'update_manifest_unavailable', status: response.status };
    }

    const manifest = await response.json().catch(() => null);
    if (!manifest || typeof manifest !== 'object') {
      return { ok: false as const, error: 'invalid_update_manifest', status: 502 };
    }

    return { ok: true as const, manifest };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
      status: 502,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(_request: NextRequest) {
  const urls = manifestUrls();
  if (urls.length === 0) {
    return NextResponse.json({ error: 'update_manifest_not_configured' }, { status: 503 });
  }

  const failures: Array<{ url: string; error: string; status: number }> = [];

  for (const url of urls) {
    const result = await fetchManifest(url);
    if (result.ok) {
      return NextResponse.json(result.manifest, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      });
    }

    failures.push({ url, error: result.error, status: result.status });
  }

  return NextResponse.json({ error: 'update_manifest_unavailable', failures }, { status: 502 });
}
