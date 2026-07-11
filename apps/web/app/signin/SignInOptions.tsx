'use client';

import {
  faApple,
  faFacebookF,
  faGoogle,
} from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/pro-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TRACKING_EVENTS } from '@/constants';
import { useAnalytics } from '@/utils/analytics-client';

// The canonical web sign-in surface (mirrors the mobile /signin screen + the
// PTP / Chunky Crayon pattern): Google → Apple → Facebook OAuth, then an email
// magic-link. The app is usable anonymously; this is the opt-in "sign in to sync"
// surface. Which providers show is computed SERVER-SIDE from the real env (see
// `configuredProviders` in auth.ts) and passed in, so only providers that will
// actually work render — no NEXT_PUBLIC_* flags to keep in sync. callbackUrl
// carries the user back to wherever they came from.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ConfiguredProviders = {
  google: boolean;
  apple: boolean;
  facebook: boolean;
  resend: boolean;
};

const SignInOptions = ({
  callbackUrl,
  providers,
}: {
  callbackUrl: string;
  providers: ConfiguredProviders;
}) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const emailValid = EMAIL_RE.test(email.trim());
  const { track } = useAnalytics();

  const sendMagicLink = async () => {
    if (!emailValid || sending) return;
    setSending(true);
    track(TRACKING_EVENTS.SIGNIN_STARTED, {
      method: 'magic_link',
      location: 'signin_page',
    });
    // NextAuth Resend provider — redirects to the verify-request page on send.
    await signIn('resend', { email: email.trim(), callbackUrl });
  };

  // OAuth start: fire the funnel event, then hand off to NextAuth (which
  // redirects the browser to the provider).
  const startOAuth = (
    provider: 'google' | 'apple' | 'facebook',
    method: 'google' | 'apple' | 'facebook',
  ) => {
    track(TRACKING_EVENTS.SIGNIN_STARTED, { method, location: 'signin_page' });
    void signIn(provider, { callbackUrl });
  };

  return (
    <div className="flex flex-col gap-3">
      {providers.google ? (
        <Button
          type="button"
          variant="outline"
          className="h-12 justify-center gap-3"
          onClick={() => startOAuth('google', 'google')}
        >
          <FontAwesomeIcon icon={faGoogle} className="text-[#EA4335]" />
          Continue with Google
        </Button>
      ) : null}

      {providers.apple ? (
        <Button
          type="button"
          className="h-12 justify-center gap-3 bg-black text-white hover:bg-black/90"
          onClick={() => startOAuth('apple', 'apple')}
        >
          <FontAwesomeIcon icon={faApple} />
          Continue with Apple
        </Button>
      ) : null}

      {providers.facebook ? (
        <Button
          type="button"
          className="h-12 justify-center gap-3 bg-[#1877F2] text-white hover:bg-[#1877F2]/90"
          onClick={() => startOAuth('facebook', 'facebook')}
        >
          <FontAwesomeIcon icon={faFacebookF} />
          Continue with Facebook
        </Button>
      ) : null}

      {providers.resend ? (
        <>
          <div className="my-2 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              or continue with email
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-3">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void sendMagicLink();
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-12 justify-center gap-3"
              disabled={!emailValid || sending}
              onClick={() => void sendMagicLink()}
            >
              <FontAwesomeIcon icon={faEnvelope} />
              {sending ? 'Sending…' : 'Email me a sign-in link'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default SignInOptions;
