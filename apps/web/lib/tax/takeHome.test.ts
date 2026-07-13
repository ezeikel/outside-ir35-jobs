import { describe, expect, it } from 'vitest';
import { calculateTakeHome, DEFAULT_SALARY } from './takeHome';

// Fixtures are from two independent tax derivations that reconciled to the penny
// against gov.uk 2025/26 rates (see scratchpad HERO-tax-reconcile.md). Every
// intermediate is asserted so a regression pinpoints WHICH step drifted, not
// just the total. Money is compared with a ±£0.01 tolerance to absorb
// floating-point rounding at the marked boundaries.
const near = (actual: number, expected: number, tol = 0.01) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

describe('calculateTakeHome — reconciled worked examples', () => {
  it('Example 1: £500/day × 220 days, default salary → £71,412.53 take-home', () => {
    const r = calculateTakeHome({ dayRate: 500, daysWorked: 220 });
    near(r.revenue, 110_000);
    near(r.employerNI, 1_135.5);
    near(r.profitBeforeCT, 96_294.5);
    near(r.corporationTax, 21_768.04);
    near(r.dividends, 74_526.46);
    near(r.personalAllowance, 12_570); // no taper
    near(r.employeeNI, 0);
    near(r.incomeTaxSalary, 0);
    near(r.dividendTax, 15_683.93);
    near(r.takeHome, 71_412.53);
    near(r.totalTaxAndNI, 38_587.47);
    expect(r.retentionRate).toBeCloseTo(0.649, 2);
  });

  it('Example 2: £650/day × 230 days (PA taper + higher-rate dividends) → £87,017.54', () => {
    const r = calculateTakeHome({ dayRate: 650, daysWorked: 230 });
    near(r.revenue, 149_500);
    near(r.employerNI, 1_135.5);
    near(r.profitBeforeCT, 135_794.5);
    near(r.corporationTax, 32_235.54);
    near(r.dividends, 103_558.96);
    near(r.personalAllowance, 4_505.52); // tapered
    near(r.employeeNI, 0);
    near(r.incomeTaxSalary, 1_612.9);
    near(r.dividendTax, 27_498.52);
    near(r.takeHome, 87_017.54);
    near(r.totalTaxAndNI, 62_482.46);
    expect(r.retentionRate).toBeCloseTo(0.582, 2);
  });
});

describe('calculateTakeHome — edge fixtures', () => {
  it('small-profits only: £300 × 100 → £24,657.42', () => {
    const r = calculateTakeHome({ dayRate: 300, daysWorked: 100 });
    near(r.revenue, 30_000);
    near(r.corporationTax, 3_095.96);
    near(r.takeHome, 24_657.42);
  });

  it('deep additional-rate: £1,500 × 250 → main-rate CT, PA fully lost, £187,030.00', () => {
    const r = calculateTakeHome({ dayRate: 1_500, daysWorked: 250 });
    near(r.revenue, 375_000);
    near(r.corporationTax, 90_323.63);
    near(r.personalAllowance, 0); // fully tapered away
    near(r.takeHome, 187_030.0);
  });

  it('arbitrary higher salary triggers the employee-NI path: salary £50,270 on £150k rev → £83,156.74', () => {
    const r = calculateTakeHome({
      dayRate: 1_000,
      daysWorked: 150,
      salary: 50_270,
    });
    near(r.revenue, 150_000);
    expect(r.employeeNI).toBeGreaterThan(0); // salary above the primary threshold
    near(r.personalAllowance, 1_404.74);
    near(r.takeHome, 83_156.74);
  });
});

describe('calculateTakeHome — invariants & guards', () => {
  it('reconciliation invariant holds across the profit range: revenue − expenses − takeHome === totalTaxAndNI', () => {
    for (const dayRate of [200, 350, 500, 800, 1200, 2000]) {
      for (const daysWorked of [80, 150, 220, 260]) {
        const r = calculateTakeHome({ dayRate, daysWorked });
        near(r.revenue - r.expenses - r.takeHome, r.totalTaxAndNI, 0.02);
      }
    }
  });

  it('expenses reduce profit before CT and flow through to take-home', () => {
    const without = calculateTakeHome({ dayRate: 500, daysWorked: 220 });
    const withExp = calculateTakeHome({
      dayRate: 500,
      daysWorked: 220,
      expenses: 10_000,
    });
    // Expenses cut the dividend pool, so take-home drops — but by less than the
    // gross expense (the company would have paid CT + dividend tax on it).
    expect(withExp.takeHome).toBeLessThan(without.takeHome);
    expect(without.takeHome - withExp.takeHome).toBeLessThan(10_000);
  });

  it('the Employment Allowance wipes the employer-NI cost when claimable', () => {
    const noEA = calculateTakeHome({ dayRate: 500, daysWorked: 220 });
    const withEA = calculateTakeHome({
      dayRate: 500,
      daysWorked: 220,
      claimEmploymentAllowance: true,
    });
    expect(noEA.employerNI).toBeGreaterThan(0);
    near(withEA.employerNI, 0);
    expect(withEA.takeHome).toBeGreaterThan(noEA.takeHome);
  });

  it('CT small-profits boundary: profit exactly £50,000 taxes at 19% (£9,500)', () => {
    // salary + employerNI + expenses chosen so profitBeforeCT lands on £50,000.
    // Default salary £12,570 → employerNI £1,135.50. revenue = 50,000 + 12,570 +
    // 1,135.50 = £63,705.50.
    const r = calculateTakeHome({ dayRate: 63_705.5, daysWorked: 1 });
    near(r.profitBeforeCT, 50_000);
    near(r.corporationTax, 9_500);
  });

  it('zero revenue does not throw; take-home is just the (untaxed) default salary, retention 0', () => {
    const r = calculateTakeHome({ dayRate: 0, daysWorked: 0 });
    // No revenue but the director still draws the default £12,570 salary, which
    // is below every tax/NI threshold → net £12,570. Retention is 0 (no revenue).
    near(r.takeHome, DEFAULT_SALARY);
    expect(r.retentionRate).toBe(0);
    expect(Number.isFinite(r.takeHome)).toBe(true);
  });

  it('zero revenue AND zero salary returns a clean zero', () => {
    const r = calculateTakeHome({ dayRate: 0, daysWorked: 0, salary: 0 });
    expect(r.takeHome).toBe(0);
    expect(r.retentionRate).toBe(0);
  });

  it('dividends cannot exceed distributable reserves', () => {
    const r = calculateTakeHome({
      dayRate: 500,
      daysWorked: 220,
      dividends: 999_999,
    });
    // capped at reserves — same as the auto-distribute case
    const auto = calculateTakeHome({ dayRate: 500, daysWorked: 220 });
    near(r.dividends, auto.dividends);
  });

  it('exposes the default director salary', () => {
    expect(DEFAULT_SALARY).toBe(12_570);
  });
});
