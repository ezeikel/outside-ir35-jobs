import { searchJobs } from '@/app/actions';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import { JobListCard } from '@/components/trust';
import type { SearchParams } from '@/lib/search/filters';
import { jobToCard } from '@/utils/jobToCard';
import JobFilterBar from './JobFilterBar';
import SaveSearchButton from './SaveSearchButton';

// Server component. The filter bar (JobFilterBar) is a GET form — inputs/selects
// submit as URL query params, so search is shareable + needs no client fetch.
// The location field uses Mapbox autocomplete but still posts a plain string.
const JobPosts = async ({ params = {} }: { params?: SearchParams }) => {
  const rows = await searchJobs(params);
  const jobs = rows.map(jobToCard);
  const q = params.q?.trim() ?? '';
  // Only signed-in contractors can save a search for email alerts.
  const session = await auth();
  const canSave = session?.role === 'JOB_SEEKER';

  return (
    <PageWrap className="gap-y-8">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {/* Masthead */}
        <header className="mb-6">
          <h1 className="text-4xl leading-none">Outside-IR35 contracts</h1>
          <p className="mt-2 text-muted-foreground">
            {jobs.length > 0
              ? `${jobs.length} contract${jobs.length === 1 ? '' : 's'}${
                  q ? ` ranked by relevance to “${q}”` : ''
                }. Day rate, mode and IR35 signal up front.`
              : 'Day rate, work mode and the client’s IR35 signal, up front.'}
          </p>
        </header>

        {/* Filter bar — GET form with Mapbox location autocomplete */}
        <JobFilterBar params={params} />

        {/* Save this search → email alerts (signed-in contractors). */}
        <SaveSearchButton params={params} canSave={canSave} />

        {/* Results */}
        {jobs.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="font-display text-2xl">
              {q ? 'No matches' : 'No contracts yet'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {q
                ? 'Try a broader search or clear the filters.'
                : 'Check back soon. New outside-IR35 roles are added regularly.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {jobs.map((job) => (
              <JobListCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </PageWrap>
  );
};

export default JobPosts;
