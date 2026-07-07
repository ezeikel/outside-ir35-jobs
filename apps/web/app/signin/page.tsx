import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, configuredProviders } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import SignInOptions from './SignInOptions';

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to sync across devices, apply with your verified profile, and get alerts for new Outside IR35 contracts.',
};

// Dedicated sign-in page — the one place to sign in on web (linked from the
// header, apply/save prompts, etc.). Browsing the board is anonymous; this is the
// opt-in "sign in to sync" surface, matching the mobile /signin screen and the
// PTP / Chunky Crayon pattern. Already-signed-in users are bounced to their
// destination.
const SignInPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) => {
  const { callbackUrl } = await searchParams;
  const session = await auth();
  const dest = callbackUrl || '/';
  if (session?.userId) redirect(dest);

  return (
    <PageWrap>
      <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Sign in</CardTitle>
            <CardDescription>
              Sync across devices, apply with your verified profile, save
              searches, and get alerts for new Outside IR35 contracts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInOptions callbackUrl={dest} providers={configuredProviders} />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our{' '}
              <Link href="/terms" className="underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </PageWrap>
  );
};

export default SignInPage;
