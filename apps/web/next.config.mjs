import { withSentryConfig } from '@sentry/nextjs';
import { withPlausibleProxy } from 'next-plausible';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the workspace TS packages (shipped as raw source).
  transpilePackages: ['@outside-ir35-jobs/db', '@outside-ir35-jobs/storage'],
  // Renamed from experimental.serverComponentsExternalPackages in Next 15.
  serverExternalPackages: ['@react-pdf/renderer'],
  experimental: {
    // Contractor document uploads go through a server action; the default 1 MB
    // body cap is too small for a PDF/scan. Match the 10 MB validation ceiling.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // PostHog reverse-proxy: the browser sends analytics to /ingest (same origin,
  // so ad-blockers can't null-route the PostHog domain), and we rewrite it to
  // PostHog EU cloud. /ingest/static/* → the assets host, everything else →
  // the ingestion host. instrumentation-client sets api_host:'/ingest' in prod.
  // Sentry already owns tunnelRoute '/monitoring', so these paths don't collide.
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ];
  },
  // PostHog uses a trailing-slash API; keep the rewrite intact.
  skipTrailingSlashRedirect: true,
};

// sentry configuration options
const sentryOptions = {
  silent: true,
  org: 'ezeikel',
  project: 'outside-ir35-jobs-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
};

const configWithSentry = withSentryConfig(nextConfig, sentryOptions);

const configWithPlausible = withPlausibleProxy()(configWithSentry);

export default configWithPlausible;
