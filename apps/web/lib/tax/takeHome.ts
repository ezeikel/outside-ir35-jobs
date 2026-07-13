// UK outside-IR35 limited-company (PSC) take-home estimator.
//
// A pure function — no I/O, no framework — so it is trivially unit-testable and
// shareable. This is money/legal-adjacent, so the tax math is derived from
// primary gov.uk sources, double-verified by two independent derivations that
// reconciled to the penny, and locked with unit tests (see takeHome.test.ts).
//
// Model: a single director bills a day rate through their own company, pays
// themselves a low salary (default £12,570 = personal allowance = NI primary
// threshold), and extracts the remaining post-corporation-tax profit as
// dividends. It computes corporation tax, employer + employee NI, income tax on
// salary, and dividend tax, then the net take-home.
//
// NOT modelled (surfaced as caveats in the UI, see TAKE_HOME_CAVEATS): VAT / Flat
// Rate Scheme, pensions, student loans, Scotland's separate income-tax bands,
// associated-company CT-limit pro-rating, and other personal income.

/**
 * Tax-year constants. Keyed by tax year so the calculator stays correct across
 * the 6 April boundary (e.g. dividend rates rise in 2026/27). Only 2025/26 is
 * populated today; add the next year's block when it's confirmed.
 */
export type TaxYear = '2025/26';

type TaxConstants = {
  // Corporation tax
  CT_SMALL_RATE: number;
  CT_MAIN_RATE: number;
  CT_LOWER_LIMIT: number;
  CT_UPPER_LIMIT: number;
  CT_MARGINAL_RELIEF_FRACTION: number;
  // Income tax (England / Northern Ireland)
  PERSONAL_ALLOWANCE: number;
  PA_TAPER_THRESHOLD: number;
  PA_TAPER_RATE: number;
  BASIC_RATE: number;
  HIGHER_RATE: number;
  ADDITIONAL_RATE: number;
  BASIC_BAND_WIDTH: number;
  ADDITIONAL_RATE_THRESHOLD: number;
  // Dividends
  DIVIDEND_ALLOWANCE: number;
  DIV_BASIC_RATE: number;
  DIV_HIGHER_RATE: number;
  DIV_ADDITIONAL_RATE: number;
  // Employee (primary) Class 1 NI
  PRIMARY_THRESHOLD: number;
  UEL: number;
  EMPLOYEE_NI_MAIN_RATE: number;
  EMPLOYEE_NI_UPPER_RATE: number;
  // Employer (secondary) Class 1 NI
  SECONDARY_THRESHOLD: number;
  EMPLOYER_NI_RATE: number;
  EMPLOYMENT_ALLOWANCE: number;
  // Default director salary (= personal allowance = primary threshold)
  OPTIMAL_SALARY: number;
};

// Every figure verified against gov.uk for tax year 2025/26 (England / NI).
const CONSTANTS_2025_26: TaxConstants = {
  CT_SMALL_RATE: 0.19,
  CT_MAIN_RATE: 0.25,
  CT_LOWER_LIMIT: 50_000,
  CT_UPPER_LIMIT: 250_000,
  CT_MARGINAL_RELIEF_FRACTION: 3 / 200, // 0.015 → 26.5% marginal rate

  PERSONAL_ALLOWANCE: 12_570,
  PA_TAPER_THRESHOLD: 100_000,
  PA_TAPER_RATE: 0.5,
  BASIC_RATE: 0.2,
  HIGHER_RATE: 0.4,
  ADDITIONAL_RATE: 0.45,
  BASIC_BAND_WIDTH: 37_700,
  ADDITIONAL_RATE_THRESHOLD: 125_140,

  DIVIDEND_ALLOWANCE: 500,
  DIV_BASIC_RATE: 0.0875,
  DIV_HIGHER_RATE: 0.3375,
  DIV_ADDITIONAL_RATE: 0.3935,

  PRIMARY_THRESHOLD: 12_570,
  UEL: 50_270,
  EMPLOYEE_NI_MAIN_RATE: 0.08,
  EMPLOYEE_NI_UPPER_RATE: 0.02,

  SECONDARY_THRESHOLD: 5_000,
  EMPLOYER_NI_RATE: 0.15,
  EMPLOYMENT_ALLOWANCE: 10_500,

  OPTIMAL_SALARY: 12_570,
};

const CONSTANTS: Record<TaxYear, TaxConstants> = {
  '2025/26': CONSTANTS_2025_26,
};

export const DEFAULT_TAX_YEAR: TaxYear = '2025/26';

