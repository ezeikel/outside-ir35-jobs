import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/send';

// Native magic-link sign-in (step 1 of 2): the RN app POSTs { email }. We sign a
// short-lived email JWT and email a deep link back to the app. Tapping the link
// opens outsideir35://auth/magic-link?token=... which the app redeems at the
// /verify route to mint a session (same find-or-create as the OAuth routes).
//
// Unlike the OAuth routes there's no native SDK token to trust, so the email
// round-trip IS the proof of ownership: only someone with access to the inbox can
// complete sign-in. No device/session state is needed before this call.
export const runtime = 'nodejs';

const Body = z.object({ email: z.string().email() });

const APP_SCHEME_URL = 'outsideir35://auth/magic-link';

const secret = (): Uint8Array => {
  const s = process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET;
  if (!s)
    throw new Error('AUTH_SECRET not set — cannot sign magic-link tokens');
  return new TextEncoder().encode(s);
};

export const POST = async (req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'A valid email is required' },
      { status: 400 },
    );
  }
  const email = parsed.data.email.trim().toLowerCase();

  // 15-minute, single-purpose token carrying only the email. Redeemed at /verify.
  const token = await new SignJWT({ email, purpose: 'mobile-magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('outsideir35jobs.com')
    .setAudience('outsideir35jobs.com/mobile')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret());

  const url = `${APP_SCHEME_URL}?token=${encodeURIComponent(token)}`;

  const result = await sendEmail({
    to: email,
    subject: 'Sign in to OutsideIR35 Jobs',
    html: `<p>Tap the button below to sign in to the OutsideIR35 Jobs app. This link expires in 15 minutes and can only be used once.</p><p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#17181a;color:#fff;border-radius:8px;text-decoration:none">Sign in to OutsideIR35 Jobs</a></p><p>If the button does not work, open this link on your phone:</p><p>${url}</p><p>If you did not request this email you can safely ignore it.</p>`,
  });

  if (!result.sent) {
    return NextResponse.json(
      { error: result.error ?? 'Failed to send sign-in email' },
      { status: 500 },
    );
  }

  return NextResponse.json({ sent: true });
};
