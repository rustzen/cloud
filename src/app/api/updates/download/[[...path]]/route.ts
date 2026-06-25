import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_RUSTZEN_CLEAR_UPDATE_BLOB_ORIGIN =
  'https://zlobtosdpjhocxfj.public.blob.vercel-storage.com';

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

async function redirectToBlob(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const path = (params.path ?? []).join('/');

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
