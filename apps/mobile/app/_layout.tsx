import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif";
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from "@expo-google-fonts/inter-tight";
import notifee, { EventType } from "@notifee/react-native";
import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { Redirect, Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import Providers from "@/providers";
import { useOnboardingStore } from "@/stores/onboardingStore";
import "@/global.css";

// release/dist must match the source maps uploaded at build time (the Sentry
// Expo plugin uploads them) so crashes symbolicate. version+build is stable per
// binary; dist = native build number.
const SENTRY_RELEASE = `${Constants.expoConfig?.version ?? "0.0.0"}+${
  Application.nativeBuildVersion ?? "0"
}`;

// DSN is a public client key (safe to ship), not a secret. EXPO_PUBLIC_SENTRY_DSN
// is inlined at build time; absent in local dev → init no-ops (enabled:false).
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // OFF in local dev (Metro HMR noise), ON for preview/production builds.
  enabled: !__DEV__ && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT ?? "development",
  release: SENTRY_RELEASE,
  dist: String(Application.nativeBuildVersion ?? "0"),
  tracesSampleRate: 1.0,
  sendDefaultPii: false,
});

// Hold the splash until fonts are ready so the UI doesn't flash system-font text.
// The NativeWind theme (global.css @theme) names these families — every one the
// app references must be loaded here or that class silently falls back to the
// system font: InterTight (body/UI weights) + Instrument Serif (display headings,
// font-display) + Geist Mono (font-mono).
void SplashScreen.preventAutoHideAsync();

// Deep-links a notification tap to its `data.url`. Handles a cold-start tap (the
// app was killed → getInitialNotification) and a foreground tap (onForegroundEvent).
// Background taps are resurfaced as the initial notification on next launch.
const NotificationRouter = () => {
  const router = useRouter();

  useEffect(() => {
    const go = (url?: unknown) => {
      if (typeof url === "string" && url.length > 0) {
        // expo-router accepts our app paths (e.g. "/(tabs)/alerts", "/job/123").
        router.push(url as never);
      }
    };

    void notifee.getInitialNotification().then((initial) => {
      go(initial?.notification.data?.url);
    });

    const unsub = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) go(detail.notification?.data?.url);
    });
    return unsub;
  }, [router]);

  return null;
};

// Root layout: app-wide providers + a Stack. Tabs live under (tabs); detail +
// modal screens push on top. Light UI only (matches web).
const RootLayout = () => {
  // Keys MUST match the family names in global.css @theme (--font-sans*,
  // --font-display, --font-mono) — that's what NativeWind's font-* classes
  // resolve to at runtime.
  const [fontsLoaded] = useFonts({
    "InterTight-Regular": InterTight_400Regular,
    "InterTight-Medium": InterTight_500Medium,
    "InterTight-SemiBold": InterTight_600SemiBold,
    "InterTight-Bold": InterTight_700Bold,
    "InstrumentSerif-Regular": InstrumentSerif_400Regular,
    "GeistMono-Regular": GeistMono_400Regular,
  });

  // First-launch onboarding gate. `hasCompleted` persists in AsyncStorage and
  // rehydrates asynchronously — wait for hydration before deciding, so a
  // returning user who's already onboarded never flashes the carousel.
  const hasCompleted = useOnboardingStore((s) => s.hasCompleted);
  const [storeHydrated, setStoreHydrated] = useState(
    useOnboardingStore.persist.hasHydrated(),
  );
  useEffect(() => {
    const unsub = useOnboardingStore.persist.onFinishHydration(() =>
      setStoreHydrated(true),
    );
    if (useOnboardingStore.persist.hasHydrated()) setStoreHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Providers>
      <StatusBar style="dark" />
      {/* First launch (hydrated + not yet completed) → the intro carousel,
          BEFORE sign-in. Browsing is public; onboarding is a one-time intro. */}
      {storeHydrated && !hasCompleted ? <Redirect href="/onboarding" /> : null}
      <NotificationRouter />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#f6f5f3" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="job/[id]"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Contracts",
            headerTintColor: "#17181a",
            headerStyle: { backgroundColor: "#f6f5f3" },
            headerShadowVisible: false,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="post-job"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Profile",
            headerTintColor: "#17181a",
            headerStyle: { backgroundColor: "#f6f5f3" },
            headerShadowVisible: false,
            animation: "slide_from_right",
          }}
        />
        {/* Day rates + Premium are destinations pushed from Find / Profile (no
            longer tabs) — each gets a back header. */}
        <Stack.Screen
          name="day-rates"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Find",
            headerTintColor: "#17181a",
            headerStyle: { backgroundColor: "#f6f5f3" },
            headerShadowVisible: false,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="premium"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Profile",
            headerTintColor: "#17181a",
            headerStyle: { backgroundColor: "#f6f5f3" },
            headerShadowVisible: false,
            animation: "slide_from_right",
          }}
        />
        {/* Per-listing analytics, pushed from the Listings tab's Insights button. */}
        <Stack.Screen
          name="listing-analytics/[jobId]"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "My roles",
            headerTintColor: "#17181a",
            headerStyle: { backgroundColor: "#f6f5f3" },
            headerShadowVisible: false,
            animation: "slide_from_right",
          }}
        />
      </Stack>
    </Providers>
  );
};

export default Sentry.wrap(RootLayout);
