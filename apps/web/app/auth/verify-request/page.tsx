import { faEnvelopeCircleCheck } from '@fortawesome/pro-duotone-svg-icons';
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
  title: 'Check your email',
};

// "Check your inbox" confirmation, shown after requesting a magic link (NextAuth
// redirects here from the Resend provider). Mirrors the mobile check-inbox state
// and the PTP / Chunky Crayon pattern.
const VerifyRequestPage = () => (
  <PageWrap>
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16 sm:px-6">
      <Card>
        <CardHeader className="items-center text-center">
          <FontAwesomeIcon
            icon={faEnvelopeCircleCheck}
            className="mb-2 text-5xl text-primary"
          />
          <CardTitle className="text-3xl">Check your email</CardTitle>
          <CardDescription>
            We sent a sign-in link to your email address. Click the link to
            finish signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>Don’t see it? Check your spam folder.</p>
          <p className="mt-1">The link expires in 15 minutes for security.</p>
          <p className="mt-6">
            <Link href="/signin" className="text-primary underline">
              Use a different email
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  </PageWrap>
);

export default VerifyRequestPage;
