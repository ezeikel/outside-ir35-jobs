import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

// Deep-link target for the email sign-in link: the /api/mobile/auth/magic-link
// route emails outsideir35://auth/magic-link?token=... and tapping it opens this
// screen. We redeem the token once, then send the user into the app (or show a
// retry if the link was invalid/expired). Sign-in itself is handled in
// AuthContext; this screen is just the redemption + routing shell.
const MagicLinkScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { verifyMagicLinkHandler } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
  // Guard against double-redemption if the screen re-renders/re-opens.
  const redeemed = useRef(false);

  useEffect(() => {
    if (redeemed.current) return;
    if (!token) {
      setStatus('error');
      return;
    }
    redeemed.current = true;
    void verifyMagicLinkHandler(token).then((res) => {
      if (res) {
        // Signed in. Onboarding already ran on first launch, so go to the board;
        // the profile "finish setting up" prompt handles role selection if needed.
        router.replace('/(tabs)');
      } else {
        setStatus('error');
      }
    });
  }, [token, verifyMagicLinkHandler, router]);

  return (
    <View
      className="flex-1 items-center justify-center bg-background px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {status === 'verifying' ? (
        <>
          <ActivityIndicator size="large" color="#17181a" />
          <Text className="mt-4 text-center text-base text-muted-foreground">
            Signing you in…
          </Text>
        </>
      ) : (
        <>
          <Text className="text-center font-display text-2xl text-foreground">
            Link expired
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            This sign-in link is invalid or has already been used. Request a new
            one from the sign-in screen.
          </Text>
          <Pressable
            className="mt-6 rounded-lg bg-primary p-4 active:opacity-90"
            onPress={() => router.replace('/onboarding')}
          >
            <Text className="text-center font-sans-semibold text-primary-foreground">
              Back to sign in
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
};

export default MagicLinkScreen;
