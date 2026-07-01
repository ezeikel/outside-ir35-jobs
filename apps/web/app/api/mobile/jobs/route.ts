import { db as prisma } from '@outside-ir35-jobs/db';
import { JobIR35Signal, WorkMode } from '@outside-ir35-jobs/db/types';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUnpaidJob, searchJobs } from '@/app/actions';
import { isPremium } from '@/lib/contractor/premium';
import { getMobileCaller } from '@/lib/mobile/auth';
import { toMobileJobCard } from '@/lib/mobile/job-dto';
import { EARLY_ACCESS_HOURS, type SearchParams } from '@/lib/search/filters';

// Public board for mobile. Thin wrapper over the searchJobs action (the same
// source of truth the web board uses) → mobile card DTOs. No auth REQUIRED — but
// we read the optional bearer to apply the premium "early access" gate: a signed-in
// NON-premium seeker doesn't see contracts newer than EARLY_ACCESS_HOURS. Premium
// seekers and signed-out viewers see everything (signed-out can't apply anyway, and
// gating discovery for them would only hurt acquisition). `earlyAccessHours` counts
// the current-window hours withheld, so the client can nudge ("N contracts unlock
// with Premium" is a future add).
export const runtime = 'nodejs';

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const q = url.searchParams;

  const params: SearchParams = {
    q: q.get('q') ?? undefined,
    location: q.get('location') ?? undefined,
    ir35: q.get('ir35') ?? undefined,
    mode: q.get('mode') ?? undefined,
    minRate: q.get('minRate') ?? undefined,
    posted: q.get('posted') ?? undefined,
  };

  // Only a signed-in, non-premium seeker gets the early-access delay. Signed-out
  // and premium both see everything.
  const caller = await getMobileCaller(req);
  let earlyAccessHours: number | undefined;
  if (caller) {
    const sub = await prisma.subscription.findUnique({
      where: { userId: caller.userId },
      select: { status: true, currentPeriodEnd: true },
    });
    if (!isPremium(sub)) earlyAccessHours = EARLY_ACCESS_HOURS;
  }

  const rows = await searchJobs(params, { earlyAccessHours });
  return NextResponse.json({
    jobs: rows.map(toMobileJobCard),
    // True when the delay applied — the client can show a "new contracts unlock
    // sooner with Premium" nudge. Signed-out/premium → false (they see everything).
    earlyAccessApplied: earlyAccessHours !== undefined,
    earlyAccessHours: earlyAccessHours ?? 0,
  });
};

// Create a job from mobile. Wraps the SAME createUnpaidJob primitive the web
// createJobPost action uses, so the DB write is identical across both surfaces.
// Returns the unpaid job's id; the app then completes payment via the native
// Stripe Payment Sheet (company card + VAT invoice — a business expense, so no
// App Store IAP cut applies) and the payment_intent.succeeded webhook flips
// paymentStatus → PAID + isActive=true. The poster is the bearer caller, never
// the payload.
const Body = z.object({
  companyName: z.string().trim().min(1),
  position: z.string().trim().min(1),
  description: z.string().trim().min(1),
  keywords: z.string(),
  location: z.object({
    address: z.string(),
    placeId: z.string(),
    coordinates: z.object({
      lat: z.number().nullable(),
      lng: z.number().nullable(),
    }),
  }),
  companyLogo: z.string().default(''),
  // Int[] = [rate] or [min, max]. Every element must clear a positive floor (a
  // £0 rate is a data-quality bug — the mobile form used to hardcode [0]), and a
  // range must have max >= min. This is the server-side boundary; the mobile
  // form's parseDayRate mirrors it client-side.
  dayRate: z
    .union([
      z.tuple([z.number().int().positive()]),
      z.tuple([z.number().int().positive(), z.number().int().positive()]),
    ])
    .refine((r) => r.length === 1 || r[1] >= r[0], {
      message: 'Max day rate must be greater than or equal to min',
    }),
  howToApply: z.string().trim().min(1),
  applicationEmail: z.string().trim().email(),
  workMode: z.nativeEnum(WorkMode),
  ir35Signal: z.nativeEnum(JobIR35Signal).default(JobIR35Signal.UNKNOWN),
});

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Dual-capability: any onboarded user may post (role is just a default view).
  if (!caller.onboarded) {
    return NextResponse.json(
      { error: 'Finish setting up your account to post a contract' },
      { status: 403 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid job' }, { status: 400 });
  }

  const job = await createUnpaidJob(caller.userId, parsed.data);
  // The job is PENDING + isActive=false until the RevenueCat purchase + webhook
  // confirm payment. Return its id so the app can run the StoreKit/Play purchase.
  return NextResponse.json({ jobId: job.id, paymentStatus: job.paymentStatus });
};
