import type { PosterType, Role } from '@outside-ir35-jobs/db/types';
import type { TRACKING_EVENTS } from '@/constants';

export type TrackingEvent =
  (typeof TRACKING_EVENTS)[keyof typeof TRACKING_EVENTS];

// Which OAuth / email method the user chose on the sign-in surface.
export type SignInMethod = 'google' | 'apple' | 'facebook' | 'magic_link';

/**
 * Type-safe property bag for each tracking event. Keyed by the event STRING value
 * (via TRACKING_EVENTS), so client (utils/analytics-client) and server
 * (utils/analytics-server) helpers enforce the same contract on both surfaces.
 */
export type EventProperties = {
  // ===== AUTHENTICATION =====
  [TRACKING_EVENTS.SIGNIN_STARTED]: {
    method: SignInMethod;
    location: string; // 'signin_page' | 'header' | etc.
  };
  [TRACKING_EVENTS.AUTH_SIGN_IN_COMPLETED]: {
    method?: SignInMethod;
  };

  // ===== ONBOARDING =====
  [TRACKING_EVENTS.ONBOARDING_ROLE_SELECTED]: {
    role: Role;
    posterType?: PosterType | null;
  };

  // ===== JOB SEARCH & SAVE =====
  [TRACKING_EVENTS.JOB_SEARCH_PERFORMED]: {
    hasQuery: boolean;
    resultCount: number;
    workMode?: string | null;
    minRate?: number | null;
    location?: string | null;
    ir35OutsideOnly?: boolean;
    postedSinceDays?: number | null;
  };
  [TRACKING_EVENTS.JOB_SAVED]: {
    jobId: string;
  };
  [TRACKING_EVENTS.SEARCH_SAVED]: {
    hasQuery: boolean;
    workMode?: string | null;
    minRate?: number | null;
    location?: string | null;
  };
  [TRACKING_EVENTS.JOB_ALERTS_ENABLED]: {
    savedSearchId: string;
    enabled: boolean;
  };

  // ===== APPLICATION =====
  [TRACKING_EVENTS.APPLICATION_SUBMITTED]: {
    jobId: string;
    jobSource: string; // NATIVE | AGGREGATED
    hasMessage: boolean;
    surface: 'web' | 'mobile';
  };

  // ===== SUBSCRIPTION (contractor premium) =====
  [TRACKING_EVENTS.SUBSCRIPTION_CHECKOUT_STARTED]: {
    plan: 'premium';
  };
  [TRACKING_EVENTS.SUBSCRIPTION_ACTIVATED]: {
    provider: 'STRIPE';
    status: string;
    stripePriceId?: string | null;
  };
  [TRACKING_EVENTS.SUBSCRIPTION_CANCELLED]: {
    provider: 'STRIPE';
    status: string;
    cancelAtPeriodEnd: boolean;
  };
  [TRACKING_EVENTS.PREMIUM_ACTIVATED_MOBILE]: {
    provider: 'REVENUECAT';
    status: string;
    eventType: string; // INITIAL_PURCHASE | RENEWAL | ...
    productId?: string | null;
  };

  // ===== JOB POSTING (paid listing funnel) =====
  [TRACKING_EVENTS.JOB_POST_STARTED]: {
    surface: 'web' | 'mobile';
    workMode?: string | null;
    ir35Signal?: string | null;
  };
  [TRACKING_EVENTS.JOB_POST_CHECKOUT_STARTED]: {
    jobId: string;
    position: string;
  };
  [TRACKING_EVENTS.JOB_POST_PUBLISHED]: {
    jobId: string;
    position: string;
  };
};
