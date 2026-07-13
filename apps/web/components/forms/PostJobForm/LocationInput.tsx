'use client';

import MapboxLocationInput from '@/components/MapboxLocationInput/MapboxLocationInput';
import type { PostJobFormApi } from '@/components/PostJob/usePostJobForm';
import { Label } from '@/components/ui/label';

/**
 * Location field for the post-a-job form. Wraps the shared MapboxLocationInput
 * primitive and persists the rich shape the listing needs:
 * location.{ address, placeId, coordinates }. When the user picks a suggestion
 * we store the id + coordinates; free text still updates the address so the form
 * is never blocked. TanStack Form (the `form` instance is threaded from the
 * PostJob container — TanStack has no useFormContext).
 */
const LocationInput = ({ form }: { form: PostJobFormApi }) => (
  <form.Field name="location">
    {(field) => (
      <div className="grid gap-2">
        <Label htmlFor="job-location">Location</Label>
        <MapboxLocationInput
          id="job-location"
          placeholder="Enter the job location"
          value={field.state.value?.address ?? ''}
          onChange={(address) =>
            field.handleChange({ ...field.state.value, address })
          }
          onSelect={(place) =>
            field.handleChange({
              address: place.placeName,
              placeId: place.id,
              coordinates: place.coordinates,
            })
          }
          onClear={() =>
            field.handleChange({
              address: '',
              placeId: '',
              coordinates: { lat: null, lng: null },
            })
          }
          onBlur={field.handleBlur}
        />
      </div>
    )}
  </form.Field>
);

export default LocationInput;
