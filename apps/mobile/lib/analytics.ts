import { usePostHog } from "posthog-react-native";
import { useCallback } from "react";
import { Platform } from "react-native";
import type { AnalyticsEvent } from "@/constants/analytics";

// Every event carries `environment` + `platform` (+ `surface: 'mobile'`) so the
// shared PostHog project can split web vs mobile and iOS vs Android while funnels
// still unify on the same event names. The client itself is owned by the
// <PostHogProvider> in providers.tsx (key-gated — absent key ⇒ no provider), so
// `usePostHog()` returns undefined when analytics is disabled and every call
// below no-ops safely.
const environment = process.env.EXPO_PUBLIC_ENVIRONMENT ?? "development";

const baseProps = {
  environment,
  platform: Platform.OS,
  surface: "mobile" as const,
};

/**
 * Thin, typed analytics wrapper around the provider's PostHog client. Mirrors
 * web's useAnalytics so events look identical in the one project.
 *
 * - `trackEvent` — capture a named funnel event (types checked against
 *   ANALYTICS_EVENTS).
 * - `trackScreenView` — a manual `$screen` capture for screens the autocapture
 *   `captureScreens` doesn't name usefully (e.g. modal routes).
 * - `identify` — distinct_id = the DB user id (the SAME id web uses) so a
 *   guest→account and web↔mobile collapse onto one person.
 * - `reset` — clear identity on logout so the next user isn't merged in.
 */
export const useAnalytics = () => {
  const posthog = usePostHog();

  const trackEvent = useCallback(
    (event: AnalyticsEvent, properties?: Record<string, unknown>): void => {
      if (!posthog) return;
      try {
        posthog.capture(event, { ...baseProps, ...properties });
      } catch {
        // Analytics must never crash a user interaction.
      }
    },
    [posthog],
  );

  const trackScreenView = useCallback(
    (screen: string, properties?: Record<string, unknown>): void => {
      if (!posthog) return;
      try {
        posthog.screen(screen, { ...baseProps, ...properties });
      } catch {
        // non-fatal
      }
    },
    [posthog],
  );

  const identify = useCallback(
    (userId: string, properties?: Record<string, unknown>): void => {
      if (!posthog) return;
      try {
        posthog.identify(userId, { ...baseProps, ...properties });
      } catch {
        // non-fatal
      }
    },
    [posthog],
  );

  const reset = useCallback((): void => {
    if (!posthog) return;
    try {
      posthog.reset();
    } catch {
      // non-fatal
    }
  }, [posthog]);

  return { trackEvent, trackScreenView, identify, reset };
};
