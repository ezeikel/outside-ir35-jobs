'use client';

import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TRACKING_EVENTS } from '@/constants';
import { useAnalytics } from '@/utils/analytics-client';

// Shared search shape. Both fields optional — an empty search is "show me
// everything", which the board handles. Kept here (not types.ts) for now; a
// future packages/schemas move would let mobile import it too.
const HeroSearchSchema = z.object({
  q: z.string().trim().max(120),
  location: z.string().trim().max(120),
});

/**
 * Hero search — role + location, submits to the board (/jobs?q=&location=).
 * Built on TanStack Form + Zod to match the mobile app's form stack. It's a
 * GET-style navigation, so validation is light (length caps); the board itself
 * handles empty/partial queries.
 */
const HeroSearch = () => {
  const router = useRouter();
  const { track } = useAnalytics();

  const form = useForm({
    defaultValues: { q: '', location: '' },
    validators: { onChange: HeroSearchSchema },
    onSubmit: ({ value }) => {
      const params = new URLSearchParams();
      if (value.q) params.set('q', value.q);
      if (value.location) params.set('location', value.location);
      track(TRACKING_EVENTS.JOB_SEARCH_PERFORMED, {
        hasQuery: Boolean(value.q),
        resultCount: 0, // resolved on the board; hero only knows intent
        location: value.location || null,
      });
      const qs = params.toString();
      router.push(qs ? `/jobs?${qs}` : '/jobs');
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center sm:rounded-full sm:bg-white sm:p-1.5 sm:shadow-lg"
    >
      <form.Field name="q">
        {(field) => (
          <Input
            aria-label="Role, skill or company"
            className="flex-1 border-transparent bg-white text-foreground placeholder:text-muted-foreground sm:border-0 sm:bg-transparent sm:shadow-none sm:focus-visible:ring-0"
            placeholder="Role, skill or company"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <div className="hidden w-px self-stretch bg-border sm:block" />

      <form.Field name="location">
        {(field) => (
          <Input
            aria-label="Location"
            className="flex-1 border-transparent bg-white text-foreground placeholder:text-muted-foreground sm:border-0 sm:bg-transparent sm:shadow-none sm:focus-visible:ring-0"
            placeholder="Location (or remote)"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <Button type="submit" className="sm:rounded-full sm:px-6">
        Search contracts
      </Button>
    </form>
  );
};

export default HeroSearch;
