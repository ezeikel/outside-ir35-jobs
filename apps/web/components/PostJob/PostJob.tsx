'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createJobPost } from '@/app/actions';
import { TRACKING_EVENTS } from '@/constants';
import type { PostJobFormValues } from '@/types';
import { useAnalytics } from '@/utils/analytics-client';
import PostJobForm from '../forms/PostJobForm/PostJobForm';
import PostJobPreview from '../PostJobPreview/PostJobPreview';
import { POST_JOB_DEFAULTS, usePostJobForm } from './usePostJobForm';

// Where an in-progress post is stashed so it survives the sign-in round-trip. An
// anonymous user can fill the whole form; clicking Publish saves the draft here
// and sends them to /signin?callbackUrl=/job/post — on return we restore it and
// they can publish without re-typing anything. sessionStorage (not local) so the
// draft is scoped to the tab and doesn't linger forever.
const DRAFT_KEY = 'oir35.postJobDraft';

const PostJob = ({ canPublish }: { canPublish: boolean }) => {
  const router = useRouter();
  const { track } = useAnalytics();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Runs ONLY after the schema validates (TanStack calls it from handleSubmit
  // once the form-level validator passes). Lives here so it has router/analytics
  // /canPublish in scope; the form + hook stay presentational.
  const onValidSubmit = async (values: PostJobFormValues) => {
    // Top of the paid-posting funnel — fired on every valid submit (both the
    // sign-in-first path and the checkout path start the post flow here).
    track(TRACKING_EVENTS.JOB_POST_STARTED, {
      surface: 'web',
      workMode: values.workMode ?? null,
      ir35Signal: values.ir35Signal ?? null,
    });

    // Anonymous (or not-yet-onboarded) poster: they've filled a valid form but
    // can't publish yet. Stash the draft and send them to sign in — they return
    // to the restored form and publish without re-typing. No wall to START.
    if (!canPublish) {
      saveDraft();
      router.push('/signin?callbackUrl=/job/post');
      return;
    }

    // createJobPost creates the job unpublished and returns a Stripe Checkout
    // URL; the job only goes live after payment (webhook). On failure surface a
    // message rather than leaving the button stuck on "Redirecting…".
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { checkoutUrl } = await createJobPost(values);
      window.location.assign(checkoutUrl);
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e.message
          : 'Could not start checkout. Please try again.',
      );
      setSubmitting(false);
    }
  };

  const form = usePostJobForm(onValidSubmit);

  // Restore a draft saved before a sign-in redirect, then clear it. Runs once on
  // mount; if the user came back signed-in they see their filled form.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      // Merge over defaults so a partial draft still has every field present.
      form.reset({ ...POST_JOB_DEFAULTS, ...draft });
    } catch {
      // Corrupt draft — ignore and start fresh.
    }
    window.sessionStorage.removeItem(DRAFT_KEY);
    // form is stable from useForm; restore only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stash the current values so an anonymous poster's draft survives sign-in.
  const saveDraft = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form.state.values));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <PostJobForm
        form={form}
        className="space-y-6"
        submitError={submitError}
        submitting={submitting}
      />
      <PostJobPreview form={form} />
    </div>
  );
};

export default PostJob;
