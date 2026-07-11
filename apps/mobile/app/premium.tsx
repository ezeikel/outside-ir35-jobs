import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ContentColumn from "@/components/ContentColumn";
import Paywall from "@/components/Paywall";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { useViewMode } from "@/hooks/useViewMode";
import { useAnalytics } from "@/lib/analytics";

// Premium: the paywall for contractors (and the active/manage state once
// subscribed). Reached from the seeker profile. Signed-out → prompt to sign in;
// hiring view → offer to switch to the seeker view (premium is a seeker feature).
const PremiumScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const { mode } = useViewMode();
  const { trackEvent } = useAnalytics();

  // Top of the RevenueCat purchase funnel: fire once the actual paywall shows
  // (authenticated seeker), not on the sign-in / wrong-mode prompts. Purchase
  // completion is tracked server-side via the RevenueCat webhook.
  const paywallVisible = !isLoading && isAuthenticated && mode === "seeker";
  useEffect(() => {
    if (paywallVisible) {
      trackEvent(ANALYTICS_EVENTS.PREMIUM_PAYWALL_VIEWED_MOBILE, {});
    }
  }, [paywallVisible, trackEvent]);

  if (!isLoading && !isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-muted-foreground">
          Sign in to go premium: unlimited alerts and an AI explanation plus a
          tailored pitch on every matched role.
        </Text>
        <Pressable
          className="mt-6 rounded-lg bg-primary px-5 py-3 active:opacity-90"
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Text className="font-sans-semibold text-primary-foreground">
            Sign in
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!isLoading && mode !== "seeker") {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-muted-foreground">
          Premium is a feature for finding work. Switch to “Looking for work” in
          your profile to subscribe.
        </Text>
        <Pressable
          className="mt-6 rounded-lg border border-border px-5 py-3 active:opacity-70"
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Text className="font-sans-semibold text-foreground">
            Go to profile
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <ContentColumn maxWidth={520}>
        <Text className="mb-4 text-xs font-sans-semibold uppercase tracking-wide text-muted-foreground">
          Premium
        </Text>
        <Paywall />
      </ContentColumn>
    </ScrollView>
  );
};

export default PremiumScreen;
