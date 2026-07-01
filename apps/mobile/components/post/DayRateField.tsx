import { Text, TextInput, View } from "react-native";

// Day-rate input for the post-a-job form. A contract's rate is either a single
// figure (£550/day) or a range (£500–£600/day) — the web PostJobForm supports
// both, and the DB column is Int[] = [rate] or [min, max]. Rather than the web's
// "single OR range" dual layout (fiddly on mobile), we use ONE min box and an
// optional max box: fill just min for a single rate, add max for a range.
//
// The parent owns the numeric state (so it can validate + assemble the payload);
// this is a controlled presentational field. Values are strings here (raw text
// input) and parsed by the parent.

const RateBox = ({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) => (
  <View className="flex-1 gap-1">
    <Text className="text-[11px] font-sans-medium text-muted-foreground">
      {label}
    </Text>
    <View className="flex-row items-center rounded-lg border border-border bg-card px-3">
      <Text className="text-base text-muted-foreground">£</Text>
      <TextInput
        className="ml-1 flex-1 py-3 text-base text-foreground"
        placeholder={placeholder}
        placeholderTextColor="#a3a09e"
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        maxLength={5}
      />
    </View>
  </View>
);

const DayRateField = ({
  min,
  max,
  onChangeMin,
  onChangeMax,
  error,
}: {
  min: string;
  max: string;
  onChangeMin: (t: string) => void;
  onChangeMax: (t: string) => void;
  // Shown when the rate is missing/invalid on a submit attempt.
  error?: string | null;
}) => (
  <View className="gap-1.5">
    <Text className="text-xs font-sans-medium text-muted-foreground">
      Day rate (£)
    </Text>
    <View className="flex-row items-end gap-3">
      <RateBox
        label="Rate (or min)"
        value={min}
        onChangeText={onChangeMin}
        placeholder="550"
      />
      <View className="pb-3">
        <Text className="text-muted-foreground">to</Text>
      </View>
      <RateBox
        label="Max (optional)"
        value={max}
        onChangeText={onChangeMax}
        placeholder="650"
      />
    </View>
    {error ? (
      <Text className="text-xs text-red-600">{error}</Text>
    ) : (
      <Text className="text-[11px] text-muted-foreground">
        A single figure, or a min and max range.
      </Text>
    )}
  </View>
);

export default DayRateField;
