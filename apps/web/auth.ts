import { PrismaAdapter } from '@auth/prisma-adapter';
import { db as prisma } from '@outside-ir35-jobs/db';
import NextAuth from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import type { Provider } from 'next-auth/providers';
import AppleProvider from 'next-auth/providers/apple';
import FacebookProvider from 'next-auth/providers/facebook';
import GoogleProvider from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { generateAppleClientSecret } from '@/lib/apple';
import { sendEmail } from '@/lib/email/send';

// e2e note: the Playwright authed suite signs in by seeding a real `sessions` row
// and dropping its token into the `authjs.session-token` cookie (see
// e2e/seed-users.ts + e2e/helpers/auth.ts). Under the database session strategy
// that's the only thing `auth()` will accept, so there's no test-only credentials
// provider here — a JWT-cookie credentials sign-in can't be resolved by the DB
// strategy anyway.

// Apple's client secret is a short-lived ES256 JWT, generated at module init.
// Empty string when any Apple env var is missing so dev/build still starts — the
// provider is only added when a secret exists.
const appleClientSecret =
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID &&
  process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_PRIVATE_KEY
    ? await generateAppleClientSecret({
        teamId: process.env.APPLE_TEAM_ID,
        keyId: process.env.APPLE_KEY_ID,
        clientId: process.env.APPLE_CLIENT_ID,
        privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    : '';

// Providers are env-gated: each is only registered when its credentials exist,
// so the app builds/runs as each provider's OAuth app gets provisioned instead
// of throwing at boot. FACEBOOK_CONSUMER_APP_* is the Meta CONSUMER LOGIN app.
const providers: Provider[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.APPLE_CLIENT_ID && appleClientSecret) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: appleClientSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (
  process.env.FACEBOOK_CONSUMER_APP_ID &&
  process.env.FACEBOOK_CONSUMER_APP_SECRET
) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CONSUMER_APP_ID,
      clientSecret: process.env.FACEBOOK_CONSUMER_APP_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { scope: 'public_profile email' } },
    }),
  );
}

if (process.env.RESEND_API_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      // Reuse the app's verified sender (notifications.outsideir35jobs.com).
      from:
        process.env.RESEND_FROM ??
        'OutsideIR35 Jobs <alerts@notifications.outsideir35jobs.com>',
      async sendVerificationRequest({ identifier: email, url }) {
        const result = await sendEmail({
          to: email,
          subject: 'Sign in to OutsideIR35 Jobs',
          html: `<p>Click the link below to sign in to your OutsideIR35 Jobs account. This link expires shortly and can only be used once.</p><p><a href="${url}">Sign in to OutsideIR35 Jobs</a></p><p>If you did not request this email you can safely ignore it.</p>`,
        });
        if (!result.sent) {
          throw new Error(result.error ?? 'Failed to send magic link email');
        }
      },
    }),
  );
}

// The base Prisma adapter. We wrap createUser because our User.name column is
// NOT NULL — Apple frequently returns no name (and magic-link never does), which
// would make the adapter's createUser throw and break those sign-ins. Default
// name to the email's local-part so a user is always creatable; they set their
// real details at /onboarding. role/onboardedAt stay null (schema defaults) so
// the onboarding gate is unchanged.
const baseAdapter = PrismaAdapter(prisma);
const adapter: Adapter = {
  ...baseAdapter,
  createUser: (data) =>
    // PrismaAdapter always defines createUser.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    baseAdapter.createUser!({
      ...data,
      name: data.name?.trim() || data.email.split('@')[0],
    }),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel auto-enables this, but a local `next start` (and the prod-build e2e
  // run) needs it set explicitly or every session lookup throws UntrustedHost.
  trustHost: true,
  // Database sessions (via the Prisma adapter) so OAuth account linking and the
  // Resend magic-link VerificationToken flow work. The adapter auto-creates the
  // User on first sign-in (name defaulted above; role/onboardedAt default to null
  // so the /onboarding step still gates as before).
  adapter,
  session: { strategy: 'database' },
  providers,
  callbacks: {
    async session({ session, user }) {
      // With the database strategy, `user` is the full DB row — surface the
      // fields the app gates on (userId / role / onboarded) onto the session.
      if (session.user && user) {
        /* eslint-disable no-param-reassign */
        session.userId = user.id;
        session.role = (user as { role?: typeof session.role }).role ?? null;
        session.onboarded = !!(user as { onboardedAt?: Date | null })
          .onboardedAt;
        /* eslint-enable no-param-reassign */
      }
      return session;
    },
  },
  // Custom auth screens (branded) instead of NextAuth's default pages: /signin is
  // the dedicated sign-in surface; verify-request is the "check your inbox" state
  // after requesting a magic link; error routes to the branded error page.
  pages: {
    signIn: '/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  // Auth.js v5 reads AUTH_SECRET by default; keep NEXT_AUTH_SECRET as a fallback
  // for the existing env var name.
  secret: process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET,
});
