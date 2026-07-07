import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Auth harness for the authed-flow e2e suite. NextAuth here uses the DATABASE
// session strategy, so a valid web session IS a row in the `sessions` table whose
// `sessionToken` equals the value of the `authjs.session-token` cookie. The seed
// (e2e/seed-users.ts, run via `tsx` by global-setup) creates that row per user and
// writes the tokens to .auth/session-tokens.json; here we just drop the token into
// a Playwright storageState so each test project starts already signed in as the
// right role — no Google consent screen, and no dependency on the (removed) e2e
// credentials provider, which minted a JWT cookie the database strategy can't read.
//
// NOTE: the DB seed lives in e2e/seed-users.ts, NOT here — importing the Prisma
// client into Playwright's TS transform breaks on the generated client's CommonJS
// output, so this file only ever touches strings + the tokens file it wrote.

// Stable, obviously-synthetic emails so a seed re-run upserts rather than
// duplicating, and so these rows are easy to spot/clean in the dev DB. Kept in
// sync with e2e/seed-users.ts.
export const CONTRACTOR_EMAIL = 'e2e-contractor@outsideir35.test';
export const POSTER_EMAIL = 'e2e-poster@outsideir35.test';

const SESSION_TOKENS_FILE = path.join(
  __dirname,
  '..',
  '.auth',
  'session-tokens.json',
);

/**
 * Persist a signed-in storageState for `email` to `storageStatePath` by writing
 * the seeded database session token as the `authjs.session-token` cookie. The
 * cookie is scoped to the test server's host (from baseURL). Over plain HTTP
 * (the e2e webServer runs `pnpm start`, no TLS) the cookie name has no
 * `__Secure-` prefix, matching NextAuth's default.
 */
export const loginAs = async (
  baseURL: string,
  email: string,
  storageStatePath: string,
): Promise<void> => {
  const tokens = JSON.parse(
    readFileSync(SESSION_TOKENS_FILE, 'utf8'),
  ) as Record<string, string>;
  const sessionToken = tokens[email];
  if (!sessionToken) {
    throw new Error(
      `No seeded session token for ${email}. Did e2e/seed-users.ts run (global-setup)?`,
    );
  }

  const { hostname } = new URL(baseURL);
  const storageState = {
    cookies: [
      {
        name: 'authjs.session-token',
        value: sessionToken,
        domain: hostname,
        path: '/',
        // 30 days out, matching the seeded session's expiry.
        expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };

  writeFileSync(storageStatePath, JSON.stringify(storageState));
};
