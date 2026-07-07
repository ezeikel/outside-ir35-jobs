import { faTriangleExclamation } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Metadata } from 'next';
import Link from 'next/link';
import PageWrap from '@/components/PageWrap/PageWrap';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Sign-in problem',
};

// Branded auth error page (NextAuth routes here on a failed/expired sign-in).
// Keeps the copy calm and gives one clear way back to /signin.
const AuthErrorPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) => {
  const { error } = await searchParams;
  const message =
    error === 'Verification'
      ? 'This sign-in link is invalid or has expired. Request a new one.'
      : 'We couldn’t sign you in. Please try again.';

  return (
    <PageWrap>
      <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16 sm:px-6">
        <Card>
          <CardHeader className="items-center text-center">
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className="mb-2 text-5xl text-destructive"
            />
            <CardTitle className="text-3xl">Something went wrong</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/signin" className="text-primary underline">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageWrap>
  );
};

export default AuthErrorPage;
