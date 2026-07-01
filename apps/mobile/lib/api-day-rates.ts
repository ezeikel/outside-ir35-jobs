import { api } from "@/lib/api";

// Day-rate benchmarks (public). The server gates these on a minimum sample size,
// so every row is honest. The headline MEDIAN is free; the full spread
// (p25/p75/min/max/sampleSize) is a PREMIUM perk and comes back null when
// `locked` is true (non-premium / signed-out viewer).

export type DayRateRow = {
  skill: string;
  skillLabel: string;
  ir35Bucket: "OUTSIDE" | "INSIDE" | "UNKNOWN";
  ir35Label: string;
  tone: "verified" | "muted";
  median: number;
  // null for non-premium viewers (the server withholds the spread).
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
  sampleSize: number | null;
};

export type DayRates = {
  rows: DayRateRow[];
  totalSample: number;
  minSample: number;
  // True when the full spread is withheld (free/not-premium). Drives the upsell.
  locked: boolean;
};

export const fetchDayRates = async (): Promise<DayRates> => {
  const { data } = await api.get<DayRates>("/api/mobile/day-rates");
  return data;
};
