import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBell,
  faHeart,
  faMagnifyingGlass,
  faRectangleList,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useViewMode } from "@/hooks/useViewMode";
import type { ViewMode } from "@/stores/viewModeStore";

// Floating translucent (glass) tab bar — content shows softly through a blur,
// matching the chunky-crayon / Titrra pattern (Apple-News look). Five evenly-
// spaced destinations; active = brand ink, inactive = muted. Replaces the
// default opaque bottom bar. The bar is absolutely positioned and the screens
// reserve bottom padding (TAB_BAR_HEIGHT) so content isn't hidden behind it.

const INK = "#17181a";
const MUTED = "#a3a09e";

// The clearance a tab screen should leave at the bottom so its last content
// isn't hidden behind the floating bar (bar height + the gap above the home
// indicator). Screens add this to their scroll/content paddingBottom.
export const TAB_BAR_HEIGHT = 64;

// Minimal shape of the props expo-router's <Tabs tabBar={...}> passes. Typed
// locally to avoid a direct dep on @react-navigation/bottom-tabs (transitive
// only under pnpm's strict isolation — same approach as CC / Titrra).
type TabRoute = { key: string; name: string };
export type GlassTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
  };
};

type TabItem = { name: string; label: string; icon: IconDefinition };

// The bar is mode-aware (TotalJobs model). The middle tab is the user's own work:
// seekers save+apply ("My jobs"), hirers manage their contracts ("My roles").
// ALERTS is a seeker-only feature (saved searches + job alerts), so it's hidden in
// hiring mode — a hiring tab bar is Find · My roles · Profile. (A future recruiter-
// notifications surface — new applicants, offer accepted/declined, cohort sent —
// could bring a hiring "Alerts" back once those flows exist.) day-rates + premium
// stay registered screens reachable from Find / Profile but not in the bar.
const tabsForMode = (mode: ViewMode): TabItem[] => {
  if (mode === "hiring") {
    return [
      { name: "index", label: "Find", icon: faMagnifyingGlass },
      { name: "my-jobs", label: "My roles", icon: faRectangleList },
      { name: "profile", label: "Profile", icon: faUser },
    ];
  }
  return [
    { name: "index", label: "Find", icon: faMagnifyingGlass },
    { name: "my-jobs", label: "My jobs", icon: faHeart },
    { name: "alerts", label: "Alerts", icon: faBell },
    { name: "profile", label: "Profile", icon: faUser },
  ];
};

export const GlassTabBar = ({ state, navigation }: GlassTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { mode } = useViewMode();
  const TABS = tabsForMode(mode);
  const focusedName = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]}
    >
      {/* Plain View does the width cap + centring; the BlurView just fills it.
          Putting maxWidth/alignSelf on the BlurView itself breaks its rounded
          clip on iOS (the native blur layer paints a full opaque rectangle → a
          stray white bar), so the cap lives on this wrapper, not the blur. */}
      <View style={styles.barCap}>
        <BlurView intensity={40} tint="light" style={styles.bar}>
        {/* The translucent off-white wash is its OWN absolute-fill layer, NOT a
            backgroundColor on the BlurView. Tinting the native effect view
            directly bands into a faint horizontal seam on iOS (the wash blends
            into the UIVisualEffectView composite); a separate View paints a clean
            uniform layer, clipped by the BlurView's radius+overflow. Same pattern
            as the working sibling bars (bump-circle / chunky-crayon). */}
        <View style={styles.wash} pointerEvents="none" />
        {TABS.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.name);
          const focused = focusedName === tab.name;
          const color = focused ? INK : MUTED;

          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                if (focused || !route) return;
                void Haptics.selectionAsync();
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) navigation.navigate(tab.name);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              style={styles.item}
            >
              <FontAwesomeIcon icon={tab.icon} size={20} color={color} />
              <Text
                style={[styles.label, { color }]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    // Centre the capped pill horizontally on wide screens.
    alignItems: "center",
  },
  // Plain (non-blur) wrapper that carries the width cap + centring. Keeping the
  // cap OFF the BlurView avoids the iOS bug where a maxWidth'd blur paints a
  // full opaque white rectangle. On a phone the cap exceeds the width so the
  // pill is full-bleed as before; on a tablet it stays a snug centred pill.
  barCap: {
    width: "100%",
    maxWidth: 440,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 8,
    overflow: "hidden",
    // The off-white wash lives on styles.wash (an absolute-fill child), NOT here
    // — see the JSX comment. A backgroundColor on the BlurView bands into a
    // horizontal seam on iOS.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(23, 24, 26, 0.06)",
    // Soft float shadow.
    shadowColor: "#17181a",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  // Translucent off-white wash as its OWN layer over the blur (clipped by the
  // BlurView's radius + overflow). Keeps the ink readable over busy content
  // without tinting the native effect view (which seams on iOS).
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(246, 245, 243, 0.72)",
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
  },
  label: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
});

export default GlassTabBar;
