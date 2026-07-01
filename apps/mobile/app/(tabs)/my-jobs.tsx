import {
  faBriefcase,
  faChartSimple,
  faHeart,
  faRectangleList,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CandidateDeck from "@/components/CandidateDeck";
import ErrorState from "@/components/ErrorState";
import { TAB_BAR_HEIGHT } from "@/components/GlassTabBar";
import JobCard from "@/components/JobCard";
import ProfileViewsCard from "@/components/ProfileViewsCard";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useViewMode } from "@/hooks/useViewMode";
import { fetchApplications } from "@/lib/api-applications";
import { fetchMyPosts, type PostSummary } from "@/lib/api-posts";

// "My jobs" (seeker) / "My roles" (hiring). Mode-aware. Seekers get Saved +
// Applications sub-tabs; hirers get their listings. The data surfaces (saved
// jobs, applications, my posts) are filled in by follow-on work — for now this is
// the shell with the right structure + empty states.

const SegTab = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    className="flex-1 items-center border-b-2 pb-3 pt-2 active:opacity-70"
    style={{ borderBottomColor: active ? "#17181a" : "transparent" }}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
  >
    <Text
      className={`text-base ${active ? "font-sans-semibold text-foreground" : "text-muted-foreground"}`}
    >
      {label}
    </Text>
  </Pressable>
);

const EmptyState = ({
  icon,
  title,
  body,
}: {
  icon: typeof faHeart;
  title: string;
  body: string;
}) => (
  <View className="flex-1 items-center justify-center px-10">
    <FontAwesomeIcon icon={icon} size={44} color="#a3a09e" />
    <Text className="mt-5 font-display text-2xl text-foreground">{title}</Text>
    <Text className="mt-2 text-center text-sm text-muted-foreground">
      {body}
    </Text>
  </View>
);

const SignedOut = ({ insetTop }: { insetTop: number }) => {
  const router = useRouter();
  return (
    <View
      className="flex-1 items-center justify-center bg-background px-10"
      style={{ paddingTop: insetTop }}
    >
      <FontAwesomeIcon icon={faHeart} size={44} color="#a3a09e" />
      <Text className="mt-5 font-display text-2xl text-foreground">
        Save jobs for later
      </Text>
      <Text className="mt-2 text-center text-sm text-muted-foreground">
        Sign in to save contracts and track the ones you’ve applied to.
      </Text>
      <Pressable
        className="mt-6 rounded-lg bg-primary px-6 py-3 active:opacity-90"
        onPress={() => router.push("/(tabs)/profile")}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
      >
        <Text className="font-sans-semibold text-primary-foreground">
          Sign in
        </Text>
      </Pressable>
    </View>
  );
};

const MyJobsScreen = () => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { mode } = useViewMode();
  const [tab, setTab] = useState<"saved" | "applications">("saved");

  // Signed-out HIRING gets the sign-in prompt (posting needs an account). A
  // signed-out SEEKER, though, can have locally-saved jobs (frictionless deck
  // triage) — so they fall through to the Saved tab below, which reads the local
  // store. Applications still needs auth (handled inside ApplicationsTab).
  if (!isAuthenticated && mode === "hiring") {
    return <SignedOut insetTop={insets.top} />;
  }

  // Hiring view — Applicants (swipe to shortlist/pass) + Listings.
  if (mode === "hiring") {
    return <MyPosts bottomInset={insets.bottom + TAB_BAR_HEIGHT} topInset={insets.top} />;
  }

  // Seeker view — Saved + Applications.
  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 12 }}
    >
      <Text className="px-6 pb-2 font-display text-3xl text-foreground">
        My jobs
      </Text>
      <View className="flex-row border-b border-border px-6">
        <SegTab
          label="Saved"
          active={tab === "saved"}
          onPress={() => setTab("saved")}
        />
        <SegTab
          label="Applications"
          active={tab === "applications"}
          onPress={() => setTab("applications")}
        />
      </View>

      {tab === "saved" ? (
        <SavedTab bottomInset={insets.bottom + TAB_BAR_HEIGHT} />
      ) : (
        <ApplicationsTab bottomInset={insets.bottom + TAB_BAR_HEIGHT} />
      )}
    </View>
  );
};

