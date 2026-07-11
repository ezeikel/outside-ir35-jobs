import 'server-only';

import { track as vercelTrackServer } from '@vercel/analytics/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { POSTHOG_DISTINCT_ID_HEADER } from '@/constants';
import { createPostHogClient } from '@/lib/posthog-server';
import type { EventProperties, TrackingEvent } from '@/types/analytics';

// Clean properties for Vercel Analytics (only string, number, boolean, null).
const cleanVercelProperties = (
  properties: Record<string, unknown>,
): Record<string, string | number | boolean | null> =>
  Object.entries(properties).reduce(
    (cleaned, [key, value]) => {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        return { ...cleaned, [key]: value };
      }
      if (value !== undefined) {
        return { ...cleaned, [key]: String(value) };
      }
      return cleaned;
    },
    {} as Record<string, string | number | boolean | null>,
  );

/**
 * Server-side analytics for server actions. Resolves the caller from the
 * NextAuth session, creates a per-request PostHog client, and shuts it down after
 * capture so events flush reliably in serverless. Falls back to the browser's
 * distinct_id (forwarded as a header) for guest events so they attribute to the
 * same person as the client events.
 *
 * @example
 * await track(TRACKING_EVENTS.JOB_SAVED, { jobId });
 */
export const track = async <
  TEvent extends TrackingEvent & keyof EventProperties,
>(
  event: TEvent,
  properties: EventProperties[TEvent],
  clientDistinctId?: string,
) => {
  try {
    const session = await auth().catch(() => null);
    const userId = session?.userId ?? null;

    // Guest fallback: use the forwarded browser distinct_id so a server-tracked
    // guest event lands on the same person as their client events. Explicit arg
    // wins; the header is the fallback. Header reads can throw outside a request
    // scope — swallow and skip.
    let resolvedClientDistinctId = clientDistinctId;
    if (!userId && !resolvedClientDistinctId) {
      try {
        const headersList = await headers();
        resolvedClientDistinctId =
          headersList.get(POSTHOG_DISTINCT_ID_HEADER) ?? undefined;
      } catch {
        // not in a request context — leave undefined
      }
    }

    const enrichedProperties = {
      ...properties,
      userId: userId || undefined,
      environment: 'server',
    };

    const posthog = createPostHogClient();
    if (posthog) {
      if (userId) {
        posthog.identify({
          distinctId: userId,
          properties: {
            email: session?.user?.email ?? undefined,
            name: session?.user?.name ?? undefined,
          },
        });
      }

      posthog.capture({
        distinctId: userId || resolvedClientDistinctId || 'anonymous',
        event,
        properties: enrichedProperties,
      });

      await posthog.shutdown();
    }

    await vercelTrackServer(event, cleanVercelProperties(enrichedProperties));

    if (process.env.NODE_ENV === 'development') {
      console.info('[Analytics Server]', event, enrichedProperties);
    }
  } catch (error) {
    console.error('Server analytics tracking error:', error);
  }
};

/**
 * Track an event with an explicit user id (webhooks, background jobs — no
 * session). The money events (subscription_activated, job_post_published,
 * premium_activated_mobile) use this, keyed on the userId carried in Stripe
 * metadata / RevenueCat app_user_id so iOS/Android/web premium unify on one
 * person.
 *
 * @example
 * await trackWithUser(userId, TRACKING_EVENTS.SUBSCRIPTION_ACTIVATED, {
 *   provider: 'STRIPE', status: 'active',
 * });
 */
export const trackWithUser = async <
  TEvent extends TrackingEvent & keyof EventProperties,
>(
  userId: string,
  event: TEvent,
  properties: EventProperties[TEvent],
) => {
  try {
    const enrichedProperties = {
      ...properties,
      userId,
      environment: 'server',
    };

    const posthog = createPostHogClient();
    if (posthog) {
      posthog.capture({
        distinctId: userId,
        event,
        properties: enrichedProperties,
      });
      await posthog.shutdown();
    }

    await vercelTrackServer(event, cleanVercelProperties(enrichedProperties));

    if (process.env.NODE_ENV === 'development') {
      console.info('[Analytics Server]', event, enrichedProperties);
    }
  } catch (error) {
    console.error('Server analytics tracking error:', error);
  }
};
