import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn:
    SENTRY_DSN ||
    'https://c52cf20aa858e87418c5aaa6c3a412f0@o358156.ingest.us.sentry.io/4507124604665856',
  sendDefaultPii: false,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.2,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// PostHog (analytics). Key-gated so a missing key is a clean no-op (dev without
// the env var, previews). In production we route ingest through the /ingest
// reverse-proxy (see proxy.ts) to dodge ad-blockers; in dev we hit PostHog EU
// directly. ui_host makes toolbar/links point at the EU dashboard.
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host:
      process.env.NODE_ENV === 'production'
        ? '/ingest'
        : (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'),
    ui_host: 'https://eu.posthog.com',
    // Modern default: proper pageview/pageleave handling.
    defaults: '2025-05-24',
    debug: process.env.NODE_ENV === 'development',
  });
}

// eslint-disable-next-line import-x/prefer-default-export
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
