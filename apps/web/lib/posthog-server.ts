import { PostHog } from 'posthog-node';

/**
 * Create a PostHog Node SDK client configured for server-side use.
 *
 * PostHog recommends creating a client per request in serverless environments
 * and calling `shutdown()` when done so events flush before the function freezes.
 *
 * Key resolution: prefer POSTHOG_KEY (server-only convention) and fall back to
 * NEXT_PUBLIC_POSTHOG_KEY — they're the SAME project token (phc_…), so one env
 * var is enough for both surfaces.
 */
export function createPostHogClient(): PostHog | null {
  const posthogKey =
    process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!posthogKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('PostHog server-side tracking disabled: missing env vars');
    }
    return null;
  }

  // Server-side: send directly to PostHog EU, not through the reverse proxy.
  // The proxy (/ingest) is for client-side ad-blocker avoidance and doesn't
  // work server-side (deployment URLs have Vercel Authentication).
  return new PostHog(posthogKey, {
    host: 'https://eu.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  });
}

// Lazy singleton — created on first access so the env var is available at runtime.
let posthogServerInstance: PostHog | null | undefined;

/**
 * Get a shared PostHog server client (lazy singleton).
 * Prefer `createPostHogClient()` + `shutdown()` in route handlers for reliable
 * flushing.
 */
export function getPostHogClient(): PostHog | null {
  if (posthogServerInstance === undefined) {
    posthogServerInstance = createPostHogClient();
  }
  return posthogServerInstance;
}

/**
 * Shutdown and flush all pending events. Call at the end of server actions /
 * API routes that use the singleton.
 */
export async function shutdownPostHog() {
  if (posthogServerInstance) {
    await posthogServerInstance.shutdown();
    posthogServerInstance = null;
  }
}
