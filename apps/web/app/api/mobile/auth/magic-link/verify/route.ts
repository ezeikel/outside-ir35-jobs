import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertUserForIdentity } from '@/lib/mobile/oauth';
import { mintMobileSessionToken } from '@/lib/mobile/session';

// Native magic-link sign-in (step 2 of 2): the RN app opened the deep link from
// the email and POSTs the token here. We verify the short-lived email JWT signed
// by the /magic-link route, find-or-create the user (same as the OAuth routes),
// mint a mobile session token, and return it + the user. Possession of a valid,
// unexpired token IS the proof the caller controls that inbox.
export const runtime = 'nodejs';

const Body = z.object({ token: z.string().min(1) });

const secret = (): Uint8Array => {
  const s = process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET;
  if (!s)
    throw new Error('AUTH_SECRET not set — cannot verify magic-link tokens');
  return new TextEncoder().encode(s);
};

export const POST = async (req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  let email: string;
  try {
    const { payload } = await jwtVerify(parsed.data.token, secret(), {
      issuer: 'outsideir35jobs.com',
      audience: 'outsideir35jobs.com/mobile',
    });
    if (
      payload.purpose !== 'mobile-magic-link' ||
      typeof payload.email !== 'string'
    ) {
      throw new Error('wrong token');
    }
    email = payload.email;
  } catch {
    return NextResponse.json(
      {
        error:
          'This sign-in link is invalid or has expired. Request a new one.',
      },
      { status: 401 },
    );
  }

  const user = await upsertUserForIdentity({ email, name: null });
  const sessionToken = await mintMobileSessionToken({
    userId: user.id,
    email: user.email,
  });

  return NextResponse.json({
    sessionToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || null,
      role: user.role ?? null,
      onboarded: !!user.onboardedAt,
    },
  });
};
