// AddressInput.tsx

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, MapPin, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DJANGO_API_URL } from '@/lib/config';
import { cn } from '@/lib/utils';

/**
 * ONE address field. City, province, postal code, neighbourhood and coordinates
 * all come back with the pick — none of them are typed, and none of them are
 * shown as editable inputs.
 *
 * That last part is the whole design. The old form asked for city and province
 * as free text, which quietly produced:
 *
 *   - three different "Victoria"s ("Victoria", "victoria ", "Victoria BC"),
 *     splitting the one city URL we're trying to rank across three;
 *   - a property that was PERMANENTLY UNPUBLISHABLE the moment someone typed
 *     "Britsh Columbia", because the province normalised to '' and the property
 *     silently fell out of every public query — with no error, anywhere, ever.
 *     The landlord's experience was "I listed it and it never appeared."
 *
 * A field you don't ask for is a field nobody can typo. So we ask for one thing
 * and derive the rest, and we SHOW the landlord what we derived so they can see
 * it's right before they save.
 */

export interface ResolvedAddress {
  address: string;
  city: string;
  province: string; // "British Columbia"
  province_code: string; // "bc" — what the model stores
  postal_code: string;
  neighbourhood: string;
  latitude: number;
  longitude: number;
  label: string;
}

interface Props {
  value: ResolvedAddress | null;
  onChange: (a: ResolvedAddress | null) => void;
  error?: string;
}

export default function AddressInput({ value, onChange, error }: Props) {
  const { token } = useAuth();
  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<ResolvedAddress[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serviceDown, setServiceDown] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!token || q.trim().length < 3) {
        setResults([]);
        return;
      }
      setBusy(true);
      setServiceDown(false);
      try {
        const res = await fetch(
          `${DJANGO_API_URL}/showcase/address-search/?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (res.status === 503) {
          setServiceDown(true);
          setResults([]);
          return;
        }
        if (!res.ok) throw new Error();
        const body = await res.json();
        setResults(body.results ?? []);
        setHighlight(0);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  // Debounced, because this proxies a metered API and a landlord typing
  // "3213 Wascana Street" would otherwise fire twenty requests to find one
  // address.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (value && query === value.label) return; // already picked; don't re-search
    debounce.current = setTimeout(() => search(query), 280);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, search, value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (a: ResolvedAddress) => {
    onChange(a);
    setQuery(a.label);
    setResults([]);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Address</label>

      <div ref={boxRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--ink-5))]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange(null); // typing invalidates the pick
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Start typing — e.g. 3213 wasca"
          autoComplete="off"
          className={cn(
            'field pl-9 pr-9',
            error && 'border-[hsl(var(--danger))]'
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--ink-5))]" />
          ) : value ? (
            <Check className="h-4 w-4 text-[hsl(var(--ok))]" />
          ) : null}
        </span>

        {open && (results.length > 0 || serviceDown) && (
          <ul
            className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border bg-white shadow-lg"
            style={{ borderColor: 'hsl(var(--line))' }}
          >
            {serviceDown ? (
              <li className="px-3 py-3 text-sm text-[hsl(var(--ink-3))]">
                Address lookup is temporarily unavailable. Try again in a
                moment.
              </li>
            ) : (
              results.map((r, i) => (
                <li key={r.label + i}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pick(r)}
                    className={cn(
                      'flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
                      i === highlight && 'bg-[hsl(var(--brand-soft))]'
                    )}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--ink-5))]" />
                    <span>
                      <span className="block font-medium">{r.address}</span>
                      <span className="block text-xs text-[hsl(var(--ink-4))]">
                        {[
                          r.neighbourhood,
                          r.city,
                          r.province.toUpperCase(),
                          r.postal_code,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-xs text-[hsl(var(--danger-ink))]">{error}</p>
      )}

      {/* Confirmation, not inputs. The landlord sees exactly what we derived —
          if the geocoder guessed the wrong neighbourhood, they find out here, at
          the moment they can fix it, rather than three weeks later when a tenant
          mentions it. */}
      {value ? (
        <div
          className="rounded-lg border bg-[hsl(var(--brand-soft))] p-3"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[hsl(var(--ink-4))]">
            We filled these in for you
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <Row label="City" value={value.city} />
            <Row label="Province" value={value.province} />
            <Row label="Postal code" value={value.postal_code || '—'} />
            <Row label="Neighbourhood" value={value.neighbourhood || '—'} />
          </dl>
          <p className="mt-2.5 text-xs text-[hsl(var(--ink-4))]">
            The neighbourhood is what strangers see on your public listing
            instead of the street address — you can change it below if
            you&apos;d rather show something else.
          </p>
        </div>
      ) : (
        <p className="text-xs text-[hsl(var(--ink-4))]">
          Pick from the list so we can find it on a map. We&apos;ll work out the
          city, province and postal code — you don&apos;t need to type them.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[hsl(var(--ink-4))]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}