// The default director salary for the current year — exported so the UI can
// pre-fill it and label it as the assumed optimal split.
export const DEFAULT_SALARY = CONSTANTS_2025_26.OPTIMAL_SALARY;

export type TakeHomeInput = {
  /** Contract day rate in £. */
  dayRate: number;
  /** Billable days worked in the tax year. */
  daysWorked: number;
  /** Director salary in £ (defaults to the personal allowance / NI threshold). */
  salary?: number;
  /**
   * Dividends drawn in £. Omit to auto-distribute all post-CT profit (the
   * common case the calculator models). If provided, it's capped at the
   * distributable reserves.
   */
  dividends?: number;
  /** Annual allowable company expenses in £ (reduce profit before CT). */
  expenses?: number;
  /**
   * Whether the company can claim the Employment Allowance. Defaults false — a
   * single-director-only company is statutorily excluded.
   */
  claimEmploymentAllowance?: boolean;
  /** Tax year to compute against (defaults to the current year). */
  taxYear?: TaxYear;
};

export type TakeHomeResult = {
  revenue: number;
  expenses: number;
  employerNI: number;
  profitBeforeCT: number;
  corporationTax: number;
  dividends: number;
  personalAllowance: number;
  employeeNI: number;
  incomeTaxSalary: number;
  dividendTax: number;
  salaryNet: number;
  dividendNet: number;
  /** Personal take-home (net salary + net dividends). */
  takeHome: number;
  /** All company + personal tax and NI combined. */
  totalTaxAndNI: number;
  /** takeHome / revenue, 0..1. */
  retentionRate: number;
  taxYear: TaxYear;
};

// Round half-up to 2dp. Applied only at the boundaries the spec marks, so
// intermediate arithmetic stays exact.
const round2 = (x: number): number =>
  Math.round((x + Number.EPSILON) * 100) / 100;

// Amount of `x` that falls in the band (lo, hi]. Used for salary income tax.
const band = (x: number, lo: number, hi: number): number =>
  Math.max(0, Math.min(x, hi) - lo);

// Amount of the interval [a, b) that overlaps the band (lo, hi]. Used to slot a
// dividend block (which sits ON TOP of salary) into the rate ladder.
const band2 = (a: number, b: number, lo: number, hi: number): number =>
  Math.max(0, Math.min(b, hi) - Math.max(a, lo));

/**
 * Estimate a UK outside-IR35 contractor's personal take-home for a tax year.
 * Pure. See the module header + TAKE_HOME_CAVEATS for what's assumed/excluded.
 */
