import { importPKCS8, SignJWT } from 'jose';

type GenerateArgs = {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
};

// Apple's "Sign in with Apple" client secret is a short-lived ES256 JWT (not a
// static string). Generated at module init in auth.ts; the ~6-month expiry means
// it self-rotates on every deploy/cold start (as long as the app redeploys
// within 6 months). Copied from the sister Chewy Bytes apps.
export const generateAppleClientSecret = async ({
  teamId,
  keyId,
  clientId,
  privateKey,
}: GenerateArgs): Promise<string> => {
  const alg = 'ES256';
  const now = Math.floor(Date.now() / 1000);
  const pkcs8 = await importPKCS8(privateKey, alg);

  return new SignJWT({})
    .setProtectedHeader({ alg, kid: keyId })
    .setIssuer(teamId)
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .setIssuedAt(now)
    .setExpirationTime(now + 15777000) // ~6 months
    .sign(pkcs8);
};
