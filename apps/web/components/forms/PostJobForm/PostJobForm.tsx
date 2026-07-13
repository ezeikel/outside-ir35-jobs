import { JobIR35Signal, WorkMode } from '@outside-ir35-jobs/db/types';
import { useEffect, useState } from 'react';
import { draftJobSpec } from '@/app/actions';
import type { PostJobFormApi } from '@/components/PostJob/usePostJobForm';
import TipTapEditor from '@/components/TipTapEditor/TipTapEditor';
import { Button } from '@/components/ui/button';
import FormField from '@/components/ui/FormField';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import cn from '@/utils/cn';
import CompanyLogoInput from './CompanyLogoInput';
import DayRateInputs from './DayRateInputs';
import LocationInput from './LocationInput';

// Honest labels for the poster-selectable IR35 signal — always the CLIENT's
// position, never an assertion by us.
const IR35_OPTIONS: { value: JobIR35Signal; label: string }[] = [
  {
    value: JobIR35Signal.CLIENT_INTENDS_OUTSIDE,
    label: 'Client states: outside IR35',
  },
  { value: JobIR35Signal.SDS_ISSUED, label: 'Outside · SDS issued by client' },
  {
    value: JobIR35Signal.CONTRACT_REVIEW_HELD,
    label: 'Outside · IR35 contract review held',
  },
  {
    value: JobIR35Signal.SMALL_CLIENT_EXEMPT,
    label: 'Small client · contractor self-determines',
  },
  { value: JobIR35Signal.UNKNOWN, label: 'Not stated' },
  { value: JobIR35Signal.INSIDE, label: 'Inside IR35' },
];

interface PostJobFormProps {
  form: PostJobFormApi;
  className?: string;
  // Submission (validation + checkout/sign-in routing) lives in the PostJob
  // container; the form only renders + reports its state. These reflect that.
  submitError: string | null;
  submitting: boolean;
}

