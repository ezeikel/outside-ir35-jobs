import { createClient } from '@sanity/client';

// Read-only Sanity client for the public blog. The `production` dataset is
// public-read, so no token is needed here (the worker holds the write token).
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-01-01';

export const sanityClient = createClient({
  projectId: projectId || 'placeholder',
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === 'production',
});

export const sanityConfigured = Boolean(projectId);
