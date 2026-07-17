import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OnboardingInput } from '@/lib/api-account';

// Persisted onboarding state. Onboarding is a one-time, sign-in-FREE intro (value-
// prop carousel → "how will you use it?" role pick → the paywall). It never asks
// the user to sign in; the app is fully usable anonymously.
//
// Because there's no anonymous server user, the chosen role is held HERE as a
// local preference (`pendingRole`) until the user later signs in from the
// dedicated /signin screen — at which point it's applied to their account and
// cleared. Persisted to AsyncStorage so both the "seen onboarding" flag and the
// pending role survive restarts. Mirrors the chunky-crayon onboarding store.
type OnboardingState = {
  hasCompleted: boolean;
  // The role chosen during onboarding, remembered locally until sign-in applies
  // it to the account. Null once applied or if the user never picked one.
  pendingRole: OnboardingInput | null;
};

type OnboardingActions = {
  complete: () => void;
  setPendingRole: (role: OnboardingInput) => void;
  clearPendingRole: () => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      hasCompleted: false,
      pendingRole: null,
      complete: () => set({ hasCompleted: true }),
      setPendingRole: (pendingRole) => set({ pendingRole }),
      clearPendingRole: () => set({ pendingRole: null }),
      reset: () => set({ hasCompleted: false, pendingRole: null }),
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
