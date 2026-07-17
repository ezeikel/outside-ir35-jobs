import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { OnboardingInput } from '@/lib/api-account';

// The final onboarding slide: pick contractor (JOB_SEEKER) or hiring (JOB_POSTER)
// — hiring also picks direct vs recruiter — then Continue. This is SIGN-IN FREE:
// the choice is saved locally and the user continues into the app anonymously;
// they can sign in later (from Profile → /signin) to sync + apply the role to an
// account. "Browse first" skips the role pick straight into the board.
const RolePickerSlide = ({
  isActive,
  onPickRole,
  onSkip,
}: {
  isActive: boolean;
  onPickRole: (input: OnboardingInput) => void;
  onSkip: () => void;
}) => {
  const [role, setRole] = useState<'JOB_SEEKER' | 'JOB_POSTER' | null>(null);
  const [posterType, setPosterType] = useState<'DIRECT' | 'RECRUITER' | null>(
    null,
  );

  const ready =
    role === 'JOB_SEEKER' || (role === 'JOB_POSTER' && !!posterType);

  const onContinue = () => {
    if (role === 'JOB_SEEKER') onPickRole({ role });
    else if (role === 'JOB_POSTER' && posterType) {
      onPickRole({ role, posterType });
    }
  };

  return (
    <View
      className="flex-1 justify-center px-8"
      pointerEvents={isActive ? 'auto' : 'none'}
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
          selected={role === 'JOB_SEEKER'}
          onPress={() => {
            setRole('JOB_SEEKER');
            setPosterType(null);
          }}
        />
        <Option
          title="I’m hiring"
          subtitle="Post roles and reach verified limited-company contractors."
          selected={role === 'JOB_POSTER'}
          onPress={() => setRole('JOB_POSTER')}
        />
      </View>

      {role === 'JOB_POSTER' ? (
        <View className="mt-5">
          <Text className="text-sm font-sans-semibold text-foreground">
            Hiring directly or recruiting?
          </Text>
          <View className="mt-3 gap-3">
            <Option
              title="Hiring directly (end client)"
              selected={posterType === 'DIRECT'}
              onPress={() => setPosterType('DIRECT')}
            />
            <Option
              title="Recruiter / agency"
              selected={posterType === 'RECRUITER'}
              onPress={() => setPosterType('RECRUITER')}
            />
          </View>
        </View>
      ) : null}

      {/* Continue — enabled once a role is chosen. Saves the choice locally and
          drops the user into the app (contractors see the paywall first). No
          sign-in here; that lives on the dedicated /signin screen. */}
      <View className="mt-8">
        <Pressable
          className={`rounded-lg bg-primary p-4 ${ready ? 'active:opacity-90' : 'opacity-40'}`}
          disabled={!ready}
          onPress={onContinue}
        >
          <Text className="text-center font-sans-semibold text-primary-foreground">
            Continue
          </Text>
        </Pressable>
      </View>

      {/* Browse-first escape — explore the board without picking a role. */}
      <Pressable className="mt-5 p-2 active:opacity-70" onPress={onSkip}>
        <Text className="text-center text-sm text-muted-foreground">
          Browse first
        </Text>
      </Pressable>
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
      selected ? 'border-primary bg-secondary' : 'border-border bg-card'
    }`}
  >
    <Text className="font-sans-semibold text-foreground">{title}</Text>
    {subtitle ? (
      <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>
    ) : null}
  </Pressable>
);

export default RolePickerSlide;
