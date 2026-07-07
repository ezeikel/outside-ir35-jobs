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

// The canonical web sign-in surface (mirrors the mobile /signin screen + the
// PTP / Chunky Crayon pattern): Google → Apple → Facebook OAuth, then an email
// magic-link. The app is usable anonymously; this is the opt-in "sign in to sync"
// surface. Providers are env-gated in auth.ts, so only the configured ones show
// (Apple/Facebook are hidden until their env is set). callbackUrl carries the
// user back to wherever they came from.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const SignInOptions = ({ callbackUrl }: { callbackUrl: string }) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const emailValid = EMAIL_RE.test(email.trim());

  // Which OAuth providers are configured (public flags mirror the server env
  // gating in auth.ts, so we never render a button that would 404).
  const appleEnabled =
    process.env.NEXT_PUBLIC_APPLE_ENABLED === '1' ||
    process.env.NODE_ENV !== 'production';
  const facebookEnabled =
    process.env.NEXT_PUBLIC_FACEBOOK_ENABLED === '1' ||
    process.env.NODE_ENV !== 'production';

  const sendMagicLink = async () => {
    if (!emailValid || sending) return;
    setSending(true);
    // NextAuth Resend provider — redirects to the verify-request page on send.
    await signIn('resend', { email: email.trim(), callbackUrl });
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="h-12 justify-center gap-3"
        onClick={() => signIn('google', { callbackUrl })}
      >
        <FontAwesomeIcon icon={faGoogle} className="text-[#EA4335]" />
        Continue with Google
      </Button>

      {appleEnabled ? (
        <Button
          type="button"
          className="h-12 justify-center gap-3 bg-black text-white hover:bg-black/90"
          onClick={() => signIn('apple', { callbackUrl })}
        >
          <FontAwesomeIcon icon={faApple} />
          Continue with Apple
        </Button>
      ) : null}

      {facebookEnabled ? (
        <Button
          type="button"
          className="h-12 justify-center gap-3 bg-[#1877F2] text-white hover:bg-[#1877F2]/90"
          onClick={() => signIn('facebook', { callbackUrl })}
        >
          <FontAwesomeIcon icon={faFacebookF} />
          Continue with Facebook
        </Button>
      ) : null}

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
    </div>
  );
};

export default SignInOptions;
