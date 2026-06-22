import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_RUSTZEN_CLEAR_MANIFEST_URL =
  'https://github.com/rustzen/rustzen-clear/releases/latest/download/zen-clear-updates.json';

function manifestUrl() {
  return process.env.RUSTZEN_CLEAR_UPDATE_MANIFEST_URL || DEFAULT_RUSTZEN_CLEAR_MANIFEST_URL;
}

export async function GET(_request: NextRequest) {
  const response = await fetch(manifestUrl(), {
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
