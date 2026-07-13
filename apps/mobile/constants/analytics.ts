/**
 * Analytics event-name contract for the mobile app.
 *
 * Event STRING VALUES are copied VERBATIM from the web app's TRACKING_EVENTS
 * (apps/web/constants.ts) so web + mobile events land on the same names in the
 * one shared PostHog project and funnels unify cross-platform. Only the subset
 * mobile actually fires is listed (plus mobile-only screen-view events the web
 * has no equivalent for). When adding an event that ALSO exists on web, copy its
 * exact string.
 *
 * The money events (premium_activated_mobile, job_post_published) are captured
 * SERVER-SIDE in the web webhook routes (RevenueCat / Stripe), keyed to the DB
 * user id — mobile never fires those, it fires the CLIENT-side funnel entries
 * below (paywall viewed, post-job started, apply).
 */
export const ANALYTICS_EVENTS = {
  // ── Auth (shared with web) ──
  SIGNIN_COMPLETED_MOBILE: "signin_completed_mobile",

  // ── Application (shared conversion — web fires application_submitted too) ──
  APPLICATION_SUBMITTED_MOBILE: "application_submitted_mobile",

  // ── Premium (top of the RevenueCat purchase funnel) ──
  PREMIUM_PAYWALL_VIEWED_MOBILE: "premium_paywall_viewed_mobile",

  // ── Job posting (native paid-listing funnel entry) ──
  JOB_POST_STARTED_MOBILE: "job_post_started_mobile",

  // ── Onboarding (MOBILE-ONLY — role pick in the native carousel) ──
  ONBOARDING_ROLE_SELECTED: "onboarding_role_selected",

  // ── Take-home calculator (shared with web — same string as
  //    apps/web/constants.ts CALCULATOR_USED; a day-rate-benchmark signal) ──
  CALCULATOR_USED: "calculator_used",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
