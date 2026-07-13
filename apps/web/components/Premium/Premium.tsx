'use client';

import { useState, useTransition } from 'react';
import { createSubscriptionCheckout, getBillingPortalUrl } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { TRACKING_EVENTS } from '@/constants';
import { useAnalytics } from '@/utils/analytics-client';

const PERKS = [
  'See which hirers viewed your applications',
  'Get seen first: your profile surfaces above other applicants',
  'AI “why this matched” + a tailored pitch on every role',
  'Full day-rate data: the range and sample, not just the median',
  'Unlimited saved searches & daily job alerts',
];

const fmtDate = (d: Date | string | null): string => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
};

type Props = {
  isActive: boolean;
  status: string | null;
  currentPeriodEnd: Date | string | null;
  cancelAtPeriodEnd: boolean;
  checkoutStatus: string | null;
};

const Premium = ({
  isActive,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  checkoutStatus,
}: Props) => {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { track } = useAnalytics();

  const subscribe = () => {
    setError(null);
    track(TRACKING_EVENTS.SUBSCRIPTION_CHECKOUT_STARTED, { plan: 'premium' });
    startTransition(async () => {
      try {
        const { checkoutUrl } = await createSubscriptionCheckout();
        window.location.assign(checkoutUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start checkout.');
      }
    });
  };

  const manage = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { url } = await getBillingPortalUrl();
        window.location.assign(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not open billing.');
      }
    });
  };

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Premium
        </p>
        <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
          Win and deliver more contracts
        </h1>
        <p className="mt-3 text-muted-foreground">
          A business tool for limited-company contractors: unlimited alerts, the
          full rate data, and a profile that stands out.
        </p>
      </header>

      {checkoutStatus === 'success' && !isActive ? (
        <p className="mb-6 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
          Thanks. Your subscription is being activated. It’ll show as active
          here within a moment.
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="font-display text-4xl">£29</span>
            <span className="text-muted-foreground"> / month</span>
          </div>
          {isActive ? (
            <span className="rounded-full bg-verified-muted px-3 py-1 text-xs font-medium text-verified">
              Active
            </span>
          ) : null}
        </div>

        <ul className="mt-6 space-y-2">
          {PERKS.map((perk) => (
            <li key={perk} className="flex gap-2 text-sm">
              <span className="text-verified">✓</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {isActive ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {cancelAtPeriodEnd
                  ? `Your premium ends on ${fmtDate(currentPeriodEnd)}.`
                  : currentPeriodEnd
                    ? `Renews on ${fmtDate(currentPeriodEnd)}.`
                    : 'Subscription active.'}
              </p>
              <Button variant="outline" onClick={manage} disabled={pending}>
                {pending ? 'Opening…' : 'Manage subscription'}
              </Button>
            </div>
          ) : (
            <Button onClick={subscribe} disabled={pending}>
              {pending ? 'Redirecting…' : 'Subscribe · £29/month'}
            </Button>
          )}
          {status === 'past_due' && !isActive ? (
            <p className="mt-2 text-sm text-destructive">
              Your last payment failed.{' '}
              <button
                type="button"
                onClick={manage}
                className="underline"
                disabled={pending}
              >
                Update your card
              </button>
              .
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Billed monthly via Stripe; a VAT invoice is provided. Many contractors
        expense tools like this through their limited company as a legitimate
        business cost, but deductibility depends on your circumstances, so
        please consult your accountant. We don’t provide tax advice.
      </p>
    </div>
  );
};

export default Premium;
