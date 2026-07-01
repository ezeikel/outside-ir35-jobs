// Day-rate parsing for the post-a-job form. The DB column is Int[] = [rate] or
// [min, max]; this turns the form's two raw text inputs into that payload (or null
// when invalid). Kept as a pure module (no RN imports) so it's unit-testable and
// mirrors the server-side floor in POST /api/mobile/jobs.

// Rules:
//   - min alone, > 0                  → [min]        (single rate)
//   - min + max, both > 0, max >= min → [min, max]   (range)
//   - min ≤ 0, empty min, max < min   → null         (rejected)
// A max without a min is "no rate" (null) — min is the required field.
export const parseDayRate = (
  rawMin: string,
  rawMax: string,
): [number] | [number, number] | null => {
  const min = Number.parseInt(rawMin, 10);
  if (!Number.isFinite(min) || min <= 0) return null;

  const hasMax = rawMax.trim().length > 0;
  if (!hasMax) return [min];

  const max = Number.parseInt(rawMax, 10);
  if (!Number.isFinite(max) || max <= 0 || max < min) return null;
  return [min, max];
};
