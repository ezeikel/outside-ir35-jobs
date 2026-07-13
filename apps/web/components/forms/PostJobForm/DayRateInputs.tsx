'use client';

import { useEffect, useState } from 'react';
import type { PostJobFormApi } from '@/components/PostJob/usePostJobForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Day rate is stored as a number[] on the form: [single] or [min, max]. The UI
// offers a single field OR a min/max pair; local state drives which, and the
// resolved array is pushed into the form. TanStack Form instance is threaded
// from the PostJob container.
const DayRateInputs = ({ form }: { form: PostJobFormApi }) => {
  const initial = form.state.values.dayRate ?? [];
  // The form seeds dayRate as [0] ("unset"); show that as an empty input, not
  // a literal "0" the poster would have to delete before typing.
  const [dayRateSingle, setDayRateSingle] = useState(
    initial.length === 1 && Number(initial[0]) > 0 ? String(initial[0]) : '',
  );
  const [dayRateMin, setDayRateMin] = useState(
    initial.length === 2 ? String(initial[0] ?? '') : '',
  );
  const [dayRateMax, setDayRateMax] = useState(
    initial.length === 2 ? String(initial[1] ?? '') : '',
  );

  const handleSingleChange = (value: string) => {
    setDayRateSingle(value);
    form.setFieldValue('dayRate', value ? [parseFloat(value)] : []);
  };

  const handleRangeChange = (minOrMax: 'min' | 'max', value: string) => {
    const min = minOrMax === 'min' ? parseFloat(value) : parseFloat(dayRateMin);
    const max = minOrMax === 'max' ? parseFloat(value) : parseFloat(dayRateMax);

    if (minOrMax === 'min') {
      setDayRateMin(value);
    } else {
      setDayRateMax(value);
    }

    form.setFieldValue('dayRate', min || max ? [min, max] : []);
  };

  // Resolve to a single day rate if only one of min/max is present.
  useEffect(() => {
    if (dayRateSingle) return;
    if (dayRateMin && !dayRateMax) {
      form.setFieldValue('dayRate', [parseFloat(dayRateMin)]);
    } else if (!dayRateMin && dayRateMax) {
      form.setFieldValue('dayRate', [parseFloat(dayRateMax)]);
    }
  }, [dayRateSingle, dayRateMin, dayRateMax, form]);

  useEffect(() => {
    if (!dayRateSingle && !dayRateMin && !dayRateMax) {
      form.setFieldValue('dayRate', [0]);
    }
  }, [dayRateSingle, dayRateMin, dayRateMax, form]);

  return (
    <div className="grid gap-2">
      <Label htmlFor="day-rate-single">Day Rate (£)</Label>
      <div className="flex items-center gap-x-4">
        <Input
          id="day-rate-single"
          placeholder="Enter the day rate"
          type="number"
          value={dayRateSingle}
          onChange={(e) => handleSingleChange(e.target.value)}
          onBlur={() => {
            // Clear min and max when the single input is used.
            setDayRateMin('');
            setDayRateMax('');
          }}
        />
        <span>or</span>
        <div className="flex items-center gap-x-2">
          <Input
            className="w-20"
            placeholder="Min"
            type="number"
            value={dayRateMin}
            onChange={(e) => handleRangeChange('min', e.target.value)}
            onBlur={() => setDayRateSingle('')}
          />
          <span>-</span>
          <Input
            className="w-20"
            placeholder="Max"
            type="number"
            value={dayRateMax}
            onChange={(e) => handleRangeChange('max', e.target.value)}
            onBlur={() => setDayRateSingle('')}
          />
        </div>
      </div>
    </div>
  );
};

export default DayRateInputs;
