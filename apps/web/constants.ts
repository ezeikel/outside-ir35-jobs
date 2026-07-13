/**
 * Header the client fetch forwards so a server-side track() can attribute a guest
 * (not-signed-in) event to the SAME PostHog person as the browser events, rather
 * than collapsing every guest onto the shared 'anonymous' distinct_id. Defined
 * here — in a directive-free module imported by both client and server — to avoid
 * importing across the 'use client' / 'server-only' boundary.
 */
export const POSTHOG_DISTINCT_ID_HEADER = 'x-ph-distinct-id';

/**
 * Analytics tracking events for Outside IR35 Jobs.
 *
 * Naming convention: category_action (snake_case) — lets PostHog filter by prefix
 * (all "job_post_*", all "subscription_*"). Web + mobile share the one PostHog
 * project; the mobile catalog (apps/mobile/constants/analytics.ts) copies the
 * exact string values for any event fired on both surfaces so funnels unify.
 */
export const TRACKING_EVENTS = {
  // ===== AUTHENTICATION =====
  SIGNIN_STARTED: 'signin_started', // Clicked an OAuth button or submitted the magic-link
  AUTH_SIGN_IN_COMPLETED: 'auth_sign_in_completed', // Session resolved (identify happens here)

  // ===== ONBOARDING =====
  ONBOARDING_ROLE_SELECTED: 'onboarding_role_selected', // Picked JOB_SEEKER vs JOB_POSTER

  // ===== JOB SEARCH & SAVE =====
  JOB_SEARCH_PERFORMED: 'job_search_performed', // Ran a filtered/semantic board search
  JOB_SAVED: 'job_saved', // Bookmarked a job
  SEARCH_SAVED: 'search_saved', // Saved a search (top of the alerts funnel)
  JOB_ALERTS_ENABLED: 'job_alerts_enabled', // Toggled email alerts on a saved search

  // ===== APPLICATION (core contractor conversion) =====
  APPLICATION_SUBMITTED: 'application_submitted', // Applied to a contract

  // ===== SUBSCRIPTION (contractor premium, Stripe) =====
  SUBSCRIPTION_CHECKOUT_STARTED: 'subscription_checkout_started', // Clicked Subscribe → Stripe
  SUBSCRIPTION_ACTIVATED: 'subscription_activated', // Stripe sub active (server, money event)
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled', // Stripe sub cancelled/expired (server)
  PREMIUM_ACTIVATED_MOBILE: 'premium_activated_mobile', // RevenueCat premium unlock (server)

  // ===== JOB POSTING (paid listing funnel) =====
  JOB_POST_STARTED: 'job_post_started', // Submitted the post-a-contract form
  JOB_POST_CHECKOUT_STARTED: 'job_post_checkout_started', // Stripe checkout session created
  JOB_POST_PUBLISHED: 'job_post_published', // Payment confirmed → listing live (server, revenue)

  // ===== TAKE-HOME CALCULATOR (market-intelligence signal) =====
  // What contractors model reveals the day rates they're chasing — feeds the
  // day-rate benchmark, SEO, and positioning. Captured on a settled value
  // (debounced), NOT every keystroke.
  CALCULATOR_USED: 'calculator_used',
} as const;

export const DUMMY_JOBS = [
  {
    id: '1',
    title: 'Senior React Developer',
    description:
      'We are seeking an experienced Senior React Developer to join our team on a 6-month contract, working remotely on a greenfield project...',
    location: 'London, UK',
    dayRate: [500, 600],
    isRemote: true,
  },
  {
    id: '2',
    title: 'Project Manager',
    description:
      'Project Manager needed to oversee critical infrastructure projects across multiple sectors. Experience with Agile methodologies preferred. Contract for 12 months...',
    location: 'Birmingham, UK',
    dayRate: [450, 550],
    isRemote: false,
  },
  {
    id: '3',
    title: 'Digital Marketing Consultant',
    description:
      'Seeking a Digital Marketing Consultant with a proven track record in increasing online engagement and managing ad campaigns. Initial 9-month contract...',
    location: 'Remote, UK',
    dayRate: [400, 500],
    isRemote: true,
  },
  {
    id: '4',
    title: 'Financial Analyst',
    description:
      'Financial Analyst to support new market ventures and investment opportunities. Strong analytical skills and experience with financial modeling required. 6-month contract...',
    location: 'Leeds, UK',
    dayRate: [450, 550],
    isRemote: true,
  },
  {
    id: '5',
    title: 'UX/UI Designer',
    description:
      'UX/UI Designer to refine and implement new design concepts across web and mobile platforms. Proficiency in Sketch and Figma necessary. This is an 8-month contract...',
    location: 'Manchester, UK',
    dayRate: [420, 520],
    isRemote: false,
  },
  {
    id: '6',
    title: 'HR Consultant',
    description:
      'HR Consultant required to restructure the recruitment process and manage employee relations for a multinational company. Contract duration of 10 months...',
    location: 'Edinburgh, UK',
    dayRate: [350, 450],
    isRemote: false,
  },
];
