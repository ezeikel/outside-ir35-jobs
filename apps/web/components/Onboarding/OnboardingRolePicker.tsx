'use client';

import { PosterType, Role } from '@outside-ir35-jobs/db/types';
import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { setUserRole } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { OnboardingRoleSchema } from '@/types';
import cn from '@/utils/cn';

const ROLE_OPTIONS: { value: Role; title: string; blurb: string }[] = [
  {
    value: Role.JOB_SEEKER,
    title: 'I’m a contractor',
    blurb: 'Build a verified profile and find outside-IR35 contracts.',
  },
  {
    value: Role.JOB_POSTER,
    title: 'I’m hiring',
    blurb: 'Post roles and reach verified limited-company contractors.',
  },
];

const POSTER_TYPE_OPTIONS: { value: PosterType; label: string }[] = [
  { value: PosterType.DIRECT, label: 'Hiring directly (end client)' },
  { value: PosterType.RECRUITER, label: 'Recruiter / agency' },
];

// A selectable card wrapping a radio item — the whole card is the label.
const OptionCard = ({
  selected,
  title,
  blurb,
  value,
}: {
  selected: boolean;
  title: string;
  blurb?: string;
  value: string;
}) => (
  <Label
    className={cn(
      'flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 font-normal transition-colors hover:border-foreground/30',
      selected && 'border-foreground ring-1 ring-foreground',
    )}
  >
    <RadioGroupItem value={value} className="mt-1" />
    <span className="space-y-0.5">
      <span className="block text-base font-medium">{title}</span>
      {blurb && (
        <span className="block text-sm text-muted-foreground">{blurb}</span>
      )}
    </span>
  </Label>
);

// Surface the first Standard-Schema (zod) error for a field, once touched.
const fieldError = (meta: {
  isTouched: boolean;
  errors: unknown[];
}): string | null => {
  if (!meta.isTouched || meta.errors.length === 0) return null;
  const first = meta.errors[0] as { message?: string } | string;
  return typeof first === 'string' ? first : (first?.message ?? null);
};

const OnboardingRolePicker = () => {
  const router = useRouter();
  const { update } = useSession();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      role: undefined as Role | undefined,
      posterType: undefined as PosterType | undefined,
    },
    // The radio groups start unselected (undefined), so the form value type
    // carries `undefined`, while the zod schema's INPUT requires role set. The
    // schema is still the runtime validator (it runs at submit and the refine
    // surfaces the posterType error); the cast only bridges the input-type gap.
    validators: { onSubmit: OnboardingRoleSchema as never },
    onSubmit: async ({ value }) => {
      try {
        // The schema guarantees role is set (and posterType when hiring); assert
        // the non-undefined shape the action expects.
        await setUserRole(value as { role: Role; posterType?: PosterType });
        // Refresh the session so the header + gates see role/onboarded now.
        await update();
        router.push(value.role === Role.JOB_SEEKER ? '/profile' : '/jobs');
      } catch {
        toast({
          title: 'Something went wrong',
          description: 'We couldn’t save your choice. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-8"
    >
      <form.Field name="role">
        {(field) => {
          const error = fieldError(field.state.meta);
          return (
            <div>
              <RadioGroup
                onValueChange={(v) => field.handleChange(v as Role)}
                value={field.state.value}
                className="gap-3"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    value={opt.value}
                    title={opt.title}
                    blurb={opt.blurb}
                    selected={field.state.value === opt.value}
                  />
                ))}
              </RadioGroup>
              {error ? (
                <p className="mt-2 text-sm text-destructive">{error}</p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      {/* posterType only when hiring — reactively shown from the role value. */}
      <form.Subscribe selector={(s) => s.values.role}>
        {(role) =>
          role === Role.JOB_POSTER ? (
            <form.Field name="posterType">
              {(field) => {
                const error = fieldError(field.state.meta);
                return (
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      Are you hiring directly or recruiting?
                    </p>
                    <RadioGroup
                      onValueChange={(v) => field.handleChange(v as PosterType)}
                      value={field.state.value}
                      className="gap-3"
                    >
                      {POSTER_TYPE_OPTIONS.map((opt) => (
                        <OptionCard
                          key={opt.value}
                          value={opt.value}
                          title={opt.label}
                          selected={field.state.value === opt.value}
                        />
                      ))}
                    </RadioGroup>
                    {error ? (
                      <p className="mt-2 text-sm text-destructive">{error}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>
          ) : null
        }
      </form.Subscribe>

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Continue'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
};

export default OnboardingRolePicker;
