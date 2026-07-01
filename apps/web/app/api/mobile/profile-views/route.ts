import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { getProfileViewsForCaller } from '@/app/actions';
import { isPremium } from '@/lib/contractor/premium';
import { getMobileCaller } from '@/lib/mobile/auth';

// "Who viewed you" — the counts of hirers who've opened this contractor's
// applications (Application.viewedAt). Bearer-authed; scoped to the caller's own
// applications. Free vs premium shaping:
//   - EVERYONE (free): the counts (total + last 7 days) — the hook that makes you
//     want to see more ("3 hirers viewed you this week").
//   - PREMIUM only: the `recent` list (which roles/companies + when). Free callers
//     get recent=[] + locked=true, so the client shows the count + an upsell.
// This mirrors LinkedIn: free sees "N viewed you", premium sees who.
export const runtime = 'nodejs';

export const GET = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!caller.onboarded) {
    return NextResponse.json({
      total: 0,
      last7Days: 0,
      recent: [],
      locked: true,
    });
  }

  const [views, sub] = await Promise.all([
    getProfileViewsForCaller(caller.userId),
    prisma.subscription.findUnique({
      where: { userId: caller.userId },
      select: { status: true, currentPeriodEnd: true },
    }),
  ]);

  const unlocked = isPremium(sub);

  return NextResponse.json({
    total: views.total,
    last7Days: views.last7Days,
    // The "who" is premium-only. Free callers still get the counts (the hook).
    recent: unlocked
      ? views.recent.map((r) => ({
          jobPosition: r.jobPosition,
          companyName: r.companyName,
          viewedAt: r.viewedAt.toISOString(),
        }))
      : [],
    locked: !unlocked,
  });
};
