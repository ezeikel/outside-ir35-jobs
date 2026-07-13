'use client';

import { useState } from 'react';
import { uploadCompanyLogo } from '@/app/actions';
import type { PostJobFormApi } from '@/components/PostJob/usePostJobForm';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  logoSrc,
  MAX_LOGO_BYTES,
  validateLogoUpload,
} from '@/lib/logo/validate';

// Minimal structural type for the companyLogo field — enough to bind + read it
// without spelling out TanStack's full generic FieldApi.
type LogoFieldApi = {
  name: string;
  state: { value: string };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};

// The actual field UI as a real component so hooks are legal (a form.Field
// children render-prop is a callback, not a component — hooks can't live there).
const LogoField = ({ field }: { field: LogoFieldApi }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = logoSrc(field.state.value);

  const onFile = async (file: File) => {
    setError(null);
    // Validate client-side for instant feedback (the action re-checks server-side).
    const check = validateLogoUpload({ mimeType: file.type, size: file.size });
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const { key } = await uploadCompanyLogo(body);
      field.handleChange(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload the logo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>Company Logo</Label>
      <div className="flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Company logo preview"
            className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
            Logo
          </div>
        )}
        <div className="grid gap-1">
          <input
            id={field.name}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading}
            className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
            onBlur={field.handleBlur}
          />
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WEBP or GIF, up to{' '}
            {Math.round(MAX_LOGO_BYTES / (1024 * 1024))} MB.
          </p>
        </div>
        {field.state.value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => field.handleChange('')}
          >
            Remove
          </Button>
        ) : null}
      </div>
      {uploading ? (
        <p className="text-xs text-muted-foreground">Uploading logo…</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
};

/**
 * Company-logo upload for the post-a-job form. On file-select it uploads to R2
 * (via the uploadCompanyLogo action) and stores the returned R2 KEY on the form
 * field — not a data URL or filename. The listing renders it through the
 * /api/logo/<key> proxy (see logoSrc). The field value is the key, so it
 * round-trips through the sign-in draft save like every other field.
 */
const CompanyLogoInput = ({ form }: { form: PostJobFormApi }) => (
  <form.Field name="companyLogo">
    {(field) => <LogoField field={field} />}
  </form.Field>
);

export default CompanyLogoInput;
