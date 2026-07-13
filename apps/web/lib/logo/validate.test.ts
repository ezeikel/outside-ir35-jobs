import { describe, expect, it } from 'vitest';
import {
  extForLogoMime,
  LOGO_KEY_PREFIX,
  logoSrc,
  MAX_LOGO_BYTES,
  validateLogoUpload,
} from './validate';

describe('validateLogoUpload', () => {
  it('accepts a small PNG', () => {
    const r = validateLogoUpload({ mimeType: 'image/png', size: 50_000 });
    expect(r).toEqual({ ok: true, mime: 'image/png' });
  });

  it('accepts jpeg/webp/gif', () => {
    for (const mime of ['image/jpeg', 'image/webp', 'image/gif']) {
      expect(validateLogoUpload({ mimeType: mime, size: 1000 }).ok).toBe(true);
    }
  });

  it('rejects a PDF', () => {
    const r = validateLogoUpload({ mimeType: 'application/pdf', size: 1000 });
    expect(r.ok).toBe(false);
  });

  it('rejects SVG (stored-XSS vector on our own origin)', () => {
    const r = validateLogoUpload({ mimeType: 'image/svg+xml', size: 1000 });
    expect(r.ok).toBe(false);
  });

  it('rejects an empty file', () => {
    expect(validateLogoUpload({ mimeType: 'image/png', size: 0 }).ok).toBe(
      false,
    );
  });

  it('rejects a file over the 2 MB cap', () => {
    const r = validateLogoUpload({
      mimeType: 'image/png',
      size: MAX_LOGO_BYTES + 1,
    });
    expect(r.ok).toBe(false);
  });

  it('accepts a file exactly at the cap', () => {
    expect(
      validateLogoUpload({ mimeType: 'image/png', size: MAX_LOGO_BYTES }).ok,
    ).toBe(true);
  });
});

describe('extForLogoMime', () => {
  it('maps each mime to a stable extension', () => {
    expect(extForLogoMime('image/jpeg')).toBe('jpg');
    expect(extForLogoMime('image/png')).toBe('png');
    expect(extForLogoMime('image/webp')).toBe('webp');
    expect(extForLogoMime('image/gif')).toBe('gif');
  });
});

describe('logoSrc', () => {
  it('routes an R2 key through the proxy', () => {
    const key = `${LOGO_KEY_PREFIX}abc-123.png`;
    expect(logoSrc(key)).toBe(`/api/logo/${key}`);
  });

  it('returns a full URL unchanged (legacy/external logos)', () => {
    const url = 'https://cdn.example.com/logo.png';
    expect(logoSrc(url)).toBe(url);
  });

  it('returns null for empty/nullish', () => {
    expect(logoSrc('')).toBeNull();
    expect(logoSrc(null)).toBeNull();
    expect(logoSrc(undefined)).toBeNull();
  });
});
