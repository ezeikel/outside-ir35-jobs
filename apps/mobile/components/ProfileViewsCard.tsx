import { faEye, faLock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useProfileViews } from '@/lib/api-profile-views';

// "Who viewed you" summary, shown atop the Applications tab. Free contractors see
// the COUNTS (the hook — "3 hirers viewed you this week") but not WHO; tapping
// opens the paywall. Premium sees the recent roles inline. Honest: a view = a hirer
// opened your application (Application.viewedAt), never a quality signal.

const relativeDay = (iso: string): string => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const ProfileViewsCard = () => {
  const router = useRouter();
  const { views, isLoading, enabled } = useProfileViews();

  // Not a signed-in seeker, still loading, or nothing viewed yet → render nothing
  // (no empty "0 views" card — that would read as discouraging, not a perk).
  if (!enabled || isLoading || !views || views.total === 0) return null;

  const { total, last7Days, recent, locked } = views;

  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <View className="flex-row items-center gap-2">
        <FontAwesomeIcon icon={faEye} size={15} color="#1f5d43" />
        <Text className="font-sans-semibold text-foreground">
          {last7Days > 0
            ? `${last7Days} hirer${last7Days === 1 ? '' : 's'} viewed you this week`
            : `${total} hirer${total === 1 ? '' : 's'} viewed your applications`}
        </Text>
      </View>

      {locked ? (
        <Pressable
          className="mt-3 flex-row items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5 active:opacity-80"
          onPress={() => router.push('/premium')}
          accessibilityRole="button"
          accessibilityLabel="Unlock who viewed you with Premium"
        >
          <FontAwesomeIcon icon={faLock} size={13} color="#1f5d43" />
          <Text className="flex-1 text-xs text-muted-foreground">
            See which hirers looked at your applications with Premium.
          </Text>
          <Text className="font-sans-semibold text-xs text-verified">
            Unlock →
          </Text>
        </Pressable>
      ) : (
        <View className="mt-3 gap-2">
          {recent.slice(0, 3).map((r, i) => (
            <View
              key={`${r.companyName}-${r.viewedAt}-${i}`}
              className="flex-row items-center justify-between gap-3"
            >
              <Text
                className="flex-1 text-sm text-foreground"
                numberOfLines={1}
              >
                <Text className="font-sans-medium">{r.companyName}</Text>
                {'  '}
                <Text className="text-muted-foreground">{r.jobPosition}</Text>
              </Text>
              <Text className="text-xs text-muted-foreground">
                {relativeDay(r.viewedAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default ProfileViewsCard;
