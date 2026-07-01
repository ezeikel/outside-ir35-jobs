import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// "Who viewed you" — how many hirers have opened this contractor's applications.
// Free sees the COUNTS (the hook); premium sees the `recent` list (which roles).
// `locked` is true for non-premium, so the card shows an upsell instead of names.

export type ProfileViews = {
  total: number;
  last7Days: number;
  recent: { jobPosition: string; companyName: string; viewedAt: string }[];
  locked: boolean;
};

export const fetchProfileViews = async (): Promise<ProfileViews> => {
  const { data } = await api.get<ProfileViews>("/api/mobile/profile-views");
  return data;
};

export const useProfileViews = () => {
  const { isAuthenticated, user } = useAuth();
  // Only a seeker with an account can have applications that got viewed.
  const enabled = isAuthenticated && user?.role === "JOB_SEEKER";
  const query = useQuery({
    queryKey: ["profile-views"],
    queryFn: fetchProfileViews,
    enabled,
    staleTime: 60_000,
  });
  return {
    views: query.data ?? null,
    isLoading: query.isLoading,
    enabled,
  };
};
