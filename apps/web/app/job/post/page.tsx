import type { Viewport } from 'next';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import PostJob from '@/components/PostJob/PostJob';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const JobPostPage = async () => {
  const session = await auth();

  // Anonymous-first: anyone can OPEN and fill the post form (no wall) — the ask
  // for an account comes only at Publish. A signed-in poster who's ready submits
  // straight to checkout; an anonymous user's draft is preserved and they're
  // sent to /signin, returning to the filled form. The createJobPost action is
  // the real guard (it requires a signed-in, onboarded user server-side).
  const canPublish = !!session?.userId && !!session.onboarded;

  return (
    <PageWrap>
      {/* Location autocomplete is handled by Mapbox inside PostJob's
          LocationInput (self-contained — no global script to load). */}
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8 max-w-xl">
          <h1 className="text-4xl leading-none">Post a contract</h1>
          <p className="mt-2 text-muted-foreground">
            Reach UK limited-company contractors who only want outside-IR35
            work. Day rate, mode and your IR35 position, shown up front.
          </p>
        </header>
        <PostJob canPublish={canPublish} />
      </div>
    </PageWrap>
  );
};

export default JobPostPage;
