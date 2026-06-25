import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_RUSTZEN_CLEAR_UPDATE_BLOB_ORIGIN =
  'https://zlobtosdpjhocxfj.public.blob.vercel-storage.com';
const DEFAULT_RUSTZEN_CLEAR_UPDATE_MANIFEST_URL =
  'https://zlobtosdpjhocxfj.public.blob.vercel-storage.com/rustzen-clear/releases/latest/zen-clear-updates.json';
const MANIFEST_FETCH_TIMEOUT_MS = 8_000;

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

function blobOrigin() {
  return (
    process.env.RUSTZEN_CLEAR_UPDATE_BLOB_ORIGIN?.trim().replace(/\/+$/, '') ||
    DEFAULT_RUSTZEN_CLEAR_UPDATE_BLOB_ORIGIN
  );
}

function isAllowedPath(path: string) {
  return /^rustzen-clear\/releases\/[^/]+\/[^/]+\.app\.tar\.gz$/.test(path);
}

function manifestUrl() {
  return (
    process.env.RUSTZEN_CLEAR_UPDATE_MANIFEST_URL?.trim() ||
    DEFAULT_RUSTZEN_CLEAR_UPDATE_MANIFEST_URL
  );
}

async function fetchManifest() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MANIFEST_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(manifestUrl(), {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json().catch(() => null)) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function latestAssetUrl(manifest: unknown, platform: string) {
  if (!manifest || typeof manifest !== 'object') {
    return null;
  }

  const platforms = (manifest as { platforms?: unknown }).platforms;
  if (!platforms || typeof platforms !== 'object') {
    return null;
  }

  const entries = platforms as Record<string, { url?: unknown }>;
  const preferredEntry = entries[platform] ?? entries['darwin-universal'] ?? entries['darwin-aarch64'];
  const url = preferredEntry?.url;

  return typeof url === 'string' ? url : null;
}

function cloudDownloadUrl(request: NextRequest, assetUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(assetUrl);
  } catch {
    return null;
  }

  if (parsed.origin !== blobOrigin()) {
    return parsed;
  }

  const pathname = parsed.pathname.replace(/^\/+/, '');
  if (!isAllowedPath(pathname)) {
    return null;
  }

  const rewritten = new URL(`/api/updates/download/${pathname}`, request.nextUrl.origin);
  parsed.searchParams.forEach((value, key) => {
    rewritten.searchParams.set(key, value);
  });

  return rewritten;
}

async function redirectToLatest(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get('platform') ?? 'darwin-universal';
  const manifest = await fetchManifest();
  const assetUrl = latestAssetUrl(manifest, platform);

  if (!assetUrl) {
    return NextResponse.json({ error: 'latest_update_asset_not_found' }, { status: 404 });
  }

  const target = cloudDownloadUrl(request, assetUrl);
  if (!target) {
    return NextResponse.json({ error: 'latest_update_asset_not_found' }, { status: 404 });
  }

  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== 'platform') {
      target.searchParams.set(key, value);
    }
  });
  if (!target.searchParams.has('download')) {
    target.searchParams.set('download', '1');
  }

  return NextResponse.redirect(target, 302);
}

async function redirectToBlob(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const path = (params.path ?? []).join('/');

  if (path === 'latest') {
    return redirectToLatest(request);
  }

  if (!isAllowedPath(path)) {
    return NextResponse.json({ error: 'update_asset_not_found' }, { status: 404 });
  }

  const target = new URL(`${blobOrigin()}/${path}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  if (!target.searchParams.has('download')) {
    target.searchParams.set('download', '1');
  }

  return NextResponse.redirect(target, 302);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return redirectToBlob(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return redirectToBlob(request, context);
}