// Applications list — jobs the contractor has applied to, with applied date and a
// "Viewed" badge once the poster has opened the application.
const ApplicationsTab = ({ bottomInset }: { bottomInset: number }) => {
  const { isAuthenticated } = useAuth();
  const {
    data: applications = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications,
    // Applying needs an account, so the list is only fetched when signed in.
    enabled: isAuthenticated,
  });

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) void refetch();
    }, [isAuthenticated, refetch]),
  );

  // Applications require an account (you apply with your verified profile). This
  // early-return comes AFTER all hooks so hook order stays stable.
  if (!isAuthenticated) {
    return (
      <EmptyState
        icon={faRectangleList}
        title="Sign in to track applications"
        body="Applying to contracts uses your verified profile. Sign in to apply and see your applications here."
      />
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  // A failed fetch must not fall through to "No applications yet" — that would
  // read as "you haven't applied to anything" when really we just couldn't load.
  if (isError) {
    return (
      <ErrorState
        title="Couldn’t load applications"
        body="We couldn’t reach your applications. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={faRectangleList}
        title="No applications yet"
        body="Contracts you apply to will appear here so you can track them."
      />
    );
  }

  return (
    <FlashList
      data={applications}
      keyExtractor={(item) => item.id}
      // "Who viewed you" summary sits above the application list — the same context
      // as the per-application "Viewed" badges below. Self-hides when there are no
      // views yet, so it never shows a discouraging "0 views".
      ListHeaderComponent={<ProfileViewsCard />}
      renderItem={({ item }) => (
        <View>
          <JobCard
            job={item.job}
            saved={false}
            canSave={false}
            onToggleSave={() => {}}
          />
          <View className="-mt-2 mb-3 flex-row items-center gap-2 px-1">
            <Text className="text-xs text-muted-foreground">
              Applied {new Date(item.appliedAt).toLocaleDateString("en-GB")}
            </Text>
            {item.viewed ? (
              <View className="rounded-full bg-secondary px-2 py-0.5">
                <Text className="text-xs font-sans-medium text-secondary-foreground">
                  Viewed
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      )}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: bottomInset + 16,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
    />
  );
};

// Saved jobs list — shares the React Query cache with the heart on JobCard, so
// unsaving here (or anywhere) updates everywhere.
const SavedTab = ({ bottomInset }: { bottomInset: number }) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    saved,
    savedIds,
    canSave,
    toggle,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useSavedJobs();

  // Refetch whenever the tab gains focus, so entering My Jobs always reflects the
  // server (jobs saved on the board this session show up reliably). The optimistic
  // cache renders immediately; this reconciles synthetic rows + anything missed.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  // Only treat a fetch failure as an error when there's nothing in the cache to
  // show. An in-session optimistic save keeps the list populated even if a later
  // background refetch fails — we don't want to blank that out.
  if (isError && saved.length === 0) {
    return (
      <ErrorState
        title="Couldn’t load saved jobs"
        body="We couldn’t reach your saved jobs. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (saved.length === 0) {
    return (
      <EmptyState
        icon={faHeart}
        title="No saved jobs yet"
        body="Tap the heart on a contract to save it. Saved jobs show up here."
      />
    );
  }

  return (
    <FlashList
      data={saved}
      // Key on the JOB id, not the saved-row id: a just-saved row starts synthetic
      // (`optimistic-<jobId>`) and the reconcile refetch swaps it for the real row.
      // Keying on the stable job id avoids a remount/flicker on that swap.
      keyExtractor={(item) => item.job.id}
      extraData={savedIds}
      // Signed out: a soft "sync" nudge above the local saves. Not a wall — saving
      // works without an account; signing in just syncs + backs them up.
      ListHeaderComponent={
        !isAuthenticated ? (
          <Pressable
            className="mb-3 flex-row items-center justify-between rounded-lg border border-border bg-card px-4 py-3 active:opacity-80"
            onPress={() => router.push("/(tabs)/profile")}
            accessibilityRole="button"
            accessibilityLabel="Sign in to sync saved jobs"
          >
            <Text className="flex-1 text-sm text-muted-foreground">
              Saved on this device. Sign in to sync across devices.
            </Text>
            <Text className="ml-3 font-sans-semibold text-sm text-foreground">
              Sign in →
            </Text>
          </Pressable>
        ) : null
      }
      renderItem={({ item }) => (
        <JobCard
          job={item.job}
          saved={savedIds.has(item.job.id)}
          canSave={canSave}
          onToggleSave={toggle}
        />
      )}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: bottomInset + 16,
      }}
      // Deliberate refresh — reconciles optimistic rows with the server (we don't
      // auto-refetch on toggle, which caused the "reappears" bug).
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
    />
  );
};

// A status pill for a listing: LIVE (paid + active), PENDING PAYMENT (created but
// not yet paid), or CLOSED (paid but no longer active). Colour-coded so state reads
// at a glance without reading the label.
const StatusPill = ({ post }: { post: PostSummary }) => {
  const live = post.isActive && post.paymentStatus !== "PENDING";
  const pending = post.paymentStatus === "PENDING";
  const label = live ? "Live" : pending ? "Payment due" : "Closed";
  // Green = live, amber = payment due, grey = closed.
  const tone = live
    ? { bg: "#e7f2ec", fg: "#1f5d43" }
    : pending
      ? { bg: "#fdf1dc", fg: "#8a5a00" }
      : { bg: "#efedea", fg: "#78716c" };
  return (
    <View
      className="self-start rounded-full px-2.5 py-1"
      style={{ backgroundColor: tone.bg }}
    >
      <Text
        className="text-[11px] font-sans-semibold uppercase tracking-wide"
        style={{ color: tone.fg }}
      >
        {label}
      </Text>
    </View>
  );
};

// One listing row: position + company, status pill, applicant tallies, and an
// "Insights" action that opens the per-listing analytics. Tapping the row body
// opens the public job detail (the poster's own listing as seekers see it).
const PostRow = ({
  post,
  onPress,
  onInsights,
}: {
  post: PostSummary;
  onPress: () => void;
  onInsights: () => void;
}) => (
  <View className="mb-3 rounded-xl border border-border bg-card p-4">
    <Pressable
      className="active:opacity-80"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${post.position} at ${post.companyName}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text
            className="font-sans-semibold text-base text-foreground"
            numberOfLines={1}
          >
            {post.position}
          </Text>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {post.companyName}
          </Text>
        </View>
        <StatusPill post={post} />
      </View>

      <View className="mt-3 flex-row items-center gap-4">
        <Text className="text-sm text-muted-foreground">
          {post.applicantCount === 0
            ? "No applicants yet"
            : `${post.applicantCount} applicant${post.applicantCount === 1 ? "" : "s"}`}
        </Text>
        {post.newApplicantCount > 0 ? (
          <View className="rounded-full bg-primary px-2 py-0.5">
            <Text className="text-[11px] font-sans-semibold text-primary-foreground">
              {post.newApplicantCount} new
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>

    <Pressable
      className="mt-3 flex-row items-center gap-2 self-start rounded-lg border border-border px-3 py-2 active:opacity-70"
      onPress={onInsights}
      accessibilityRole="button"
      accessibilityLabel={`View insights for ${post.position}`}
    >
      <FontAwesomeIcon icon={faChartSimple} size={13} color="#17181a" />
      <Text className="text-xs font-sans-semibold text-foreground">
        Insights
      </Text>
    </Pressable>
  </View>
);

// Listings sub-tab — the caller's own posted contracts with live/pending state +
// applicant counts. Data from GET /api/mobile/posts (getMyJobsForCaller). Refetches
// on focus so a just-posted job (or a new applicant) shows up on return.
const ListingsTab = ({ bottomInset }: { bottomInset: number }) => {
  const router = useRouter();
  const {
    data: posts = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["my-posts"],
    queryFn: fetchMyPosts,
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  // A failed fetch must not fall through to the "no listings" empty state — that
  // would read as "you haven't posted anything" when we simply couldn't load.
  if (isError) {
    return (
      <ErrorState
        title="Couldn’t load your listings"
        body="We couldn’t reach your listings. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (posts.length === 0) {
    return (
      <>
        <EmptyState
          icon={faBriefcase}
          title="No listings yet"
          body="Post a contract to reach verified limited-company contractors. Your live and pending listings will appear here."
        />
        <View style={{ height: bottomInset }} />
      </>
    );
  }

  return (
    <FlashList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PostRow
          post={item}
          onPress={() => router.push(`/job/${item.id}`)}
          onInsights={() => router.push(`/listing-analytics/${item.id}`)}
        />
      )}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: bottomInset + 16,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
    />
  );
};

// Hiring view. Two sub-tabs: Applicants (the candidate swipe deck — shortlist/pass
// the people who applied to your contracts) and Listings (your posted contracts,
// with live/pending state + applicant counts).
const MyPosts = ({
  topInset,
  bottomInset,
}: {
  topInset: number;
  bottomInset: number;
}) => {
  const [tab, setTab] = useState<"applicants" | "listings">("applicants");

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: topInset + 12 }}>
      <Text className="px-6 pb-2 font-display text-3xl text-foreground">
        My roles
      </Text>
      <View className="flex-row border-b border-border px-6">
        <SegTab
          label="Applicants"
          active={tab === "applicants"}
          onPress={() => setTab("applicants")}
        />
        <SegTab
          label="Listings"
          active={tab === "listings"}
          onPress={() => setTab("listings")}
        />
      </View>

      {tab === "applicants" ? (
        <CandidateDeck bottomInset={bottomInset} />
      ) : (
        <ListingsTab bottomInset={bottomInset} />
      )}
    </View>
  );
};

export default MyJobsScreen;
