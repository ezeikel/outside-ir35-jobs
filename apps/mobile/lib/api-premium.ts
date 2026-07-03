import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// Authoritative premium state — read from our backend (the DB), NOT the RC client
// SDK. This is what recognises a web Stripe subscriber on mobile and vice-versa:
// both providers write the same Subscription row. The app gates on THIS, and
// invalidates ["premium"] after a purchase to re-fetch.

export type PremiumStatus = {
  isPremium: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: "STRIPE" | "REVENUECAT" | null;
};

export const fetchPremium = async (): Promise<PremiumStatus> => {
  const { data } = await api.get<PremiumStatus>("/api/mobile/premium");
  return data;
};

export const usePremium = () => {
  const { isAuthenticated, user } = useAuth();
  const enabled = isAuthenticated && user?.role === "JOB_SEEKER";
  const query = useQuery({
    queryKey: ["premium"],
    queryFn: fetchPremium,
    enabled,
    // Entitlement state is money-sensitive and cheap to fetch, so keep it fresh:
    // staleTime 0 means it refetches on mount AND on app-foreground (via the
    // AppState→focusManager bridge in providers.tsx). Without that low window a
    // premium change made outside the app (store cancel, web Stripe, expiry)
    // could show stale on the always-mounted Profile tab for up to a minute.
    staleTime: 0,
  });
  return {
    isPremium: query.data?.isPremium ?? false,
    status: query.data ?? null,
    isLoading: query.isLoading,
    enabled,
  };
};
