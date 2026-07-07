import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import OnboardingCarousel from "@/components/Onboarding/OnboardingCarousel";
import OnboardingPaywall from "@/components/Onboarding/OnboardingPaywall";
import { useAuth } from "@/contexts/AuthContext";
import { type OnboardingInput, submitOnboarding } from "@/lib/api-account";
import { useOnboardingStore } from "@/stores/onboardingStore";

// First-launch onboarding: a value-prop carousel → "how will you use it?" role
// pick → (contractors only) the one-time paywall, then into the board. It is
// SIGN-IN FREE and fun/clean — the app is fully usable anonymously and we never
// ask the user to sign in here. The only ask is the paywall.
//
// Role handling: an anonymous user's choice is saved locally
// (onboardingStore.pendingRole) and applied to the account later, when they sign
// in from the dedicated /signin screen. An ALREADY-signed-in user (who reached
// this via the Profile "finish setting up" prompt) has their role persisted to
// the account immediately. Either exit marks onboarding complete.
const OnboardingScreen = () => {
  const router = useRouter();
  const { isAuthenticated, refreshAuth } = useAuth();
  const complete = useOnboardingStore((s) => s.complete);
  const setPendingRole = useOnboardingStore((s) => s.setPendingRole);
  const clearPendingRole = useOnboardingStore((s) => s.clearPendingRole);
  const [showPaywall, setShowPaywall] = useState(false);

  // Mark onboarding seen + go to the board.
  const enterApp = useCallback(() => {
    complete();
    router.replace("/(tabs)");
  }, [complete, router]);

  // "Browse first" — same destination; role stays unset.
  const onSkip = useCallback(() => enterApp(), [enterApp]);

  // Role chosen. Signed-in users → persist to their account now. Anonymous users
  // → remember it locally for sign-in to apply. Then contractors see the one-time
  // paywall; everyone else goes straight to the board.
  const onPickRole = useCallback(
    async (input: OnboardingInput) => {
      if (isAuthenticated) {
        await submitOnboarding(input);
        await refreshAuth();
        clearPendingRole();
      } else {
        setPendingRole(input);
      }
      if (input.role === "JOB_SEEKER") setShowPaywall(true);
      else enterApp();
    },
    [isAuthenticated, refreshAuth, setPendingRole, clearPendingRole, enterApp],
  );

  if (showPaywall) return <OnboardingPaywall onContinue={enterApp} />;

  return <OnboardingCarousel onPickRole={onPickRole} onSkip={onSkip} />;
};

export default OnboardingScreen;
