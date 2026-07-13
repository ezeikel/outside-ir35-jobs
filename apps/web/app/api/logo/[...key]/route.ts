import { get } from '@outside-ir35-jobs/storage';
import { NextResponse } from 'next/server';
import {
  ALLOWED_LOGO_MIME_TYPES,
  type AllowedLogoMime,
  LOGO_KEY_PREFIX,
} from '@/lib/logo/validate';

// Public image proxy for company logos. The R2 bucket is private (CVs/insurance
// are PII), so we can't hand out a public bucket URL. Instead this route streams
// the object with a long immutable cache. Keys are random UUIDs under
// jobs/logos/, so a stable /api/logo/<key> URL is fine to render on every public
// listing. Dev serves from the dev bucket, prod from prod (R2_BUCKET env).

const CONTENT_TYPE_BY_EXT: Record<string, AllowedLogoMime> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) => {
  const { key: segments } = await params;
  const key = segments.join('/');

  // Only serve objects under the logo prefix — never let this proxy read an
  // arbitrary R2 key (e.g. a contractor's private CV).
  if (!key.startsWith(LOGO_KEY_PREFIX)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  const contentType = CONTENT_TYPE_BY_EXT[ext];
  if (!contentType || !ALLOWED_LOGO_MIME_TYPES.includes(contentType)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const buffer = await get(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        // Keys are content-addressed-ish (random UUID per upload), so the bytes
        // at a key never change → cache hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    // Missing object (deleted / never existed) — 404, not a 500.
    return new NextResponse('Not found', { status: 404 });
  }
};
