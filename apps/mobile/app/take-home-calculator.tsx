import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Slider from "@/components/Slider";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { useAnalytics } from "@/lib/analytics";
import {
  calculateTakeHome,
  DEFAULT_SALARY,
  DEFAULT_TAX_YEAR,
  TAKE_HOME_CAVEATS,
  taxConstants,
} from "@/lib/tax/takeHome";

const fmt = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;
const digits = (s: string) => s.replace(/[^0-9]/g, "");
const toNum = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const C = taxConstants(DEFAULT_TAX_YEAR);
const SALARY_MAX = C.UEL; // £50,270

// Native take-home calculator. Ports the verified web tax lib (lib/tax/takeHome)
// so the maths matches web exactly. Salary + dividend sliders (gesture-handler,
// no native dep), numeric day-rate/days/expenses inputs, live result with the
// "left in the company" line, collapsible breakdown, and a debounced
// CALCULATOR_USED event (day-rate-benchmark signal, same as web).
const TakeHomeCalculatorScreen = () => {
  const insets = useSafeAreaInsets();
  const { trackEvent } = useAnalytics();

  const [dayRateStr, setDayRateStr] = useState("500");
  const [daysStr, setDaysStr] = useState("220");
  const [salary, setSalary] = useState(DEFAULT_SALARY);
  const [expensesStr, setExpensesStr] = useState("");
  const [divMode, setDivMode] = useState<"all" | "custom">("all");
  const [customDividends, setCustomDividends] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const dayRate = toNum(dayRateStr);
  const daysWorked = toNum(daysStr);
  const expenses = expensesStr === "" ? undefined : toNum(expensesStr);

  const maxResult = useMemo(
    () => calculateTakeHome({ dayRate, daysWorked, salary, expenses }),
    [dayRate, daysWorked, salary, expenses],
  );
  const maxDividends = maxResult.dividends;

  // Keep the custom dividend within the current max as inputs change.
  useEffect(() => {
    setCustomDividends((v) => Math.min(v, Math.round(maxDividends)));
  }, [maxDividends]);

  const result = useMemo(
    () =>
      divMode === "all"
        ? maxResult
        : calculateTakeHome({
            dayRate,
            daysWorked,
            salary,
            expenses,
            dividends: customDividends,
          }),
    [divMode, maxResult, dayRate, daysWorked, salary, expenses, customDividends],
  );

  const retainedInCompany = Math.max(0, maxDividends - result.dividends);

  // Debounced market-intelligence event (settled inputs, not every drag frame).
  const lastTracked = useRef("");
  useEffect(() => {
    if (dayRate <= 0 || daysWorked <= 0) return;
    const key = `${dayRate}|${daysWorked}|${salary}|${expenses ?? ""}|${divMode}|${result.dividends}`;
    if (key === lastTracked.current) return;
    const id = setTimeout(() => {
      lastTracked.current = key;
      trackEvent(ANALYTICS_EVENTS.CALCULATOR_USED, {
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
    trackEvent,
  ]);

  const enterCustom = () => {
    setCustomDividends(Math.round(maxDividends));
    setDivMode("custom");
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 32,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="font-display text-3xl text-foreground">
        Take-home estimate
      </Text>
      <Text className="mt-1 text-sm text-muted-foreground">
        What an outside-IR35 contract actually leaves you, after tax.
      </Text>

      {/* Day rate + days */}
      <View className="mt-6 flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1.5 text-sm font-sans-medium text-foreground">
            Day rate
          </Text>
          <View className="flex-row items-center rounded-lg border border-border bg-card px-3">
            <Text className="text-base text-muted-foreground">£</Text>
            <TextInput
              className="ml-1 flex-1 py-3 text-base text-foreground"
              value={dayRateStr}
              onChangeText={(t) => setDayRateStr(digits(t))}
              keyboardType="number-pad"
              placeholder="500"
              placeholderTextColor="#a3a09e"
              maxLength={5}
            />
          </View>
        </View>
        <View className="flex-1">
          <Text className="mb-1.5 text-sm font-sans-medium text-foreground">
            Days a year
          </Text>
          <View className="flex-row items-center rounded-lg border border-border bg-card px-3">
            <TextInput
              className="flex-1 py-3 text-base text-foreground"
              value={daysStr}
              onChangeText={(t) => setDaysStr(digits(t))}
              keyboardType="number-pad"
              placeholder="220"
              placeholderTextColor="#a3a09e"
              maxLength={3}
            />
          </View>
        </View>
      </View>

      {/* Salary slider */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-sans-medium text-foreground">
            Director salary
          </Text>
          <Text className="font-display text-lg text-foreground">
            {fmt(salary)}
          </Text>
        </View>
        <Slider
          min={0}
          max={SALARY_MAX}
          step={10}
          value={salary}
          onChange={setSalary}
        />
        <Text className="text-xs text-muted-foreground">
          {salary === DEFAULT_SALARY
            ? "The usual low-salary split (matches the personal allowance)."
            : salary < DEFAULT_SALARY
              ? "Below the personal allowance."
              : "Above the NI threshold, so extra salary is taxed."}
        </Text>
      </View>

      {/* Dividend slider */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-sans-medium text-foreground">
            Dividends drawn
          </Text>
          <Text className="font-display text-lg text-foreground">
            {fmt(result.dividends)}
          </Text>
        </View>
        {divMode === "all" ? (
          <Pressable onPress={enterCustom} className="mt-1 active:opacity-70">
            <Text className="text-sm font-sans-medium text-link">
              Taking all profit as dividends. Draw less instead?
            </Text>
          </Pressable>
        ) : (
          <>
            <Slider
              min={0}
              max={Math.max(1, Math.round(maxDividends))}
              step={10}
              value={Math.min(customDividends, Math.round(maxDividends))}
              onChange={setCustomDividends}
            />
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">
                First {fmt(C.DIVIDEND_ALLOWANCE)} tax-free ({DEFAULT_TAX_YEAR})
              </Text>
              <Pressable
                onPress={() => setDivMode("all")}
                className="active:opacity-70"
              >
                <Text className="text-xs font-sans-medium text-link">
                  Take all
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Expenses */}
      <View className="mt-6">
        <Text className="mb-1.5 text-sm font-sans-medium text-foreground">
          Company expenses a year
        </Text>
        <View className="flex-row items-center rounded-lg border border-border bg-card px-3">
          <Text className="text-base text-muted-foreground">£</Text>
          <TextInput
            className="ml-1 flex-1 py-3 text-base text-foreground"
            value={expensesStr}
            onChangeText={(t) => setExpensesStr(digits(t))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#a3a09e"
            maxLength={6}
          />
        </View>
      </View>

      {/* Result */}
      <View className="mt-6 rounded-2xl border border-verified/30 bg-verified-muted/40 p-5">
        <Text className="text-xs font-sans-medium uppercase tracking-wide text-muted-foreground">
          Personal take-home
        </Text>
        <Text className="mt-1 font-display text-5xl text-verified">
          {fmt(result.takeHome)}
        </Text>
        <Text className="mt-2 text-sm text-muted-foreground">
          You keep{" "}
          <Text className="font-sans-semibold text-foreground">
            {Math.round(result.retentionRate * 100)}%
          </Text>{" "}
          of {fmt(result.revenue)} billed.
        </Text>
        {retainedInCompany > 0 ? (
          <View className="mt-4 flex-row items-end justify-between border-t border-verified/20 pt-3">
            <View className="flex-1 pr-3">
              <Text className="text-sm text-muted-foreground">
                Left in the company
              </Text>
              <Text className="text-xs text-muted-foreground/70">
                Undrawn profit, still your business’s
              </Text>
            </View>
            <Text className="font-display text-2xl text-foreground">
              {fmt(retainedInCompany)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Breakdown */}
      <Pressable
        onPress={() => setShowBreakdown((v) => !v)}
        className="mt-4 active:opacity-70"
      >
        <Text className="text-sm font-sans-medium text-link">
          {showBreakdown ? "Hide breakdown" : "Show breakdown"}
        </Text>
      </Pressable>
      {showBreakdown ? (
        <View className="mt-3 gap-2">
          <BreakdownRow label="Company revenue" value={fmt(result.revenue)} />
          {result.expenses > 0 ? (
            <BreakdownRow label="Expenses" value={`− ${fmt(result.expenses)}`} />
          ) : null}
          <BreakdownRow
            label="Corporation tax"
            value={`− ${fmt(result.corporationTax)}`}
          />
          <BreakdownRow
            label="Salary income tax + NI"
            value={`− ${fmt(result.incomeTaxSalary + result.employeeNI + result.employerNI)}`}
          />
          <BreakdownRow
            label="Dividend tax"
            value={`− ${fmt(result.dividendTax)}`}
            sub={`${fmt(result.dividends)} drawn · first ${fmt(C.DIVIDEND_ALLOWANCE)} tax-free`}
          />
        </View>
      ) : null}

      <Text className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        {TAKE_HOME_CAVEATS[0]} {TAKE_HOME_CAVEATS[1]} {TAKE_HOME_CAVEATS[2]}
      </Text>
    </ScrollView>
  );
};

const BreakdownRow = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <View className="flex-row justify-between gap-4">
    <View className="flex-1">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      {sub ? (
        <Text className="text-xs text-muted-foreground/70">{sub}</Text>
      ) : null}
    </View>
    <Text className="font-mono text-sm text-foreground">{value}</Text>
  </View>
);

export default TakeHomeCalculatorScreen;
