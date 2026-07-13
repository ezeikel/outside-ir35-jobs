import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd/JsonLd';
import PageWrap from '@/components/PageWrap/PageWrap';
import TakeHomeCalculator from '@/components/TakeHomeCalculator/TakeHomeCalculator';
import {
  calculateTakeHome,
  DEFAULT_TAX_YEAR,
  taxConstants,
} from '@/lib/tax/takeHome';

const SITE = 'https://www.outsideir35jobs.com';
const PATH = '/take-home-calculator';

export const metadata: Metadata = {
  title: `Contractor take-home pay calculator (${DEFAULT_TAX_YEAR}) · Outside IR35 Jobs`,
  description:
    'Free UK outside-IR35 contractor take-home calculator. See what a day rate actually leaves you after corporation tax, dividends and NI. Adjust salary and dividends live. 2026/27 rates.',
  alternates: { canonical: PATH },
  keywords: [
    'contractor take home calculator',
    'outside IR35 take home',
    'day rate calculator UK',
    'limited company contractor tax',
    'dividend tax calculator 2026/27',
  ],
  openGraph: {
    title: 'Contractor take-home pay calculator · Outside IR35 Jobs',
    description:
      'What an outside-IR35 day rate actually leaves you after tax. Adjust salary and dividends live. 2026/27 UK rates.',
    type: 'website',
  },
};

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const pct = (r: number) => `${Math.round(r * 100)}%`;

// Common day rates → take-home, computed at render time from the verified tax
// lib so the examples never drift when rates change. 220 billable days.
const EXAMPLE_RATES = [400, 500, 600, 700, 800] as const;
const DAYS = 220;

