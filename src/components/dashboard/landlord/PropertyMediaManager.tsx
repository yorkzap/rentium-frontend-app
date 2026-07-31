'use client';

/**
 * Full listing photo manager — primary + every gallery image, multi-select
 * delete, and origin-prefixed media URLs.
 *
 * The edit form used to show only the main photo effectively: gallery rows
 * came back as relative /media/… paths, which break on the Next origin, so
 * landlords with 30+ RAMA-dumped images saw “one photo” and no way to clean
 * up. This component is the single UI for that cleanup.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  ImageIcon,
  Loader2,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { DJANGO_API_URL } from '@/lib/config';
import {
  PropertyImage,
  PropertyMedia,
  deletePropertyMedia,
  fetchPropertyMedia,
} from '@/lib/propertyApi';

const ORIGIN = (() => {
  try {
    return new URL(DJANGO_API_URL).origin;
  } catch {
    return '';
  }
})();

export function mediaUrl(u: string | null | undefined): string {
  if (!u) return '';
  if (u.startsWith('http') || u.startsWith('blob:') || u.startsWith('data:')) {
    return u;
  }
  return ORIGIN ? `${ORIGIN}${u.startsWith('/') ? '' : '/'}${u}` : u;
}

interface Props {
  propertyId: number | string;
  token: string;
  /** Optional seed from property detail so first paint is instant. */
  primaryImage?: string | null;
  additionalImages?: PropertyImage[];
  /** Called after any successful remove so parent pages can refresh. */
  onChange?: () => void;
  compact?: boolean;
}

export default function PropertyMediaManager({
  propertyId,
  token,
  primaryImage,
  additionalImages,
  onChange,
  compact = false,
}: Props) {
  const seed = useMemo((): PropertyMedia[] => {
    const rows: PropertyMedia[] = [];
    if (primaryImage) {
      rows.push({
        handle: 'primary',
        kind: 'primary',
        url: primaryImage,
        filename: 'main',
        order: -1,
        selection_number: 1,
      });
    }
    (additionalImages ?? []).forEach((image, index) => {
      rows.push({
        handle: `gallery:${image.id}`,
        kind: 'gallery',
        id: image.id,
        url: image.image,
        filename: image.caption || `photo-${image.id}`,
        caption: image.caption ?? undefined,
        order: image.order,
        selection_number: rows.length + index + 1,
      });
    });
    return rows.map((row, index) => ({
      ...row,
      selection_number: index + 1,
    }));
  }, [primaryImage, additionalImages]);

  const [media, setMedia] = useState<PropertyMedia[]>(seed);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string>();

  const load = useCallback(async () => {
    try {
      const rows = await fetchPropertyMedia(token, propertyId);
      setMedia(rows);
    } catch {
      // Keep seed if the media endpoint is unavailable; still better than empty.
      setMedia(seed);
    } finally {
      setLoading(false);
    }
  }, [token, propertyId, seed]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (handle: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === media.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(media.map((row) => row.handle)));
    }
  };

  const removeOne = async (handle: string) => {
    if (
      !window.confirm(
        'Remove this exact photo from the listing? No other photos will change.'
      )
    ) {
      return;
    }
    setDeleting(handle);
    try {
      await deletePropertyMedia(token, propertyId, handle);
      setMedia((rows) =>
        rows
          .filter((row) => row.handle !== handle)
          .map((row, index) => ({ ...row, selection_number: index + 1 }))
      );
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(handle);
        return next;
      });
      toast.success('Photo removed.');
      onChange?.();
    } catch {
      toast.error("Couldn't remove that photo.");
    } finally {
      setDeleting(undefined);
    }
  };

  const removeSelected = async () => {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Remove ${selected.size} selected photo(s) from this listing? This only deletes the ones you ticked.`
      )
    ) {
      return;
    }
    setBusy(true);
    const handles = Array.from(selected);
    let failed = 0;
    for (const handle of handles) {
      try {
        await deletePropertyMedia(token, propertyId, handle);
      } catch {
        failed += 1;
      }
    }
    await load();
    setSelected(new Set());
    setBusy(false);
    if (failed === 0) {
      toast.success(
        handles.length === 1
          ? 'Photo removed.'
          : `Removed ${handles.length} photos.`
      );
    } else {
      toast.error(
        `Removed ${handles.length - failed}; ${failed} could not be removed.`
      );
    }
    onChange?.();
  };

  if (loading && media.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-[hsl(var(--ink-4))]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading photos…
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed p-6 text-center text-sm text-[hsl(var(--ink-4))]"
        style={{ borderColor: 'hsl(var(--line-strong))' }}
      >
        <ImageIcon className="mx-auto mb-2 h-6 w-6 text-[hsl(var(--ink-5))]" />
        No photos on this listing yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[hsl(var(--ink-3))]">
          <span className="font-medium text-[hsl(var(--ink-1))]">
            {media.length} photo{media.length === 1 ? '' : 's'}
          </span>
          {selected.size > 0 ? ` · ${selected.size} selected` : ''}
          {' — tick junk (mortgage, wrong house) and remove.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-[hsl(var(--surface-sunken))]"
            style={{ borderColor: 'hsl(var(--line))' }}
          >
            {selected.size === media.length ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {selected.size === media.length ? 'Clear' : 'Select all'}
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || busy}
            onClick={() => void removeSelected()}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--danger-ink))] hover:bg-[hsl(var(--danger-soft))] disabled:opacity-40"
            style={{ borderColor: 'hsl(var(--danger-soft))' }}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Remove selected
          </button>
        </div>
      </div>

      <div
        className={
          compact
            ? 'grid grid-cols-3 gap-2 sm:grid-cols-4'
            : 'grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4'
        }
      >
        {media.map((row) => {
          const isSelected = selected.has(row.handle);
          const isBusy = deleting === row.handle || (busy && isSelected);
          return (
            <div
              key={row.handle}
              className={`group relative aspect-square overflow-hidden rounded-lg bg-[hsl(var(--surface-sunken))] ring-2 ${
                isSelected ? 'ring-[hsl(var(--brand))]' : 'ring-transparent'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(row.url)}
                alt={row.caption || row.filename}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
                <button
                  type="button"
                  onClick={() => toggle(row.handle)}
                  aria-label={
                    isSelected
                      ? `Deselect photo ${row.selection_number}`
                      : `Select photo ${row.selection_number}`
                  }
                  className={`rounded bg-black/60 p-1 text-white ${
                    isSelected ? 'bg-[hsl(var(--brand))]' : ''
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void removeOne(row.handle)}
                  disabled={isBusy}
                  aria-label={`Remove photo ${row.selection_number}`}
                  className="rounded bg-black/60 p-1 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-[10px] font-medium text-white">
                #{row.selection_number}{' '}
                {row.kind === 'primary' ? '· Main' : '· Gallery'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
