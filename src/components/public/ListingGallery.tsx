// ListingGallery — the listing page's photo grid + lightbox.
//
// Grid: one lead photo, two supporting tiles, and an honest "+N photos"
// button when there are more. Lightbox: full-screen, keyboard (← → Esc),
// touch swipe, caption + counter, neighbouring frames preloaded. No
// external gallery library — a dialog, three handlers and <img> tags keep
// it fast on a phone connection.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GalleryImage {
  url: string;
  caption?: string | null;
}

export default function ListingGallery({
  images,
  alt,
}: {
  images: GalleryImage[];
  alt: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const show = useCallback(
    (i: number) => setOpen(((i % count) + count) % count),
    [count]
  );
  const close = useCallback(() => setOpen(null), []);
  const next = useCallback(
    () => setOpen((cur) => (cur === null ? null : (cur + 1) % count)),
    [count]
  );
  const prev = useCallback(
    () => setOpen((cur) => (cur === null ? null : (cur - 1 + count) % count)),
    [count]
  );

  // Keyboard: ← → navigate, Esc closes. Scroll locked while open.
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, next, prev]);

  if (count === 0) return null;

  const extra = count - 3;

  return (
    <>
      {/* ------------------------------------------------------- grid */}
      <div
        className={cn(
          'mb-8 grid gap-2 overflow-hidden rounded-xl',
          count > 1 && 'sm:grid-cols-3'
        )}
      >
        {/* eslint-disable @next/next/no-img-element */}
        <button
          type="button"
          onClick={() => show(0)}
          className={cn(
            'group relative block w-full cursor-zoom-in',
            count > 1 && 'sm:col-span-2'
          )}
          aria-label="Open photo 1 in gallery"
        >
          <img
            src={images[0].url}
            alt={images[0].caption || alt}
            className={cn(
              'aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]',
              count > 1 && 'sm:aspect-[16/10]'
            )}
          />
        </button>
        {count > 1 && (
          <div className="hidden gap-2 sm:grid">
            {images.slice(1, 3).map((img, i) => {
              const isLastTile = i === 1 && extra > 0;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => show(i + 1)}
                  className="group relative block w-full cursor-zoom-in"
                  aria-label={`Open photo ${i + 2} in gallery`}
                >
                  <img
                    src={img.url}
                    alt={img.caption || alt}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
                  />
                  {isLastTile && (
                    <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 text-sm font-medium text-white">
                      <Images className="h-4 w-4" /> +{extra} photo
                      {extra === 1 ? '' : 's'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {/* phones get one lead photo + a view-all pill instead of a cramped grid */}
        {count > 1 && (
          <button
            type="button"
            onClick={() => show(0)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-700 sm:hidden"
          >
            <Images className="h-4 w-4" /> View all {count} photos
          </button>
        )}
        {/* eslint-enable @next/next/no-img-element */}
      </div>

      {/* --------------------------------------------------- lightbox */}
      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${open + 1} of ${count}`}
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={close}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) > 48) (dx < 0 ? next : prev)();
          }}
        >
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm tabular-nums text-white/80">
              {open + 1} / {count}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close gallery"
              className="rounded-full p-2 transition-colors hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center px-4 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {count > 1 && (
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-2 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[open].url}
              alt={images[open].caption || alt}
              className="max-h-[78vh] max-w-full rounded-lg object-contain"
            />
            {count > 1 && (
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-2 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
            {/* preload neighbours so arrowing feels instant */}
            <link
              rel="preload"
              as="image"
              href={images[(open + 1) % count].url}
            />
            <link
              rel="preload"
              as="image"
              href={images[(open - 1 + count) % count].url}
            />
          </div>

          {images[open].caption && (
            <p className="pb-5 text-center text-sm text-white/70">
              {images[open].caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
