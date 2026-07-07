import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import {
  faApple,
  faFacebook,
  faGoogle,
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { OnboardingInput } from "@/lib/api-account";

// The final onboarding slide: pick contractor (JOB_SEEKER) or hiring (JOB_POSTER)
// — hiring also picks direct vs recruiter — then sign in (Google/Apple/Facebook or
// an emailed magic link) to attach the choice to an account. "Browse first" skips
// sign-in straight into the board. Mirrors the web /onboarding role picker, with
// sign-in moved here (onboarding is shown before sign-in on first launch).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const RolePickerSlide = ({
  isActive,
  submitting,
  alreadySignedIn,
  onPickRole,
  onRequestMagicLink,
  onSkip,
}: {
  isActive: boolean;
  submitting: boolean;
  alreadySignedIn: boolean;
  onPickRole: (input: OnboardingInput, provider: "google" | "apple" | "facebook") => void;
  // Email the user a sign-in link. Returns whether it was sent (for the "check
  // your inbox" state). The role is applied later, on the Profile prompt, since
  // the magic-link round-trip can't carry it synchronously like OAuth does.
  onRequestMagicLink: (email: string) => Promise<boolean>;
  onSkip: () => void;
}) => {
  const [role, setRole] = useState<"JOB_SEEKER" | "JOB_POSTER" | null>(null);
  const [posterType, setPosterType] = useState<"DIRECT" | "RECRUITER" | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const ready =
    role === "JOB_SEEKER" || (role === "JOB_POSTER" && !!posterType);

  // The validated selection, or null if incomplete.
  const selection = (): OnboardingInput | null => {
    if (role === "JOB_SEEKER") return { role };
    if (role === "JOB_POSTER" && posterType) return { role, posterType };
    return null;
  };

  const signIn = (provider: "google" | "apple" | "facebook") => {
    const input = selection();
    if (input) onPickRole(input, provider);
  };

  const emailValid = EMAIL_RE.test(email.trim());

  const sendLink = async () => {
    if (!emailValid || sendingLink) return;
    setSendingLink(true);
    const sent = await onRequestMagicLink(email.trim());
    setSendingLink(false);
    if (sent) setLinkSent(true);
  };

  return (
    <View
      className="flex-1 justify-center px-8"
      pointerEvents={isActive ? "auto" : "none"}
    >
      <Text className="text-center font-display text-3xl text-foreground">
        How will you use it?
      </Text>
      <Text className="mt-2 text-center text-sm text-muted-foreground">
        One quick question so we can set you up. You can change this later.
      </Text>

      <View className="mt-8 gap-3">
        <Option
          title="I’m a contractor"
          subtitle="Build a verified profile and find Outside IR35 contracts."
          selected={role === "JOB_SEEKER"}
          onPress={() => {
            setRole("JOB_SEEKER");
            setPosterType(null);
          }}
        />
        <Option
          title="I’m hiring"
          subtitle="Post roles and reach verified limited-company contractors."
          selected={role === "JOB_POSTER"}
          onPress={() => setRole("JOB_POSTER")}
        />
      </View>

      {role === "JOB_POSTER" ? (
        <View className="mt-5">
          <Text className="text-sm font-sans-semibold text-foreground">
            Hiring directly or recruiting?
          </Text>
          <View className="mt-3 gap-3">
            <Option
              title="Hiring directly (end client)"
              selected={posterType === "DIRECT"}
              onPress={() => setPosterType("DIRECT")}
            />
            <Option
              title="Recruiter / agency"
              selected={posterType === "RECRUITER"}
              onPress={() => setPosterType("RECRUITER")}
            />
          </View>
        </View>
      ) : null}

      {/* Finish setup — enabled once a role is chosen. Already-signed-in users
          (came from the Profile "finish setting up" prompt) get a single
          "Get started"; first-launch users sign in with Google/Apple. */}
      <View className="mt-8 gap-3">
        {submitting ? (
          <View className="rounded-lg bg-primary p-4">
            <ActivityIndicator color="#fbfaf9" />
          </View>
        ) : alreadySignedIn ? (
          <Pressable
            className={`rounded-lg bg-primary p-4 ${ready ? "active:opacity-90" : "opacity-40"}`}
            disabled={!ready}
            onPress={() => signIn("google")}
          >
            <Text className="text-center font-sans-semibold text-primary-foreground">
              Get started
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              className={`flex-row items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 ${ready ? "active:opacity-80" : "opacity-40"}`}
              disabled={!ready}
              onPress={() => signIn("google")}
            >
              <FontAwesomeIcon icon={faGoogle} color="#17181a" size={18} />
              <Text className="font-sans-semibold text-foreground">
                Continue with Google
              </Text>
            </Pressable>

            {Platform.OS === "ios" ? (
              <Pressable
                className={`flex-row items-center justify-center gap-2 rounded-lg bg-primary p-4 ${ready ? "active:opacity-90" : "opacity-40"}`}
                disabled={!ready}
                onPress={() => signIn("apple")}
              >
                <FontAwesomeIcon icon={faApple} color="#fbfaf9" size={18} />
                <Text className="font-sans-semibold text-primary-foreground">
                  Sign in with Apple
                </Text>
              </Pressable>
            ) : null}

            {/* Facebook only when the FB app is configured (EXPO_PUBLIC env). */}
            {process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ? (
              <Pressable
                className={`flex-row items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 ${ready ? "active:opacity-80" : "opacity-40"}`}
                disabled={!ready}
                onPress={() => signIn("facebook")}
              >
                <FontAwesomeIcon icon={faFacebook} color="#1877f2" size={18} />
                <Text className="font-sans-semibold text-foreground">
                  Continue with Facebook
                </Text>
              </Pressable>
            ) : null}

            {/* Magic link — email a one-tap sign-in link. Once sent we swap to a
                "check your inbox" note; the emailed link reopens the app and
                signs the user in (role is applied later, on the Profile prompt). */}
            <View className="mt-2 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-xs text-muted-foreground">or</Text>
              <View className="h-px flex-1 bg-border" />
            </View>

            {linkSent ? (
              <View className="rounded-lg border border-border bg-secondary p-4">
                <Text className="text-center font-sans-semibold text-foreground">
                  Check your inbox
                </Text>
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                  We sent a sign-in link to {email.trim()}. Tap it on this phone to
                  finish.
                </Text>
                <Pressable
                  className="mt-3 p-1 active:opacity-70"
                  onPress={() => setLinkSent(false)}
                >
                  <Text className="text-center text-sm text-primary">
                    Use a different email
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
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
                  editable={ready && !sendingLink}
                />
                <Pressable
                  className={`flex-row items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 ${ready && emailValid ? "active:opacity-80" : "opacity-40"}`}
                  disabled={!ready || !emailValid || sendingLink}
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
              </>
            )}
          </>
        )}
      </View>

      {/* Browse-first escape — explore the board without signing in. Hidden for
          an already-signed-in user (they just need to pick a role). */}
      {alreadySignedIn ? null : (
        <Pressable
          className="mt-5 p-2 active:opacity-70"
          disabled={submitting}
          onPress={onSkip}
        >
          <Text className="text-center text-sm text-muted-foreground">
            Browse first
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const Option = ({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`rounded-lg border p-4 ${
      selected ? "border-primary bg-secondary" : "border-border bg-card"
    }`}
  >
    <Text className="font-sans-semibold text-foreground">{title}</Text>
    {subtitle ? (
      <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>
    ) : null}
  </Pressable>
);

export default RolePickerSlide;
