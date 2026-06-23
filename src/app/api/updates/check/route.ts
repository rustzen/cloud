import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function manifestUrl() {
  return process.env.RUSTZEN_CLEAR_UPDATE_MANIFEST_URL?.trim() || '';
}

export async function GET(_request: NextRequest) {
  const url = manifestUrl();
  if (!url) {
    return NextResponse.json({ error: 'update_manifest_not_configured' }, { status: 503 });
  }

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'update_manifest_unavailable', status: response.status },
      { status: 502 },
    );
  }

  const manifest = await response.json().catch(() => null);
  if (!manifest || typeof manifest !== 'object') {
    return NextResponse.json({ error: 'invalid_update_manifest' }, { status: 502 });
  }

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
