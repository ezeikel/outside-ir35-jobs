import { NextResponse } from 'next/server';
import { getMyJobsForCaller } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';

// The caller's own listings for the mobile Listings tab: their posted jobs with
// live/pending state + applicant counts. Bearer-auth (getMobileCaller);
// ownership-scoped inside the action (only jobs this user posted). Read-only.
export const runtime = 'nodejs';

export const GET = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!caller.onboarded) {
    return NextResponse.json(
      { error: 'Finish setting up your account first' },
      { status: 403 },
    );
  }

  const jobs = await getMyJobsForCaller(caller.userId);
  // Serialise Date → ISO for JSON transport (the client parses it back).
  return NextResponse.json({
    posts: jobs.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() })),
  });
};
