import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { LineGraph, type GraphPoint } from "react-native-graph";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import ContentColumn from "@/components/ContentColumn";
import ErrorState from "@/components/ErrorState";
import {
  fetchListingAnalytics,
  type ListingAnalytics,
} from "@/lib/api-analytics";

// Per-listing analytics, a full screen pushed from the Listings tab (Mobbin: Upwork
// "My stats", Deel analytics, Squarespace funnel are all full screens, not sheets).
// First-party performance for the recruiter's OWN listing: headline stats, the
// applicant funnel (proportional native bars), and a 14-day applications bar chart
// (bars read better than a line for discrete daily counts). Never a candidate score.

const GREEN = "#1f5d43";
const INK = "#17181a";
const MUTED = "#a3a09e";

const Stat = ({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: number;
  tone?: "ink" | "green";
}) => (
  <View className="flex-1 rounded-2xl border border-border bg-card p-4">
    <Text
      className="font-display text-4xl"
      style={{ color: tone === "green" ? GREEN : INK }}
    >
      {value}
    </Text>
    <Text className="mt-1 text-xs text-muted-foreground">{label}</Text>
  </View>
);

// A tapering conversion funnel (Squarespace-style): each stage is a bar whose width
// is its share of the FIRST stage, so it visibly narrows down the funnel. Between
// stages we surface the step-to-step conversion % (viewed/applied, shortlisted/
// viewed) — the drop-off is the whole point of a funnel, and it lives in the gaps.
// Honest: these are the recruiter's OWN counts + triage, never a candidate score.
const FUNNEL_STAGES = [
  { key: "total", label: "Applied", tone: "ink" as const },
  { key: "viewed", label: "You viewed", tone: "muted" as const },
  { key: "shortlisted", label: "Shortlisted", tone: "green" as const },
];

const toneColor = (tone: "ink" | "green" | "muted") =>
  tone === "green" ? GREEN : tone === "muted" ? MUTED : INK;

// Whole-number % of a of b (0 when b is 0). e.g. pctOf(5, 7) → 71.
const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

// A funnel bar that grows from 0 → its target width on mount, staggered by index so
// the stages cascade top-to-bottom (reinforces the drop-off narrative). Reanimated
// (already in the app) drives it on the UI thread — no new deps.
const FUNNEL_STAGGER = 120; // ms between each bar starting
const AnimatedFunnelBar = ({
  widthPct,
  color,
  index,
}: {
  widthPct: number; // 0..1 target width fraction
  color: string;
  index: number;
}) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      index * FUNNEL_STAGGER,
      withTiming(widthPct, { duration: 650 }),
    );
  }, [progress, widthPct, index]);

  const style = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View className="h-3 overflow-hidden rounded-full bg-secondary">
      <Animated.View
        className="h-full rounded-full"
        style={[style, { backgroundColor: color }]}
      />
    </View>
  );
};

