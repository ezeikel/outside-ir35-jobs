import { faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { submitOnboarding } from '@/lib/api-account';
import type { OAuthSignInResponse } from '@/lib/api-auth';
import { useOnboardingStore } from '@/stores/onboardingStore';

// The dedicated, opt-in sign-in screen — the one canonical place to sign in
// (reached from Profile → "Sign in", or deep-linked). Onboarding never asks for
// this; the app is fully usable anonymously. Signing in syncs across devices and,
// if the user picked a role during onboarding (held locally as pendingRole),
// applies it to the account. Mirrors the PTP / Chunky Crayon sign-in surface:
// Google → Apple → Facebook → email magic-link, with a "check your inbox" state.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const SignInScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    signInWithGoogleHandler,
    signInWithAppleHandler,
    signInWithFacebookHandler,
    requestMagicLinkHandler,
  } = useAuth();
  const pendingRole = useOnboardingStore((s) => s.pendingRole);
  const clearPendingRole = useOnboardingStore((s) => s.clearPendingRole);

  const [email, setEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());

  // After any OAuth sign-in succeeds: apply the role the user chose in onboarding
  // (if any), then leave the screen. A cancelled/failed sign-in returns null and
  // we stay put (the handler already toasts the error).
  const afterSignIn = async (res: OAuthSignInResponse | null) => {
    if (!res) return;
    if (pendingRole && !res.user.onboarded) {
      try {
        await submitOnboarding(pendingRole);
      } catch {
        // Non-fatal: they can still pick a role later from Profile.
      }
    }
    clearPendingRole();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const sendLink = async () => {
    if (!emailValid || sendingLink) return;
    setSendingLink(true);
    const sent = await requestMagicLinkHandler(email.trim());
    setSendingLink(false);
    if (sent) setLinkSent(true);
  };

  return (
    <View
      className="flex-1 bg-background px-8"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <Text className="font-display text-3xl text-foreground">Sign in</Text>
      <Text className="mt-2 text-sm text-muted-foreground">
        Sign in to sync across devices, apply with your verified profile, save
        searches, and get alerts for new Outside IR35 contracts.
      </Text>

      {linkSent ? (
        <View className="mt-10 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <FontAwesomeIcon icon={faEnvelope} color="#17181a" size={26} />
          </View>
          <Text className="mt-4 text-center font-display text-2xl text-foreground">
            Check your inbox
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            We sent a sign-in link to {email.trim()}. Tap it on this phone to
            finish. The link expires in 15 minutes.
          </Text>
          <Pressable
            className="mt-5 p-2 active:opacity-70"
            onPress={() => setLinkSent(false)}
          >
            <Text className="text-center text-sm text-primary">
              Use a different email
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* OAuth: Google → Apple (iOS) → Facebook (when configured). */}
          <View className="mt-8 gap-3">
            <Pressable
              className="flex-row items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 active:opacity-80"
              onPress={() => void signInWithGoogleHandler().then(afterSignIn)}
            >
              <FontAwesomeIcon icon={faGoogle} color="#EA4335" size={18} />
              <Text className="font-sans-semibold text-foreground">
                Continue with Google
              </Text>
            </Pressable>

            {Platform.OS === 'ios' ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={8}
                style={{ height: 52 }}
                onPress={() => void signInWithAppleHandler().then(afterSignIn)}
              />
            ) : null}

            {process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ? (
              <Pressable
                className="flex-row items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 active:opacity-80"
                onPress={() =>
                  void signInWithFacebookHandler().then(afterSignIn)
                }
              >
                <FontAwesomeIcon icon={faFacebook} color="#1877F2" size={18} />
                <Text className="font-sans-semibold text-foreground">
                  Continue with Facebook
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Divider */}
          <View className="mt-6 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-xs text-muted-foreground">
              or continue with email
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          {/* Magic link */}
          <View className="mt-6 gap-3">
            <TextInput
              className="rounded-lg border border-border bg-card p-4 text-foreground"
              placeholder="you@email.com"
              placeholderTextColor="#9aa1ab"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!sendingLink}
            />
            <Pressable
              className={`flex-row items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 ${emailValid ? 'active:opacity-80' : 'opacity-40'}`}
              disabled={!emailValid || sendingLink}
              onPress={sendLink}
            >
              {sendingLink ? (
                <ActivityIndicator color="#17181a" />
              ) : (
                <>
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    color="#17181a"
                    size={18}
                  />
                  <Text className="font-sans-semibold text-foreground">
                    Email me a sign-in link
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};

export default SignInScreen;
