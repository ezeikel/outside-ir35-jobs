'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PostJobFormSchema } from '@/types';
import PostJobForm from '../forms/PostJobForm/PostJobForm';
import PostJobPreview from '../PostJobPreview/PostJobPreview';
import { Form } from '../ui/form';

// Where an in-progress post is stashed so it survives the sign-in round-trip. An
// anonymous user can fill the whole form; clicking Publish saves the draft here
// and sends them to /signin?callbackUrl=/job/post — on return we restore it and
// they can publish without re-typing anything. sessionStorage (not local) so the
// draft is scoped to the tab and doesn't linger forever.
const DRAFT_KEY = 'oir35.postJobDraft';

const PostJob = ({ canPublish }: { canPublish: boolean }) => {
  const form = useForm<z.infer<typeof PostJobFormSchema>>({
    resolver: zodResolver(PostJobFormSchema),
    defaultValues: {
      companyName: '',
      position: '',
      description: '',
      keywords: '',
      location: {
        address: '',
        placeId: '',
        coordinates: {
          lat: null,
          lng: null,
        },
      },
      companyLogo: '',
      dayRate: [0],
      howToApply: '',
      applicationEmail: '',
      workMode: undefined,
      ir35Signal: undefined,
      ir35Attested: false,
      companyTwitter: '',
      companyEmail: '',
      invoiceAddress: '',
    },
  });

  // Restore a draft saved before a sign-in redirect, then clear it. Runs once on
  // mount; if the user came back signed-in they see their filled form.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      form.reset(JSON.parse(saved));
    } catch {
      // Corrupt draft — ignore and start fresh.
    }
    window.sessionStorage.removeItem(DRAFT_KEY);
    // form is stable from useForm; restore only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Called by the form when an anonymous user hits Publish: stash the current
  // values so they survive the sign-in round-trip.
  const saveDraft = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form.getValues()));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {}
      <Form {...form}>
        <PostJobForm
          className="space-y-6"
          canPublish={canPublish}
          onSaveDraft={saveDraft}
        />
        <PostJobPreview />
      </Form>
    </div>
  );
};

export default PostJob;
