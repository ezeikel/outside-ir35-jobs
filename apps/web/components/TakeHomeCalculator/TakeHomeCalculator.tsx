'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TRACKING_EVENTS } from '@/constants';
import {
  calculateTakeHome,
  DEFAULT_SALARY,
  DEFAULT_TAX_YEAR,
  TAKE_HOME_CAVEATS,
  taxConstants,
} from '@/lib/tax/takeHome';
import { useAnalytics } from '@/utils/analytics-client';
import cn from '@/utils/cn';

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;

// Parse a currency-ish string ("1,200", "£500") to a number; '' → undefined.
const parseNum = (s: string): number | undefined => {
  const cleaned = s.replace(/[£,\s]/g, '');
  if (cleaned === '') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

// Current-year figures for labels (dividend allowance, sensible salary cap).
const C = taxConstants(DEFAULT_TAX_YEAR);
// A sensible top for the salary slider: the point above which extra salary is
// taxed at the higher NI+income rates and stops being efficient vs dividends.
const SALARY_SLIDER_MAX = C.UEL; // £50,270

type Props = {
  className?: string;
  /** Compact = hero variant (tighter, breakdown collapsed by default). */
  compact?: boolean;
};

/**
 * Interactive UK outside-IR35 take-home estimator. The headline take-home
 * updates live as you tune the levers a contractor actually controls:
 *  - day rate + days worked (the contract),
 *  - director salary (slider £0 → £50,270),
 *  - dividends drawn (slider £0 → max distributable) — leave profit in the
 *    company or take it all,
 *  - annual company expenses.
 * All maths comes from the verified, unit-tested tax lib (lib/tax/takeHome),
 * keyed to the current tax year. A settled-value analytics event
 * (CALCULATOR_USED) captures what rate the visitor modelled — a direct
 * day-rate-benchmark signal. This is an estimate; the caveats are shown.
 */
const TakeHomeCalculator = ({ className, compact = false }: Props) => {
  const { track } = useAnalytics();

  // Sensible defaults so the widget shows a real, credible number on first paint.
  const [dayRateStr, setDayRateStr] = useState('500');
  const [daysStr, setDaysStr] = useState('220');
  const [salary, setSalary] = useState(DEFAULT_SALARY);
  const [expensesStr, setExpensesStr] = useState('');
  // Dividend control: 'all' auto-distributes every penny of post-tax profit
  // (the common case); 'custom' lets you slide how much to actually draw.
  const [divMode, setDivMode] = useState<'all' | 'custom'>('all');
  const [customDividends, setCustomDividends] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(!compact);

  const dayRate = parseNum(dayRateStr) ?? 0;
  const daysWorked = parseNum(daysStr) ?? 0;
  const expenses = parseNum(expensesStr);

  // The "take everything" result — its `dividends` is the max the slider allows
  // (i.e. the full distributable reserves for the current inputs).
  const maxResult = useMemo(
    () => calculateTakeHome({ dayRate, daysWorked, salary, expenses }),
    [dayRate, daysWorked, salary, expenses],
  );
  const maxDividends = maxResult.dividends;

  // Keep the custom slider within the current max as inputs change (e.g. a lower
  // day rate shrinks the pool). Clamp, don't reset, so dragging feels stable.
  useEffect(() => {
    setCustomDividends((v) => Math.min(v, Math.round(maxDividends)));
  }, [maxDividends]);

  // When you first switch to custom mode, start from the current max so the
  // headline doesn't jump — you then slide down from "take all".
  const enterCustom = () => {
    setCustomDividends(Math.round(maxDividends));
    setDivMode('custom');
  };

  const result = useMemo(
    () =>
      divMode === 'all'
        ? maxResult
        : calculateTakeHome({
            dayRate,
            daysWorked,
            salary,
            expenses,
            dividends: customDividends,
          }),
    [
      divMode,
      maxResult,
      dayRate,
      daysWorked,
      salary,
      expenses,
      customDividends,
    ],
  );

  // Money left in the company (undrawn profit) — real money the business keeps,
  // just not personal take-home. Surfaced because contractors think about it.
  const retainedInCompany = Math.max(0, maxDividends - result.dividends);

  // Debounced market-intelligence event: fire once inputs settle. Skip empty.
  const lastTracked = useRef<string>('');
  useEffect(() => {
    if (dayRate <= 0 || daysWorked <= 0) return;
    const key = `${dayRate}|${daysWorked}|${salary}|${expenses ?? ''}|${divMode}|${result.dividends}`;
    if (key === lastTracked.current) return;
    const id = setTimeout(() => {
      lastTracked.current = key;
      track(TRACKING_EVENTS.CALCULATOR_USED, {
        dayRate,
        daysWorked,
        revenue: result.revenue,
        takeHome: result.takeHome,
        retentionRatePct: Math.round(result.retentionRate * 100),
        salary,
        expenses: expenses ?? null,
      });
    }, 800);
    return () => clearTimeout(id);
  }, [
    dayRate,
    daysWorked,
    salary,
    expenses,
    divMode,
    result.dividends,
    result.revenue,
    result.takeHome,
    result.retentionRate,
    track,
  ]);

  const rows: { label: string; value: string; sub?: string }[] = [
    { label: 'Company revenue', value: fmt(result.revenue) },
    ...(result.expenses > 0
      ? [{ label: 'Expenses', value: `− ${fmt(result.expenses)}` }]
      : []),
    { label: 'Corporation tax', value: `− ${fmt(result.corporationTax)}` },
    {
      label: 'Salary income tax + NI',
      value: `− ${fmt(result.incomeTaxSalary + result.employeeNI + result.employerNI)}`,
    },
    {
      label: 'Dividend tax',
      value: `− ${fmt(result.dividendTax)}`,
      sub: `${fmt(result.dividends)} drawn · first ${fmt(C.DIVIDEND_ALLOWANCE)} tax-free`,
    },
    ...(retainedInCompany > 0
      ? [
          {
            label: 'Left in the company',
            value: fmt(retainedInCompany),
            sub: 'Undrawn profit. Still your business’s money.',
          },
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        'w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8',
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="font-display text-3xl leading-none text-foreground">
          Take-home estimate
        </h2>
        <p className="text-sm text-muted-foreground">
          What an outside-IR35 contract actually leaves you, after tax.
        </p>
      </div>

      {/* Contract inputs */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="calc-day-rate">Day rate</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              £
            </span>
            <Input
              id="calc-day-rate"
              inputMode="numeric"
              className="pl-7"
              value={dayRateStr}
              onChange={(e) => setDayRateStr(e.target.value)}
              placeholder="500"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="calc-days">Days a year</Label>
          <Input
            id="calc-days"
            inputMode="numeric"
            value={daysStr}
            onChange={(e) => setDaysStr(e.target.value)}
            placeholder="220"
          />
        </div>
      </div>

      {/* Salary slider */}
      <div className="mt-5 grid gap-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="calc-salary">Director salary</Label>
          <span className="font-display text-lg text-foreground">
            {fmt(salary)}
          </span>
        </div>
        <input
          id="calc-salary"
          type="range"
          min={0}
          max={SALARY_SLIDER_MAX}
          step={10}
          value={salary}
          onChange={(e) => setSalary(Number(e.target.value))}
          className="oir35-range"
          aria-label="Director salary"
        />
        <p className="text-xs text-muted-foreground">
          {salary === DEFAULT_SALARY
            ? 'The usual low-salary split (matches the personal allowance).'
            : salary < DEFAULT_SALARY
              ? 'Below the personal allowance.'
              : 'Above the NI threshold, so extra salary is taxed.'}
        </p>
      </div>

      {/* Dividend control */}
      <div className="mt-5 grid gap-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="calc-dividends">Dividends drawn</Label>
          <span className="font-display text-lg text-foreground">
            {fmt(result.dividends)}
          </span>
        </div>
        {divMode === 'all' ? (
          <button
            type="button"
            onClick={enterCustom}
            className="justify-self-start text-xs font-medium text-link hover:underline"
          >
            Taking all profit as dividends. Draw less instead?
          </button>
        ) : (
          <>
            <input
              id="calc-dividends"
              type="range"
              min={0}
              max={Math.max(1, Math.round(maxDividends))}
              step={10}
              value={Math.min(customDividends, Math.round(maxDividends))}
              onChange={(e) => setCustomDividends(Number(e.target.value))}
              className="oir35-range"
              aria-label="Dividends drawn"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                First {fmt(C.DIVIDEND_ALLOWANCE)} tax-free ({DEFAULT_TAX_YEAR})
              </span>
              <button
                type="button"
                onClick={() => setDivMode('all')}
                className="font-medium text-link hover:underline"
              >
                Take all
              </button>
            </div>
          </>
        )}
      </div>

      {/* Expenses */}
      <div className="mt-5 grid gap-2">
        <Label htmlFor="calc-expenses">Company expenses a year</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            £
          </span>
          <Input
            id="calc-expenses"
            inputMode="numeric"
            className="pl-7"
            value={expensesStr}
            onChange={(e) => setExpensesStr(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Headline result — forest green = the money figure. */}
      <div className="mt-6 rounded-xl border border-verified/30 bg-verified-muted/40 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Estimated annual take-home
        </p>
        <p className="mt-1 font-display text-5xl leading-none text-verified">
          {fmt(result.takeHome)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You keep{' '}
          <span className="font-semibold text-foreground">
            {Math.round(result.retentionRate * 100)}%
          </span>{' '}
          of {fmt(result.revenue)} billed
          {retainedInCompany > 0
            ? `, plus ${fmt(retainedInCompany)} kept in the company`
            : ''}
          .
        </p>
      </div>

      {/* Breakdown (collapsible) */}
      <button
        type="button"
        onClick={() => setShowBreakdown((v) => !v)}
        className="mt-4 text-xs font-medium text-link hover:underline"
      >
        {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
      </button>
      {showBreakdown ? (
        <dl className="mt-3 space-y-2 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {row.label}
                {row.sub ? (
                  <span className="block text-xs text-muted-foreground/70">
                    {row.sub}
                  </span>
                ) : null}
              </dt>
              <dd className="shrink-0 tabular-nums text-foreground">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {!compact ? (
        <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          {TAKE_HOME_CAVEATS[0]} {TAKE_HOME_CAVEATS[1]} {TAKE_HOME_CAVEATS[2]}
        </p>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          {TAKE_HOME_CAVEATS[0]}
        </p>
      )}
    </div>
  );
};

export default TakeHomeCalculator;
