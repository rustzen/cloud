import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_RUSTZEN_CLEAR_UPDATE_MANIFEST_URL =
  'https://zlobtosdpjhocxfj.public.blob.vercel-storage.com/rustzen-clear/releases/latest/zen-clear-updates.json';
const DEFAULT_RUSTZEN_CLEAR_UPDATE_BLOB_ORIGIN =
  'https://zlobtosdpjhocxfj.public.blob.vercel-storage.com';

const MANIFEST_FETCH_TIMEOUT_MS = 8_000;

function manifestUrl() {
  const configuredUrl = process.env.RUSTZEN_CLEAR_UPDATE_MANIFEST_URL?.trim();
  return configuredUrl || DEFAULT_RUSTZEN_CLEAR_UPDATE_MANIFEST_URL;
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

function cloudDownloadUrl(request: NextRequest, assetUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(assetUrl);
  } catch {
    return assetUrl;
  }

  const blobOrigin = process.env.RUSTZEN_CLEAR_UPDATE_BLOB_ORIGIN?.trim().replace(/\/+$/, '') ||
    DEFAULT_RUSTZEN_CLEAR_UPDATE_BLOB_ORIGIN;
  if (parsed.origin !== blobOrigin) {
    return assetUrl;
  }

  const pathname = parsed.pathname.replace(/^\/+/, '');
  if (!pathname.startsWith('rustzen-clear/releases/')) {
    return assetUrl;
  }

  const rewritten = new URL(`/api/updates/download/${pathname}`, request.nextUrl.origin);
  parsed.searchParams.forEach((value, key) => {
    rewritten.searchParams.set(key, value);
  });
  if (!rewritten.searchParams.has('download')) {
    rewritten.searchParams.set('download', '1');
  }

  return rewritten.toString();
}

function rewriteManifestDownloadUrls(request: NextRequest, manifest: unknown) {
  if (!manifest || typeof manifest !== 'object') {
    return manifest;
  }

  const candidate = manifest as {
    platforms?: Record<string, { url?: unknown }>;
  };

  if (!candidate.platforms || typeof candidate.platforms !== 'object') {
    return manifest;
  }

  const platforms = Object.fromEntries(
    Object.entries(candidate.platforms).map(([platform, value]) => {
      if (!value || typeof value !== 'object') {
        return [platform, value];
      }

      const entry = value as { url?: unknown };
      if (typeof entry.url !== 'string') {
        return [platform, value];
      }

      return [
        platform,
        {
          ...entry,
          url: cloudDownloadUrl(request, entry.url),
        },
      ];
    }),
  );

  return {
    ...candidate,
    platforms,
  };
}

export async function GET(request: NextRequest) {
  const url = manifestUrl();
  const result = await fetchManifest(url);
  if (result.ok) {
    return NextResponse.json(rewriteManifestDownloadUrls(request, result.manifest), {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  }

  return NextResponse.json(
    {
      error: 'update_manifest_unavailable',
      manifest_url: url,
      reason: result.error,
    },
    { status: result.status },
  );
}
