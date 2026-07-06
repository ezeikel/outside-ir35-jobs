import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  upsertUserForIdentity,
  verifyFacebookAccessToken,
} from '@/lib/mobile/oauth';
import { mintMobileSessionToken } from '@/lib/mobile/session';

// Native Facebook sign-in: the RN app sends the Facebook access token; we verify
// it against Graph (debug_token + /me), find-or-create the user (same as the web
// NextAuth signIn), mint a mobile session token, and return it + the user.
export const runtime = 'nodejs';

const Body = z.object({ accessToken: z.string().min(1) });

export const POST = async (req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'accessToken required' },
      { status: 400 },
    );
  }

  let identity;
  try {
    identity = await verifyFacebookAccessToken(parsed.data.accessToken);
  } catch {
    return NextResponse.json(
      { error: 'Invalid Facebook token' },
      { status: 401 },
    );
  }

  const user = await upsertUserForIdentity(identity);
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
