'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TRACKING_EVENTS } from '@/constants';
import {
  calculateTakeHome,
  DEFAULT_SALARY,
  TAKE_HOME_CAVEATS,
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

type Props = {
  className?: string;
  /** Compact = hero variant (no "how it works" footer). */
  compact?: boolean;
};

/**
 * Live UK outside-IR35 take-home estimator. Recomputes as you type via the
 * verified tax lib (lib/tax/takeHome — unit-tested). The headline take-home
 * updates instantly; a settled-value analytics event (CALCULATOR_USED) captures
 * what rate the visitor modelled, which is a direct market-intelligence signal
 * for day-rate benchmarking. This is an estimate — the caveats are shown.
 */
const TakeHomeCalculator = ({ className, compact = false }: Props) => {
  const { track } = useAnalytics();

  // Sensible defaults so the widget shows a real number on first paint (this is
  // the "wow" — an instant, credible figure, not an empty form).
  const [dayRateStr, setDayRateStr] = useState('500');
  const [daysStr, setDaysStr] = useState('220');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [salaryStr, setSalaryStr] = useState(String(DEFAULT_SALARY));
  const [expensesStr, setExpensesStr] = useState('');

  const dayRate = parseNum(dayRateStr) ?? 0;
  const daysWorked = parseNum(daysStr) ?? 0;
  const salary = parseNum(salaryStr);
  const expenses = parseNum(expensesStr);

  const result = useMemo(
    () =>
      calculateTakeHome({
        dayRate,
        daysWorked,
        // Only pass advanced fields when the section is open, so a stray value
        // left behind doesn't silently affect the headline number.
        salary: showAdvanced ? salary : undefined,
        expenses: showAdvanced ? expenses : undefined,
      }),
    [dayRate, daysWorked, salary, expenses, showAdvanced],
  );

  // Debounced market-intelligence event: fire once the inputs settle (800ms
  // after the last change), not on every keystroke. Skip empty/zero states.
  const lastTracked = useRef<string>('');
  useEffect(() => {
    if (dayRate <= 0 || daysWorked <= 0) return;
    const key = `${dayRate}|${daysWorked}|${showAdvanced ? salary : ''}|${showAdvanced ? expenses : ''}`;
    if (key === lastTracked.current) return;
    const id = setTimeout(() => {
      lastTracked.current = key;
      track(TRACKING_EVENTS.CALCULATOR_USED, {
        dayRate,
        daysWorked,
        revenue: result.revenue,
        takeHome: result.takeHome,
        retentionRatePct: Math.round(result.retentionRate * 100),
        salary: showAdvanced ? (salary ?? null) : null,
        expenses: showAdvanced ? (expenses ?? null) : null,
      });
    }, 800);
    return () => clearTimeout(id);
  }, [
    dayRate,
    daysWorked,
    salary,
    expenses,
    showAdvanced,
    result.revenue,
    result.takeHome,
    result.retentionRate,
    track,
  ]);

  const rows: { label: string; value: string; muted?: boolean }[] = [
    { label: 'Company revenue', value: fmt(result.revenue) },
    { label: 'Corporation tax', value: `− ${fmt(result.corporationTax)}` },
    {
      label: 'Income tax + NI',
      value: `− ${fmt(result.incomeTaxSalary + result.employeeNI)}`,
    },
    { label: 'Dividend tax', value: `− ${fmt(result.dividendTax)}` },
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

      {showAdvanced ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="calc-salary">Director salary</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                £
              </span>
              <Input
                id="calc-salary"
                inputMode="numeric"
                className="pl-7"
                value={salaryStr}
                onChange={(e) => setSalaryStr(e.target.value)}
                placeholder={String(DEFAULT_SALARY)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="calc-expenses">Expenses a year</Label>
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
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-3 text-xs font-medium text-link hover:underline"
      >
        {showAdvanced ? 'Hide' : 'Adjust'} salary and expenses
      </button>

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
          of {fmt(result.revenue)} billed.
        </p>
      </div>

      {/* Breakdown */}
      <dl className="mt-5 space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                'tabular-nums',
                row.muted ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

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
