import { api } from "@/lib/api";

// Auth API calls. Each posts a native-SDK OAuth token to a /api/mobile/auth/*
// route on the web app; the server verifies the token, upserts the user (the
// same logic NextAuth's signIn callback uses), mints a mobile session token, and
// returns it. The client then stores {sessionToken,userId} in SecureStore.

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "JOB_SEEKER" | "JOB_POSTER" | null;
  onboarded: boolean;
};

export type OAuthSignInResponse = {
  sessionToken: string;
  user: AuthUser;
};

export const signInWithGoogle = async (
  idToken: string,
): Promise<OAuthSignInResponse> => {
  const { data } = await api.post<OAuthSignInResponse>("/api/mobile/auth/google", {
    idToken,
  });
  return data;
};

export const signInWithApple = async (
  identityToken: string,
  name?: { givenName?: string; familyName?: string },
): Promise<OAuthSignInResponse> => {
  const { data } = await api.post<OAuthSignInResponse>("/api/mobile/auth/apple", {
    identityToken,
    givenName: name?.givenName,
    familyName: name?.familyName,
  });
  return data;
};

export const signInWithFacebook = async (
  accessToken: string,
): Promise<OAuthSignInResponse> => {
  const { data } = await api.post<OAuthSignInResponse>(
    "/api/mobile/auth/facebook",
    { accessToken },
  );
  return data;
};

// Magic-link step 1: ask the server to email a deep link to `email`. There's no
// SDK token here — the email round-trip is the proof of ownership.
export const requestMagicLink = async (email: string): Promise<{ sent: true }> => {
  const { data } = await api.post<{ sent: true }>(
    "/api/mobile/auth/magic-link",
    { email },
  );
  return data;
};

// Magic-link step 2: redeem the token from the tapped deep link. The token
// carries the (signed) email, so no other input is needed; returns a session.
export const verifyMagicLink = async (
  token: string,
): Promise<OAuthSignInResponse> => {
  const { data } = await api.post<OAuthSignInResponse>(
    "/api/mobile/auth/magic-link/verify",
    { token },
  );
  return data;
};

/** Fetch the current user for the stored session token. 401 → signed out. */
export const getAuthMe = async (): Promise<AuthUser> => {
  const { data } = await api.get<{ user: AuthUser }>("/api/mobile/auth/me");
  return data.user;
};

// DEV/TEST-ONLY: mint a session for a seeded test user without OAuth, so the
// simulator + Maestro can drive the authed surfaces. The server route only
// responds when E2E_TEST_LOGIN=1 (404s in prod). Never call this from a prod build
// — the caller is gated on __DEV__.
export const testLogin = async (
  role: "seeker" | "poster",
): Promise<{ token: string; user: AuthUser }> => {
  const { data } = await api.post<{ token: string; user: AuthUser }>(
    "/api/mobile/auth/test-login",
    { role },
  );
  return data;
};
