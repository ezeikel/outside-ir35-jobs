import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { getDayRateBenchmarks } from '@/app/actions';
import { isPremium } from '@/lib/contractor/premium';
import { getMobileCaller } from '@/lib/mobile/auth';
import { toMobileDayRates } from '@/lib/mobile/day-rates-dto';

// Day-rate benchmarks for mobile. Wraps getDayRateBenchmarks(), which is already
// MIN_SAMPLE-gated in SQL — so the app can only ever show rates backed by enough
// listings to be honest. STAYS PUBLIC (no 401): everyone sees the headline median
// (the SEO teaser). The full spread (p25/p75/min/max/sample) is a PREMIUM perk,
// gated server-side here — a non-premium (or signed-out) viewer gets `locked:true`
// and null spread fields, so the client can't reveal it by ignoring the flag.
export const runtime = 'nodejs';

export const GET = async (req: Request) => {
  const benchmarks = await getDayRateBenchmarks();

  // Optional auth: signed-out is fine (locked). Only an onboarded, premium caller
  // unlocks the full spread.
  const caller = await getMobileCaller(req);
  let unlocked = false;
  if (caller?.onboarded) {
    const sub = await prisma.subscription.findUnique({
      where: { userId: caller.userId },
      select: { status: true, currentPeriodEnd: true },
    });
    unlocked = isPremium(sub);
  }

  return NextResponse.json(toMobileDayRates(benchmarks, !unlocked));
};