const Funnel = ({
  total,
  viewed,
  shortlisted,
}: {
  total: number;
  viewed: number;
  shortlisted: number;
}) => {
  const values: Record<string, number> = { total, viewed, shortlisted };
  const base = Math.max(1, total); // first stage = full width

  return (
    <View>
      {FUNNEL_STAGES.map((stage, i) => {
        const count = values[stage.key];
        const width = Math.max(0.06, count / base); // min sliver so 0 still shows
        // Conversion FROM the previous stage (shown in the gap above this stage).
        const prev = i > 0 ? values[FUNNEL_STAGES[i - 1].key] : null;
        const step = prev !== null ? pctOf(count, prev) : null;
        return (
          <View key={stage.key}>
            {/* Drop-off connector between the previous stage and this one. */}
            {step !== null ? (
              <View className="flex-row items-center gap-2 py-1.5 pl-1">
                <View
                  style={{ width: 1, height: 14, backgroundColor: "#d6d4d1" }}
                />
                <Text className="text-[11px] text-muted-foreground">
                  {step}% went on to {stage.label.toLowerCase()}
                </Text>
              </View>
            ) : null}

            <View className="gap-1.5">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-sm text-foreground">{stage.label}</Text>
                <Text className="font-display text-2xl text-foreground">
                  {count}
                </Text>
              </View>
              <AnimatedFunnelBar
                widthPct={width}
                color={toneColor(stage.tone)}
                index={i}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

// A one-line, plain-English read on the funnel (TikTok-retention style). Honest and
// specific; no judgement of candidates, just the recruiter's own throughput.
const funnelTakeaway = (
  total: number,
  viewed: number,
  shortlisted: number,
): string => {
  if (total === 0) return "No applicants yet.";
  const viewedPct = pctOf(viewed, total);
  if (viewed === 0)
    return `${total} applicant${total === 1 ? "" : "s"} waiting — you haven’t opened any yet.`;
  const shortPct = pctOf(shortlisted, viewed);
  return `You’ve viewed ${viewedPct}% of applicants and shortlisted ${shortPct}% of those.`;
};

// A short date label (e.g. "24 Jun") for the trend x-axis, from a YYYY-MM-DD key.
// 14-day applications trend as an interactive Coinbase-style line graph. Drag
// across it to scrub: the header value + date update to the day under your finger,
// snapping back to the latest day on release. A line (over discrete bars) is the
// right read for a draggable cursor — the point is the interaction, not per-bar
// precision. Still first-party performance for the recruiter's OWN listing; never
// a candidate score.
const GRAPH_FILL = "rgba(31, 93, 67, 0.15)"; // #1f5d43 at 15% for the area fill

const TrendChart = ({ daily }: { daily: ListingAnalytics["daily"] }) => {
  const points = useMemo<GraphPoint[]>(
    () =>
      daily.map((d) => ({
        date: new Date(`${d.date}T00:00:00`),
        value: d.count,
      })),
    [daily],
  );

  const hasAny = daily.some((d) => d.count > 0);

  // Selected point drives the header; null means "show the latest day".
  const [selected, setSelected] = useState<GraphPoint | null>(null);

  // onPointSelected already runs on the JS thread (the library calls it via
  // runOnJS internally), so setState directly here is safe — no worklet, no
  // manual runOnJS. onGestureEnd resets to the latest day.
  const onPointSelected = useCallback((p: GraphPoint) => setSelected(p), []);
  const onGestureEnd = useCallback(() => setSelected(null), []);

  if (!hasAny) {
    return (
      <View className="rounded-2xl border border-border bg-card p-5">
        <Text className="py-4 text-center text-xs text-muted-foreground">
          No applications in the last 14 days yet.
        </Text>
      </View>
    );
  }

  const shown = selected ?? points[points.length - 1];

  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      {/* Header: the scrubbed day's count + date (or the latest when idle). */}
      <View className="mb-3">
        <Text className="font-display text-4xl" style={{ color: GREEN }}>
          {shown.value}
        </Text>
        <Text className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {shown.date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
          {selected ? "" : " · latest"}
        </Text>
      </View>

      {/* Fixed height is required: the animated graph measures via onLayout and
          renders nothing until height >= 1. */}
      <LineGraph
        style={{ width: "100%", height: 160 }}
        points={points}
        animated
        color={GREEN}
        gradientFillColors={[GRAPH_FILL, "rgba(31, 93, 67, 0)"]}
        lineThickness={3}
        enablePanGesture
        panGestureDelay={0}
        onPointSelected={onPointSelected}
        onGestureEnd={onGestureEnd}
      />
    </View>
  );
};

const ListingAnalyticsScreen = () => {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["listing-analytics", jobId],
    queryFn: () => fetchListingAnalytics(jobId),
    enabled: Boolean(jobId),
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={INK} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 bg-background px-5 pt-4">
        <ErrorState
          title="Couldn’t load insights"
          body="We couldn’t reach this listing’s analytics. Try again."
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: insets.bottom + 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ContentColumn maxWidth={640} style={{ gap: 24 }}>
      <View>
        <Text className="font-display text-3xl text-foreground">
          Listing insights
        </Text>
        <Text className="mt-1 text-base text-muted-foreground" numberOfLines={1}>
          {data.position}
        </Text>
      </View>

      {/* Headline stats */}
      <View className="flex-row gap-3">
        <Stat label="Applicants" value={data.total} />
        <Stat label="Viewed" value={data.viewed} />
        <Stat label="Shortlisted" value={data.shortlisted} tone="green" />
      </View>

      {/* Funnel */}
      <View className="gap-3">
        <Text className="text-xs font-sans-semibold uppercase tracking-wide text-muted-foreground">
          Funnel
        </Text>
        <View className="rounded-2xl border border-border bg-card p-4">
          <Funnel
            total={data.total}
            viewed={data.viewed}
            shortlisted={data.shortlisted}
          />
          <Text className="mt-4 text-xs leading-5 text-muted-foreground">
            {funnelTakeaway(data.total, data.viewed, data.shortlisted)}
          </Text>
        </View>
      </View>

      {/* 14-day trend */}
      <View className="gap-2.5">
        <Text className="text-xs font-sans-semibold uppercase tracking-wide text-muted-foreground">
          Applications · last 14 days
        </Text>
        <TrendChart daily={data.daily} />
      </View>

      <Text className="text-xs leading-5 text-muted-foreground">
        First-party performance for your own listing. Counts reflect applicants
        and your own triage, not any judgement of candidates.
      </Text>
      </ContentColumn>
    </ScrollView>
  );
};

export default ListingAnalyticsScreen;
