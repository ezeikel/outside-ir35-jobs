'use client';

import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import cn from '@/utils/cn';

// The shape Mapbox returns for a chosen place. Mapbox has no Google-style
// "placeId"; its stable `id` serves that role.
export type MapboxPlace = {
  id: string;
  placeName: string; // e.g. "London, Greater London, England"
  coordinates: { lat: number; lng: number };
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

type Props = {
  /** Current text value (the chosen place name, or free text). */
  value: string;
  /**
   * Fired on every text change AND on a geocoder result/clear, always with the
   * plain place-name string. This is what the board filter + hero search store.
   */
  onChange: (value: string) => void;
  /**
   * Fired only when a user picks a suggestion (rich data: id + coordinates).
   * Optional — the search/board surfaces only need the string; the post-a-job
   * form uses this to persist placeId + coordinates.
   */
  onSelect?: (place: MapboxPlace) => void;
  /** Fired when the geocoder is cleared. */
  onClear?: () => void;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Extra classes for the fallback <Input> (token missing). */
  inputClassName?: string;
  onBlur?: () => void;
};

type MapboxFeature = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

/**
 * Reusable, form-library-agnostic Mapbox location autocomplete. UK-only,
 * city-level (place/locality/district). Self-contained (no window.google global
 * to race on, which crashed the old Google Places version). If the public token
 * is missing it renders a plain text input so every surface still works and
 * never crashes.
 *
 * The owner controls state: pass `value` + `onChange`; add `onSelect` when you
 * also need the picked feature's id/coordinates (post-a-job). Both the search
 * pill and the board filter use string-only mode.
 */
const MapboxLocationInput = ({
  value,
  onChange,
  onSelect,
  onClear,
  placeholder = 'Location (or remote)',
  id,
  className,
  inputClassName,
  onBlur,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  // Keep the latest callbacks in a ref so the geocoder effect can run once
  // (mounting is expensive) yet always call the current handlers.
  const cbRef = useRef({ onChange, onSelect, onClear });
  cbRef.current = { onChange, onSelect, onClear };

  useEffect(() => {
    const container = containerRef.current;
    if (!MAPBOX_TOKEN || !container) return undefined;

    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      types: 'place,locality,district',
      countries: 'gb',
      autocomplete: true,
      placeholder,
    });
    geocoderRef.current = geocoder;
    geocoder.addTo(container);

    // Seed the box with any existing value (e.g. a location coming from the URL).
    if (value) geocoder.setInput(value);

    geocoder.on('result', (e: { result: MapboxFeature }) => {
      const { id: placeId, place_name, center } = e.result;
      cbRef.current.onChange(place_name);
      cbRef.current.onSelect?.({
        id: placeId,
        placeName: place_name,
        coordinates: { lat: center[1], lng: center[0] },
      });
    });

    // Free-typed text (not a picked suggestion) still updates the string value,
    // so the board's contains-filter works even without selecting a suggestion.
    const inputEl = container.querySelector(
      'input.mapboxgl-ctrl-geocoder--input',
    ) as HTMLInputElement | null;
    const handleInput = (ev: Event) => {
      cbRef.current.onChange((ev.target as HTMLInputElement).value);
    };
    const handleBlur = () => onBlur?.();
    inputEl?.addEventListener('input', handleInput);
    inputEl?.addEventListener('blur', handleBlur);

    geocoder.on('clear', () => {
      cbRef.current.onChange('');
      cbRef.current.onClear?.();
    });

    // Match the geocoder box to the surrounding input styling (full width, flat).
    const box = container.querySelector(
      '.mapboxgl-ctrl-geocoder',
    ) as HTMLElement | null;
    if (box) {
      box.style.width = '100%';
      box.style.maxWidth = 'none';
      box.style.boxShadow = 'none';
    }

    return () => {
      inputEl?.removeEventListener('input', handleInput);
      inputEl?.removeEventListener('blur', handleBlur);
      geocoderRef.current?.onRemove();
      geocoderRef.current = null;
    };
    // Mount once. `value`/`placeholder`/`onBlur` seeding is intentionally
    // read at mount; live values flow through cbRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <Input
        id={id}
        className={cn(inputClassName, className)}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      id={id}
      className={cn('oir35-geocoder', className)}
    />
  );
};

export default MapboxLocationInput;
