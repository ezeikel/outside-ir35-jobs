'use client';

import { useForm } from '@tanstack/react-form';
import { PostJobFormSchema, type PostJobFormValues } from '@/types';

// The default form value — matches PostJobFormSchema's shape. Enum fields start
// undefined (nothing selected) and are validated on submit.
export const POST_JOB_DEFAULTS = {
  companyName: '',
  position: '',
  description: '',
  keywords: '',
  location: {
    address: '',
    placeId: '',
    coordinates: { lat: null as number | null, lng: null as number | null },
  },
  companyLogo: '',
  dayRate: [0] as number[],
  howToApply: '',
  applicationEmail: '',
  workMode: undefined as PostJobFormValues['workMode'] | undefined,
  ir35Signal: undefined as PostJobFormValues['ir35Signal'] | undefined,
  ir35Attested: false,
  companyTwitter: '',
  companyEmail: '',
  invoiceAddress: '',
};

/**
 * Single TanStack Form instance for the whole post-a-job tree. Extracted into a
 * hook so its (heavily generic) return type can be reused as `PostJobFormApi`
 * and threaded to the fields + preview via props — TanStack has no
 * FormProvider/useFormContext.
 *
 * The submit handler is passed in (it needs component scope: router/analytics/
 * canPublish). Both the validator AND onSubmit live in this single useForm
 * config — the canonical wiring, so `form.handleSubmit()` runs the schema first
 * and only calls onSubmit when it passes. The server re-validates in
 * createJobPost regardless.
 */
export const usePostJobForm = (
  onValidSubmit: (values: PostJobFormValues) => void | Promise<void>,
) =>
  useForm({
    defaultValues: POST_JOB_DEFAULTS,
    // Enum fields start undefined so the form value type diverges from the
    // schema's input; the schema is still the runtime validator (cast bridges
    // the type gap, exactly as on the other migrated forms).
    validators: { onSubmit: PostJobFormSchema as never },
    onSubmit: async ({ value }) => {
      await onValidSubmit(value as PostJobFormValues);
    },
  });

// The concrete form-instance type — reused by every child so we never have to
// spell out TanStack's 12-generic ReactFormExtendedApi by hand.
export type PostJobFormApi = ReturnType<typeof usePostJobForm>;
