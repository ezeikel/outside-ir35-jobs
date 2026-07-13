'use client';

import { useState } from 'react';
import MapboxLocationInput from '@/components/MapboxLocationInput/MapboxLocationInput';
import type { SearchParams } from '@/lib/search/filters';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const selectClass =
  'h-9 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground';

/**
 * Board filter bar. Stays a native GET form so a search is shareable via its URL
 * and needs no client fetch — but the location field is a Mapbox autocomplete
 * (client-only). The picked/typed place name is mirrored into a hidden
 * `location` input so it still submits as a query param, exactly like the plain
 * input it replaced. Everything else (q, selects) remains uncontrolled with
 * defaultValue, so the server component's behaviour is unchanged.
 */
const JobFilterBar = ({ params }: { params: SearchParams }) => {
  const [location, setLocation] = useState(params.location ?? '');

  return (
    <form
      method="get"
      action="/jobs"
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="q"
          defaultValue={params.q ?? ''}
          aria-label="Search for jobs"
          className="flex-1"
          placeholder="Role, skill or company"
        />
        <div className="flex-1">
          <MapboxLocationInput
            value={location}
            onChange={setLocation}
            placeholder="City or postcode"
          />
          {/* Mirror the Mapbox value so the GET form submits ?location=. */}
          <input type="hidden" name="location" value={location} />
        </div>
        <Button type="submit">Search</Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select
          name="ir35"
          defaultValue={params.ir35 ?? ''}
          aria-label="IR35 signal"
          className={selectClass}
        >
          <option value="">IR35 signal</option>
          <option value="outside">Outside IR35 · per client</option>
        </select>
        <select
          name="mode"
          defaultValue={params.mode ?? ''}
          aria-label="Work mode"
          className={selectClass}
        >
          <option value="">Work mode</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ON_SITE">On-site</option>
        </select>
        <select
          name="minRate"
          defaultValue={params.minRate ?? ''}
          aria-label="Day rate"
          className={selectClass}
        >
          <option value="">Day rate</option>
          <option value="400">£400+</option>
          <option value="500">£500+</option>
          <option value="600">£600+</option>
          <option value="700">£700+</option>
        </select>
        <select
          name="posted"
          defaultValue={params.posted ?? ''}
          aria-label="Posted"
          className={selectClass}
        >
          <option value="">Posted</option>
          <option value="24h">Past 24 hours</option>
          <option value="week">Past week</option>
          <option value="month">Past month</option>
        </select>
      </div>
    </form>
  );
};

export default JobFilterBar;
