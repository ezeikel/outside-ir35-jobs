import { NextResponse } from 'next/server';
import { getListingAnalytics } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';

// Per-listing analytics for the recruiter's OWN job (the applicant funnel + a
// 14-day trend). Bearer-authed; OWNERSHIP-gated inside the action (returns null →
// 404 unless the caller posted this job). First-party performance data, no IR35
// surface, no candidate ranking.
//
// NOT premium-gated in v1: this is the "Recruiter Insights" feature we're
// validating — showing it to every job owner tests whether recruiters value it
// before we build the Recruiter Pro paywall (#222b bundles + gate). When that
// lands, add an isRecruiterPremium check here.
export const runtime = 'nodejs';

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { jobId } = await params;
  const analytics = await getListingAnalytics(caller.userId, jobId);
  if (!analytics) {
    // Not the caller's listing (or it doesn't exist) — never reveal which.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(analytics);
};
