import { describe, expect, it } from "vitest";
import { parseDayRate } from "@/lib/day-rate";

describe("parseDayRate", () => {
  it("returns a single-element tuple for a lone rate", () => {
    expect(parseDayRate("550", "")).toEqual([550]);
  });

  it("returns a [min, max] range when both are given", () => {
    expect(parseDayRate("500", "650")).toEqual([500, 650]);
  });

  it("allows max === min (a range collapsed to a point)", () => {
    expect(parseDayRate("600", "600")).toEqual([600, 600]);
  });

  it("rejects an empty min (max alone is not a rate)", () => {
    expect(parseDayRate("", "650")).toBeNull();
  });

  it("rejects a zero rate (the old [0] data-quality bug)", () => {
    expect(parseDayRate("0", "")).toBeNull();
  });

  it("rejects a negative rate", () => {
    expect(parseDayRate("-100", "")).toBeNull();
  });

  it("rejects a range where max < min", () => {
    expect(parseDayRate("700", "500")).toBeNull();
  });

  it("rejects a zero max in a range", () => {
    expect(parseDayRate("500", "0")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseDayRate("abc", "")).toBeNull();
  });

  it("treats whitespace-only max as no max (single rate)", () => {
    expect(parseDayRate("550", "   ")).toEqual([550]);
  });

  it("parses digit-only strings (the field strips non-digits upstream)", () => {
    // The DayRateField onChangeText strips non-digits, so parseInt sees clean
    // input; this guards the contract even if that ever changes.
    expect(parseDayRate("1200", "1500")).toEqual([1200, 1500]);
  });
});