const PostJobForm = ({
  form,
  className,
  submitError,
  submitting,
}: PostJobFormProps) => {
  const [descriptionContent, setDescriptionContent] = useState('');
  const [howToApplyContent, setHowToApplyContent] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Draft the description / how-to-apply / keywords from the title + a few fields.
  const draftWithAi = async () => {
    setDraftError(null);
    const values = form.state.values;
    if (!values.position?.trim()) {
      setDraftError('Add a role title first.');
      return;
    }
    setDrafting(true);
    try {
      const draft = await draftJobSpec({
        position: values.position,
        skills: values.keywords,
        workMode: values.workMode,
        dayRate: Array.isArray(values.dayRate)
          ? values.dayRate.join('–')
          : undefined,
        location: values.location?.address,
      });
      setDescriptionContent(draft.description);
      setHowToApplyContent(draft.howToApply);
      if (draft.keywords) form.setFieldValue('keywords', draft.keywords);
    } catch (e) {
      setDraftError(
        e instanceof Error ? e.message : 'Could not draft right now.',
      );
    } finally {
      setDrafting(false);
    }
  };

  // Keep the TipTap-editor values mirrored into the form (they render outside a
  // form.Field, so they push their content in on change).
  useEffect(() => {
    form.setFieldValue('description', descriptionContent);
  }, [descriptionContent, form]);

  useEffect(() => {
    form.setFieldValue('howToApply', howToApplyContent);
  }, [howToApplyContent, form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Runs the schema (form-level onSubmit validator); our registered
        // onSubmit handler fires only if it passes.
        void form.handleSubmit();
      }}
      className={cn({
        [className as string]: !!className,
      })}
    >
      <form.Field name="companyName">
        {(field) => (
          <FormField
            field={field}
            label="Company Name"
            placeholder="Enter your company name"
          />
        )}
      </form.Field>

      <form.Field name="position">
        {(field) => (
          <FormField
            field={field}
            label="Position"
            placeholder="Enter the job position"
          />
        )}
      </form.Field>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label htmlFor="description">Job Description</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={draftWithAi}
            disabled={drafting}
          >
            {drafting ? 'Drafting…' : '✦ Draft with AI'}
          </Button>
        </div>
        {draftError ? (
          <p className="mb-1 text-sm text-destructive">{draftError}</p>
        ) : null}
        <p className="mb-2 text-xs text-muted-foreground">
          Drafts the description, how-to-apply and keywords from your title and
          details. It never claims a role is outside IR35. You set your IR35
          position below.
        </p>
        <TipTapEditor
          content={descriptionContent}
          placeholder="Enter the job description"
          onChange={(c: string) => {
            setDescriptionContent(c);
          }}
        />
      </div>

      <form.Field name="keywords">
        {(field) => (
          <FormField
            field={field}
            label="Keywords"
            placeholder="Enter relevant keywords (e.g. React, Node.js)"
          />
        )}
      </form.Field>

      <LocationInput form={form} />

      <CompanyLogoInput form={form} />

      <DayRateInputs form={form} />

      <div>
        <Label className="block mb-1" htmlFor="howToApply">
          How to Apply
        </Label>
        <TipTapEditor
          content={howToApplyContent}
          placeholder="Enter instructions on how to apply for this job"
          onChange={(c: string) => {
            setHowToApplyContent(c);
          }}
        />
      </div>

      <form.Field name="applicationEmail">
        {(field) => (
          <FormField
            field={field}
            label="Email to get job applications"
            type="email"
            placeholder="Apply email address"
          />
        )}
      </form.Field>

      <form.Field name="workMode">
        {(field) => (
          <div>
            <Label className="block mb-1">Work Mode</Label>
            <RadioGroup
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v as WorkMode)}
              className="flex items-center gap-4"
            >
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value={WorkMode.REMOTE} />
                Remote
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value={WorkMode.HYBRID} />
                Hybrid
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value={WorkMode.ON_SITE} />
                On-site
              </Label>
            </RadioGroup>
          </div>
        )}
      </form.Field>

      <form.Field name="ir35Signal">
        {(field) => (
          <div>
            <Label className="block mb-1">IR35 position</Label>
            <Select
              value={field.state.value as string | undefined}
              onValueChange={(v) => field.handleChange(v as JobIR35Signal)}
            >
              <SelectTrigger aria-label="IR35 position">
                <SelectValue placeholder="What does the client say about IR35?" />
              </SelectTrigger>
              <SelectContent>
                {IR35_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      <form.Field name="ir35Attested">
        {(field) => {
          const first = field.state.meta.errors[0] as unknown;
          const error =
            field.state.meta.isTouched && field.state.meta.errors.length > 0
              ? ((first as { message?: string } | undefined)?.message ?? null)
              : null;
          return (
            <div>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                  checked={Boolean(field.state.value)}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  onBlur={field.handleBlur}
                />
                <span className="text-muted-foreground">
                  I confirm this reflects the client&rsquo;s stated IR35
                  position. The platform does not determine, verify or warrant
                  IR35 status. The SDS is the client&rsquo;s legal
                  responsibility.
                </span>
              </label>
              {error ? (
                <p className="mt-1 text-sm text-destructive">{error}</p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="companyTwitter">
        {(field) => (
          <FormField
            field={field}
            label="Company Twitter (Optional)"
            placeholder="Enter your company's Twitter handle"
          />
        )}
      </form.Field>

      <form.Field name="companyEmail">
        {(field) => (
          <FormField
            field={field}
            label="Company Email (stays private, for invoices)"
            type="email"
            placeholder="Enter your company email"
          />
        )}
      </form.Field>

      <form.Field name="invoiceAddress">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Invoice Address</Label>
            <textarea
              id={field.name}
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Enter your invoice address"
              value={field.state.value ?? ''}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </div>
        )}
      </form.Field>

      <div className="flex flex-col items-end gap-2">
        <Button
          className="bg-primary text-white"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Redirecting to payment…' : 'Post Job - £219'}
        </Button>
        {/* After a submit attempt, show a hint if the schema blocked it (the
            required fields below aren't inline-erroring: work mode, IR35
            position and the attestation). */}
        <form.Subscribe
          selector={(s) => ({
            tried: s.submissionAttempts > 0,
            valid: s.isValid,
          })}
        >
          {({ tried, valid }) =>
            tried && !valid ? (
              <p className="text-sm text-destructive">
                Please set the work mode, IR35 position and confirm the
                attestation before posting.
              </p>
            ) : null
          }
        </form.Subscribe>
        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          You’ll be taken to secure checkout. Your listing goes live once
          payment is confirmed.
        </p>
      </div>
    </form>
  );
};

export default PostJobForm;
