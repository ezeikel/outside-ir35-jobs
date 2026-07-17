import { api } from '@/lib/api';

// Per-listing analytics for the recruiter's own job — the applicant funnel + a
// 14-day applications trend. Ownership-gated server-side (404 if not the caller's
// listing). First-party performance data; no candidate ranking, no IR35 surface.

export type ListingAnalytics = {
  jobId: string;
  position: string;
  total: number;
  viewed: number;
  shortlisted: number;
  passed: number;
  neww: number;
  daily: { date: string; count: number }[];
};

export const fetchListingAnalytics = async (
  jobId: string,
): Promise<ListingAnalytics> => {
  const { data } = await api.get<ListingAnalytics>(
    `/api/mobile/posts/${jobId}/analytics`,
  );
  return data;
};
