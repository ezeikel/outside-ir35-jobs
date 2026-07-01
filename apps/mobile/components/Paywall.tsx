import {
  faBolt,
  faChartLine,
  faEye,
  faCrown,
  faStar,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { toast } from "sonner-native";
import { fetchPremium, usePremium } from "@/lib/api-premium";
import {
  getPremiumOffering,
  hasActiveEntitlement,
  purchasePackage,
  restorePurchases,
} from "@/lib/revenuecat";

const GREEN = "#1f5d43";

// Premium paywall, mirroring the web /premium page. The contractor buys via
// StoreKit/Play (RevenueCat); on success we invalidate ["premium"] so the app
// re-reads the AUTHORITATIVE backend entitlement (the RC webhook will have
// written it). Already-premium contractors see the manage/active state instead.
//
// Perk CARDS (icon + title + one-line subtitle), led by the strongest hook. Every
// perk here is ACTUALLY enforced server-side — we never list a perk we don't
// deliver (overstating would be dishonest, the same principle as the IR35 rule).
const PERKS = [
  {
    icon: faEye,
    title: "See who viewed you",
    subtitle: "Know which hirers opened your applications.",
    badge: null as string | null,
  },
  {
    icon: faStar,
    title: "Get seen first",
    subtitle: "Your profile surfaces above other applicants.",
    badge: "Featured",
  },
  {
    icon: faBolt,
    title: "Early access to new contracts",
    subtitle: "See and apply 24 hours before free users.",
    badge: "24h head-start",
  },
  {
    icon: faWandMagicSparkles,
    title: "AI pitch on every role",
    subtitle: "A tailored cover note + why you match, per contract.",
    badge: null,
  },
  {
    icon: faChartLine,
    title: "Full day-rate data",
    subtitle: "The range and sample, not just the median.",
    badge: null,
  },
];

const fmtDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const Paywall = () => {
  const queryClient = useQueryClient();
  const { isPremium, status, isLoading: premiumLoading } = usePremium();
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const [offeringLoaded, setOfferingLoaded] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let active = true;
    void getPremiumOffering()
      .then((offering) => {
        if (!active) return;
        const monthly =
          offering?.monthly ?? offering?.availablePackages?.[0] ?? null;
        setPkg(monthly);
        setPriceLabel(monthly?.product.priceString ?? null);
      })
      .finally(() => active && setOfferingLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  // The RC webhook writes the DB entitlement asynchronously after a purchase, so
  // the authoritative /api/mobile/premium can lag a few seconds. Poll it with
  // backoff until isPremium flips (or we give up) instead of a single fixed wait.
  const pollUntilPremium = async () => {
    for (const delay of [0, 1500, 2000, 3000, 4000, 5000]) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      const fresh = await queryClient.fetchQuery({
        queryKey: ["premium"],
        queryFn: fetchPremium,
      });
      if (fresh.isPremium) return true;
    }
    return false;
  };

  const buy = async () => {
    if (!pkg) {
      toast.error("Subscriptions aren’t available right now.");
      return;
    }
    setBuying(true);
    try {
      const info = await purchasePackage(pkg);
      if (!info) return; // user cancelled
      // Optimistic: RC says it's active immediately; the backend catches up via
      // the webhook, which pollUntilPremium waits for.
      if (hasActiveEntitlement(info)) {
        toast.success("You’re premium. Thanks!");
      }
      const confirmed = await pollUntilPremium();
      if (!confirmed) {
        toast.error(
          "Payment went through. Your premium will appear in a moment.",
        );
      }
    } catch {
      toast.error("Couldn’t complete the purchase.");
    } finally {
      setBuying(false);
    }
  };

  const restore = async () => {
    setBuying(true);
    try {
      const info = await restorePurchases();
      // Only claim success if an entitlement was actually restored.
      if (info && hasActiveEntitlement(info)) {
        await pollUntilPremium();
        toast.success("Subscription restored.");
      } else {
        toast.error("No previous subscription found for this account.");
      }
    } finally {
      setBuying(false);
    }
  };

  if (premiumLoading) {
    return (
      <View className="py-10">
        <ActivityIndicator color="#17181a" />
      </View>
    );
  }

  // Already premium — show the active/manage state.
  if (isPremium) {
    return (
      <View className="rounded-lg border border-verified bg-verified-muted p-5">
        <Text className="font-display text-2xl text-foreground">
          You’re premium
        </Text>
        <Text className="mt-1 text-sm text-foreground">
          {status?.cancelAtPeriodEnd
            ? `Ends on ${fmtDate(status.currentPeriodEnd)}.`
            : status?.currentPeriodEnd
              ? `Renews on ${fmtDate(status.currentPeriodEnd)}.`
              : "Your subscription is active."}
        </Text>
        {status?.provider === "REVENUECAT" ? (
          <Pressable
            className="mt-4 rounded-lg border border-border bg-card p-3 active:opacity-80"
            onPress={() =>
              Linking.openURL("https://apps.apple.com/account/subscriptions")
            }
          >
            <Text className="text-center font-sans-semibold text-foreground">
              Manage subscription
            </Text>
          </Pressable>
        ) : (
          <Text className="mt-3 text-xs text-muted-foreground">
            Manage this subscription on the web, where you started it.
          </Text>
        )}
      </View>
    );
  }

  const price = priceLabel ?? "£29";

  return (
    <View>
      {/* Hero */}
      <View className="mb-6 items-center">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-verified-muted">
          <FontAwesomeIcon icon={faCrown} size={24} color={GREEN} />
        </View>
        <Text className="text-center font-display text-3xl leading-tight text-foreground">
          Win more contracts,{"\n"}faster
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
          A business tool for limited-company contractors. Get seen first, know
          who’s looking, and reach new roles before anyone else.
        </Text>
      </View>

      {/* Perk cards */}
      <View className="gap-2.5">
        {PERKS.map((perk) => (
          <View
            key={perk.title}
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-verified-muted">
              <FontAwesomeIcon icon={perk.icon} size={16} color={GREEN} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-sans-semibold text-[15px] text-foreground">
                  {perk.title}
                </Text>
                {perk.badge ? (
                  <View className="rounded-full bg-[#ffebd2] px-2 py-0.5">
                    <Text className="text-[10px] font-sans-semibold uppercase tracking-wide text-[#8a5a00]">
                      {perk.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-0.5 text-[13px] leading-4 text-muted-foreground">
                {perk.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Price pill — the anchor right above the CTA. Honest framing only:
          ~97p/day + cancel anytime + VAT invoice; no invented proof. */}
      <View className="mt-6 flex-row items-center justify-between rounded-2xl border border-primary bg-secondary px-4 py-3.5">
        <View>
          <Text className="font-sans-semibold text-base text-foreground">
            Monthly
          </Text>
          <Text className="text-xs text-muted-foreground">
            Cancel anytime · VAT invoice
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-display text-2xl text-foreground">
            {price}
            <Text className="text-base text-muted-foreground">/mo</Text>
          </Text>
          <Text className="text-[11px] text-muted-foreground">
            about 97p a day
          </Text>
        </View>
      </View>

      {/* CTA */}
      <Pressable
        className={`mt-4 rounded-2xl p-4 ${pkg || __DEV__ ? "bg-primary active:opacity-90" : "bg-ink-300"}`}
        disabled={!pkg || buying || !offeringLoaded}
        onPress={buy}
      >
        {buying ? (
          <ActivityIndicator color="#fbfaf9" />
        ) : (
          <Text className="text-center font-sans-semibold text-base text-primary-foreground">
            {/* In DEV, RevenueCat is inert (no .dev RC app) so no package loads —
                show the real CTA label anyway so the paywall looks complete for
                screenshots. The button stays disabled (buy() guards on !pkg), so
                this only affects the visual, never a real purchase. On prod/preview
                the offering loads and this branch is never hit. */}
            {offeringLoaded && !pkg && !__DEV__
              ? "Unavailable right now"
              : `Get Premium · ${price}/mo`}
          </Text>
        )}
      </Pressable>

      <View className="mt-3 flex-row items-center justify-center gap-4">
        <Pressable
          className="p-1 active:opacity-70"
          disabled={buying}
          onPress={restore}
        >
          <Text className="text-xs text-muted-foreground">
            Restore purchases
          </Text>
        </Pressable>
        <Text className="text-muted-foreground">·</Text>
        <Text className="text-xs text-muted-foreground">
          Billed via {`App Store / Google Play`}
        </Text>
      </View>
    </View>
  );
};

export default Paywall;
