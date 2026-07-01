import { api } from "@/lib/api";

// The caller's own listings for the hiring Listings tab. Wraps GET /api/mobile/posts
// (which wraps getMyJobsForCaller). Bearer-authed; the server scopes to jobs this
// user posted. Read-only — full listing management (edit/close) is a follow-up.

export type PostSummary = {
  id: string;
  position: string;
  companyName: string;
  // Live on the board vs. awaiting payment (PENDING) — drives the status pill.
  isActive: boolean;
  paymentStatus: "FREE" | "PENDING" | "PAID";
  createdAt: string; // ISO
  applicantCount: number;
  newApplicantCount: number;
};

export const fetchMyPosts = async (): Promise<PostSummary[]> => {
  const { data } = await api.get<{ posts: PostSummary[] }>("/api/mobile/posts");
  return data.posts;
};
