'use client';

import { track as vercelTrack } from '@vercel/analytics';
import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { useCallback } from 'react';
import { POSTHOG_DISTINCT_ID_HEADER } from '@/constants';
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
 * Hook for tracking analytics events from client components.
 *
 * Sends events to both PostHog and Vercel Analytics with automatic user
 * enrichment from the NextAuth session. When a userId is present it also
 * identifies the person so web + mobile (same PostHog project, keyed on the DB
 * user id) collapse onto one person.
 *
 * @example
 * const { track } = useAnalytics();
 * track(TRACKING_EVENTS.SIGNIN_STARTED, { method: 'google', location: 'signin_page' });
 */
export const useAnalytics = () => {
  const { data: session } = useSession();

  const track = useCallback(
    <TEvent extends TrackingEvent & keyof EventProperties>(
      event: TEvent,
      properties: EventProperties[TEvent],
    ) => {
      try {
        const userId = session?.userId;

        const enrichedProperties = {
          ...properties,
          userId,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          environment: 'client',
          surface: 'web',
        };

        if (typeof window !== 'undefined' && posthog?.capture) {
          if (userId) {
            posthog.identify(userId, {
              email: session?.user?.email,
              name: session?.user?.name,
            });
          }
          posthog.capture(event, enrichedProperties);
        }

        vercelTrack(event, cleanVercelProperties(enrichedProperties));

        if (process.env.NODE_ENV === 'development') {
          console.info('[Analytics Client]', event, enrichedProperties);
        }
      } catch (error) {
        console.error('Client analytics tracking error:', error);
      }
    },
    [session],
  );

  return { track };
};

/**
 * The raw browser PostHog distinct_id, or undefined if PostHog hasn't
 * initialised. Use when a server-side track() needs to attribute a guest event
 * to the same person as the client events.
 */
export const getPosthogDistinctId = (): string | undefined => {
  if (typeof window === 'undefined' || !posthog?.get_distinct_id) {
    return undefined;
  }
  try {
    return posthog.get_distinct_id() || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Header form of {@link getPosthogDistinctId}, for forwarding on a fetch to an
 * API route that tracks server-side.
 */
export const posthogDistinctIdHeader = (): Record<string, string> => {
  const id = getPosthogDistinctId();
  return id ? { [POSTHOG_DISTINCT_ID_HEADER]: id } : {};
};