const TakeHomeCalculatorPage = () => {
  const c = taxConstants(DEFAULT_TAX_YEAR);
  const examples = EXAMPLE_RATES.map((dayRate) => {
    const r = calculateTakeHome({ dayRate, daysWorked: DAYS });
    return { dayRate, ...r };
  });

  // FAQ entries — the answers double as the FAQPage structured data, so keep
  // them plain-text and self-contained.
  const faqs: { q: string; a: string }[] = [
    {
      q: 'How much do you take home on a £500 day rate outside IR35?',
      a: `At £500 a day over ${DAYS} billable days that's ${fmt(examples[1].revenue)} of company revenue. On the common low-salary, dividends split, personal take-home is roughly ${fmt(examples[1].takeHome)} for the ${DEFAULT_TAX_YEAR} tax year, after corporation tax, National Insurance and dividend tax. That's about ${pct(examples[1].retentionRate)} of what you bill.`,
    },
    {
      q: 'How is outside-IR35 take-home taxed?',
      a: 'Your limited company bills the day rate as revenue. It pays a small director salary (usually around the personal allowance), deducts allowable expenses, then pays corporation tax on the remaining profit. What is left can be drawn as dividends, which are taxed at your personal dividend rates. The calculator models all of this.',
    },
    {
      q: 'What are the dividend tax rates for 2026/27?',
      a: `The first ${fmt(c.DIVIDEND_ALLOWANCE)} of dividends is tax-free. Above that, dividends are taxed at ${(c.DIV_BASIC_RATE * 100).toFixed(2)}% in the basic-rate band, ${(c.DIV_HIGHER_RATE * 100).toFixed(2)}% in the higher-rate band and ${(c.DIV_ADDITIONAL_RATE * 100).toFixed(2)}% in the additional-rate band. The basic and higher rates rose by 2 points from April 2026.`,
    },
    {
      q: 'What salary should a contractor director take?',
      a: `Most single-director companies pay a salary around the personal allowance (${fmt(c.PERSONAL_ALLOWANCE)}), which keeps it below the income-tax and employee-NI thresholds, then take the rest as dividends. You can slide the salary in the calculator to see the effect. This is a general pattern, not advice for your situation.`,
    },
    {
      q: 'Do I have to draw all my profit as dividends?',
      a: 'No. You can leave profit in the company (retained earnings) and draw it in a later year, put it into a pension, or reinvest it. The calculator lets you slide dividends down from the maximum and shows what stays in the business.',
    },
    {
      q: 'Is this a tax calculation I can rely on?',
      a: 'It is an estimate to help you compare day rates, not tax advice. It assumes a single director with no other income over a full tax year, uses England and Northern Ireland income-tax bands, and excludes VAT, pensions, student loans and other personal income. Check your own circumstances with an accountant.',
    },
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Contractor take-home pay calculator',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      url: `${SITE}${PATH}`,
      description:
        'Free UK outside-IR35 contractor take-home calculator. Estimate personal take-home from a day rate after corporation tax, dividends and National Insurance, with adjustable salary and dividends.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
      isAccessibleForFree: true,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  return (
    <PageWrap>
      <JsonLd data={jsonLd} />
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        {/* Hero */}
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Free tool · {DEFAULT_TAX_YEAR} rates
          </p>
          <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
            Contractor take-home calculator
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            See what an outside-IR35 day rate actually leaves you after tax.
            Adjust your salary and dividends and watch your take-home update
            live. Built for UK limited-company contractors.
          </p>
        </header>

        {/* The tool */}
        <div className="mt-8">
          <TakeHomeCalculator className="mx-auto max-w-lg" />
        </div>

        {/* Examples table */}
        <section className="mt-14">
          <h2 className="font-display text-2xl leading-tight">
            Take-home by day rate ({DEFAULT_TAX_YEAR})
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Estimated personal take-home over {DAYS} billable days, on the usual
            low-salary and dividends split.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Day rate</th>
                  <th className="px-4 py-2 font-medium">Billed a year</th>
                  <th className="px-4 py-2 font-medium">Take-home</th>
                  <th className="px-4 py-2 font-medium">You keep</th>
                </tr>
              </thead>
              <tbody>
                {examples.map((e) => (
                  <tr key={e.dayRate} className="border-b border-border/60">
                    <td className="px-4 py-2 font-medium text-foreground">
                      {fmt(e.dayRate)}/day
                    </td>
                    <td className="px-4 py-2 tabular-nums text-muted-foreground">
                      {fmt(e.revenue)}
                    </td>
                    <td className="px-4 py-2 font-semibold tabular-nums text-verified">
                      {fmt(e.takeHome)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-muted-foreground">
                      {pct(e.retentionRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Estimates for the {DEFAULT_TAX_YEAR} tax year (England and Northern
            Ireland). Not tax advice. Your figure depends on expenses, pension
            contributions, other income and your own circumstances.
          </p>
        </section>

        {/* How it works */}
        <section className="mt-14 space-y-4 text-[15px] leading-relaxed text-foreground/90">
          <h2 className="font-display text-2xl leading-tight">
            How outside-IR35 take-home works
          </h2>
          <p>
            When you contract outside IR35 through your own limited company, the
            day rate is paid to the company as revenue, not to you as salary.
            You then decide how to pay yourself, and the order matters for tax.
          </p>
          <ol className="ml-5 list-decimal space-y-2">
            <li>
              <span className="font-medium text-foreground">Revenue.</span> Day
              rate times billable days worked in the year.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Salary and expenses.
              </span>{' '}
              A director salary (usually around the {fmt(c.PERSONAL_ALLOWANCE)}{' '}
              personal allowance) plus allowable business expenses are deducted
              before tax.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Corporation tax.
              </span>{' '}
              The company pays {(c.CT_SMALL_RATE * 100).toFixed(0)}% on profits
              up to {fmt(c.CT_LOWER_LIMIT)}, rising towards{' '}
              {(c.CT_MAIN_RATE * 100).toFixed(0)}% (with marginal relief) above
              that.
            </li>
            <li>
              <span className="font-medium text-foreground">Dividends.</span>{' '}
              Post-tax profit can be drawn as dividends. The first{' '}
              {fmt(c.DIVIDEND_ALLOWANCE)} is tax-free; the rest is taxed at your
              personal dividend rates.
            </li>
          </ol>
          <p>
            The efficient split is usually a low salary plus dividends, which is
            what the calculator defaults to. But you do not have to take
            everything: profit left in the company is still your
            business&rsquo;s money, available for a pension, a future year, or
            reinvestment. Slide the dividend control to model that.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="font-display text-2xl leading-tight">
            Frequently asked questions
          </h2>
          <dl className="mt-4 divide-y divide-border">
            {faqs.map((f) => (
              <div key={f.q} className="py-4">
                <dt className="font-medium text-foreground">{f.q}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Cross-links */}
        <section className="mt-14 rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-2xl leading-tight">
            Now find the contract
          </h2>
          <p className="mt-2 text-muted-foreground">
            Only outside-IR35 roles, with the day rate, work mode and the
            client&rsquo;s IR35 signal on every listing.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/jobs"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Browse outside-IR35 contracts
            </Link>
            <Link
              href="/day-rates"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              See day-rate benchmarks
            </Link>
          </div>
        </section>
      </div>
    </PageWrap>
  );
};

export default TakeHomeCalculatorPage;