export const calculateTakeHome = (input: TakeHomeInput): TakeHomeResult => {
  const taxYear = input.taxYear ?? DEFAULT_TAX_YEAR;
  const c = CONSTANTS[taxYear];

  const dayRate = Math.max(0, input.dayRate || 0);
  const daysWorked = Math.max(0, input.daysWorked || 0);
  const salary = Math.max(0, input.salary ?? c.OPTIMAL_SALARY);
  const expenses = Math.max(0, input.expenses ?? 0);
  const claimEA = input.claimEmploymentAllowance ?? false;

  // 1. Company revenue.
  const revenue = round2(dayRate * daysWorked);

  // 2. Employer NI on the director's salary (a CT-deductible cost).
  const employerNIraw =
    Math.max(0, salary - c.SECONDARY_THRESHOLD) * c.EMPLOYER_NI_RATE;
  const employmentAllowance = claimEA
    ? Math.min(c.EMPLOYMENT_ALLOWANCE, employerNIraw)
    : 0;
  const employerNI = round2(Math.max(0, employerNIraw - employmentAllowance));

  // 3. Profit before corporation tax (salary + employer NI are deductible).
  const profitBeforeCT = round2(revenue - expenses - salary - employerNI);

  // 4. Corporation tax, with marginal relief between the £50k/£250k limits.
  let corporationTax: number;
  if (profitBeforeCT <= 0) {
    corporationTax = 0;
  } else if (profitBeforeCT <= c.CT_LOWER_LIMIT) {
    corporationTax = round2(profitBeforeCT * c.CT_SMALL_RATE);
  } else if (profitBeforeCT >= c.CT_UPPER_LIMIT) {
    corporationTax = round2(profitBeforeCT * c.CT_MAIN_RATE);
  } else {
    corporationTax = round2(
      profitBeforeCT * c.CT_MAIN_RATE -
        (c.CT_UPPER_LIMIT - profitBeforeCT) * c.CT_MARGINAL_RELIEF_FRACTION,
    );
  }

  // 5. Distributable reserves → dividends (capped at reserves if a value given).
  const distributableProfit = round2(profitBeforeCT - corporationTax);
  const dividends =
    input.dividends != null
      ? Math.min(Math.max(0, input.dividends), Math.max(0, distributableProfit))
      : Math.max(0, distributableProfit);

  // 6. Personal allowance, tapered £1 per £2 of adjusted net income over £100k.
  const adjustedNetIncome = salary + dividends;
  const personalAllowance =
    adjustedNetIncome <= c.PA_TAPER_THRESHOLD
      ? c.PERSONAL_ALLOWANCE
      : Math.max(
          0,
          c.PERSONAL_ALLOWANCE -
            (adjustedNetIncome - c.PA_TAPER_THRESHOLD) * c.PA_TAPER_RATE,
        );

  // 7. Employee NI on salary (director annual basis).
  const employeeNI = round2(
    Math.max(0, Math.min(salary, c.UEL) - c.PRIMARY_THRESHOLD) *
      c.EMPLOYEE_NI_MAIN_RATE +
      Math.max(0, salary - c.UEL) * c.EMPLOYEE_NI_UPPER_RATE,
  );

  // 8. Band boundaries from the (possibly tapered) PA, shared by 8 & 9.
  const basicBandTop = c.BASIC_BAND_WIDTH; // taxable width of the 20% band
  const higherBandTop = c.ADDITIONAL_RATE_THRESHOLD - personalAllowance;

  // Salary is taxed first.
  const salaryTaxable = Math.max(0, salary - personalAllowance);
  const incomeTaxSalary = round2(
    band(salaryTaxable, 0, basicBandTop) * c.BASIC_RATE +
      band(salaryTaxable, basicBandTop, higherBandTop) * c.HIGHER_RATE +
      band(salaryTaxable, higherBandTop, Infinity) * c.ADDITIONAL_RATE,
  );

  // 9. Dividends stack on top of salary using the same band ladder. Any PA left
  // after salary shelters dividends at 0%, then the £500 allowance (which
  // OCCUPIES band space), then the ladder.
  const paLeftForDiv = Math.max(
    0,
    personalAllowance - Math.min(salary, personalAllowance),
  );
  const divAfterPA = Math.max(0, dividends - paLeftForDiv);
  const divTaxable = Math.max(0, divAfterPA - c.DIVIDEND_ALLOWANCE);
  const divBandStart =
    salaryTaxable + Math.min(divAfterPA, c.DIVIDEND_ALLOWANCE);
  const divBandEnd = divBandStart + divTaxable;
  const dividendTax = round2(
    band2(divBandStart, divBandEnd, 0, basicBandTop) * c.DIV_BASIC_RATE +
      band2(divBandStart, divBandEnd, basicBandTop, higherBandTop) *
        c.DIV_HIGHER_RATE +
      band2(divBandStart, divBandEnd, higherBandTop, Infinity) *
        c.DIV_ADDITIONAL_RATE,
  );

  // 10. Net figures + summary.
  const salaryNet = round2(salary - employeeNI - incomeTaxSalary);
  const dividendNet = round2(dividends - dividendTax);
  const takeHome = round2(salaryNet + dividendNet);
  const totalTaxAndNI = round2(
    corporationTax + employerNI + employeeNI + incomeTaxSalary + dividendTax,
  );
  const retentionRate = revenue > 0 ? takeHome / revenue : 0;

  return {
    revenue,
    expenses,
    employerNI,
    profitBeforeCT,
    corporationTax,
    dividends,
    personalAllowance,
    employeeNI,
    incomeTaxSalary,
    dividendTax,
    salaryNet,
    dividendNet,
    takeHome,
    totalTaxAndNI,
    retentionRate,
    taxYear,
  };
};

/**
 * Caveats the UI MUST surface next to any figure — this is an estimate, not tax
 * advice, and the assumptions materially affect the result.
 */
export const TAKE_HOME_CAVEATS: readonly string[] = [
  'Estimate only, not tax advice.',
  'Assumes the common low-salary / high-dividend split (£12,570 salary, remaining post-tax profit as dividends), a single director with no other income, over a full tax year.',
  'Uses England and Northern Ireland income-tax bands. Scotland has different bands.',
  'Excludes VAT and the Flat Rate Scheme, pension contributions, student-loan repayments, and other personal income.',
  "Applies employer's National Insurance and assumes the Employment Allowance is unavailable (a single-director company is excluded).",
  'Assumes one company (the corporation-tax limits are shared across associated companies, which is not modelled).',
];
