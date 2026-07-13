/**
 * Validation for company-logo image uploads (post-a-job). Pure logic (no
 * Prisma/Next/R2) so it's unit-testable and shared by the web action + the
 * mobile route. A logo is small public-facing branding, so the rules are
 * tighter than the compliance-doc uploader: images only, a low size cap.
 */

// The R2 key prefix + the public serving route. A stored companyLogo that
// starts with this prefix is an R2 key served via /api/logo/<key>; any other
// value (a full https URL) is rendered as-is (backward-compatible with older
// rows and external logos).
export const LOGO_KEY_PREFIX = 'jobs/logos/';
export const LOGO_ROUTE_PREFIX = '/api/logo/';

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB — a logo, not a hero image

// Image types a browser <img> renders reliably. SVG is intentionally excluded:
// it can carry scripts, and we serve logos from our own origin, so an SVG logo
// would be a stored-XSS vector.
export const ALLOWED_LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type AllowedLogoMime = (typeof ALLOWED_LOGO_MIME_TYPES)[number];

export const isAllowedLogoMime = (mime: string): mime is AllowedLogoMime =>
  (ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(mime);

// File extension for a given mime, used to build the R2 key. Keeps the stored
// extension consistent with the content-type the serving route sets.
export const extForLogoMime = (mime: AllowedLogoMime): string =>
  mime === 'image/jpeg'
    ? 'jpg'
    : mime === 'image/png'
      ? 'png'
      : mime === 'image/webp'
        ? 'webp'
        : 'gif';

export type LogoValidation =
  | { ok: true; mime: AllowedLogoMime }
  | { ok: false; error: string };

/**
 * Validate a candidate logo upload. Order: mime → size (cheapest first).
 */
export const validateLogoUpload = (input: {
  mimeType: string;
  size: number;
}): LogoValidation => {
  if (!isAllowedLogoMime(input.mimeType)) {
    return { ok: false, error: 'Logo must be a PNG, JPG, WEBP or GIF image.' };
  }
  if (input.size <= 0) {
    return { ok: false, error: 'The logo file is empty.' };
  }
  if (input.size > MAX_LOGO_BYTES) {
    return { ok: false, error: 'Logo must be 2 MB or smaller.' };
  }
  return { ok: true, mime: input.mimeType };
};

/**
 * Resolve a stored companyLogo value to a browser-usable <img src>. An R2 key
 * (starts with LOGO_KEY_PREFIX) becomes the proxy route; anything else (a full
 * URL, or empty) is returned unchanged.
 */
export const logoSrc = (stored: string | null | undefined): string | null => {
  if (!stored) return null;
  if (stored.startsWith(LOGO_KEY_PREFIX))
    return `${LOGO_ROUTE_PREFIX}${stored}`;
  return stored;
};
