import { faLocationDot, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { type GeoSuggestion, geocodePlaces } from '@/lib/api-mapbox';

// Location picker for the post-a-job form. Unlike the search LocationField (which
// only needs the address STRING to filter the board), a posted job stores the full
// location object — address + Mapbox id + coordinates. So this field commits a
// whole GeoSuggestion via onPick, and clears it via onClear.
//
// A job can also be remote-only / UK-wide, so location isn't required: leaving it
// blank is valid (the parent falls back to a "United Kingdom" default). Picking a
// place upgrades that to a real geocoded location the day-rates benchmark + board
// search can use.

const PostLocationField = ({
  value,
  onPick,
  onClear,
}: {
  // The committed place label ("London") or "" when unset.
  value: string;
  // A place was chosen — the parent stores the full geo (address + id + coords).
  onPick: (suggestion: GeoSuggestion) => void;
  // The field was cleared — the parent drops back to the UK-wide default.
  onClear: () => void;
}) => {
  // `query` is the live text being typed; `value` is the committed place. They
  // diverge while typing and re-sync on pick/clear.
  const [query, setQuery] = useState(value);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the visible text in sync when the parent resets the value externally.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced geocode while focused with 2+ chars. AbortController cancels the
  // superseded request so only the latest query's results land.
  useEffect(() => {
    if (!focused || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      geocodePlaces(query, controller.signal).then(setSuggestions);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, focused]);

  const pick = (s: GeoSuggestion) => {
    setQuery(s.place);
    setSuggestions([]);
    setFocused(false);
    onPick(s);
  };

  const clear = () => {
    setQuery('');
    setSuggestions([]);
    onClear();
  };

  const showDropdown = focused && suggestions.length > 0;

  return (
    <View className="gap-1">
      <Text className="text-xs font-sans-medium text-muted-foreground">
        Location (optional)
      </Text>
      <View className="flex-row items-center rounded-lg border border-border bg-card px-3">
        <FontAwesomeIcon icon={faLocationDot} size={15} color="#a3a09e" />
        <TextInput
          className="ml-2 flex-1 py-3 text-base text-foreground"
          placeholder="City or region (leave blank for UK-wide)"
          placeholderTextColor="#a3a09e"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable
            hitSlop={8}
            onPress={clear}
            accessibilityRole="button"
            accessibilityLabel="Clear location"
          >
            <FontAwesomeIcon icon={faXmark} size={15} color="#a3a09e" />
          </Pressable>
        ) : null}
      </View>

      {showDropdown ? (
        <View className="mt-1 overflow-hidden rounded-lg border border-border bg-card">
          {suggestions.map((s, i) => (
            <Pressable
              key={s.id}
              className={`px-3 py-3 active:bg-secondary ${
                i > 0 ? 'border-t border-border' : ''
              }`}
              onPress={() => pick(s)}
              accessibilityRole="button"
              accessibilityLabel={s.label}
            >
              <Text className="text-sm text-foreground" numberOfLines={1}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export default PostLocationField;
