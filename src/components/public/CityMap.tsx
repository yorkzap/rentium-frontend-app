"use client";

// City-page map column: always visible beside the grid on lg+, toggleable
// on mobile so the list stays the primary experience on small screens.
import { useState } from "react";
import { Map as MapIcon, X } from "lucide-react";
import ListingsMapLazy from "./ListingsMapLazy";
import type { MapPin } from "./ListingsMap";

export default function CityMap({ pins }: { pins: MapPin[] }) {
  const [open, setOpen] = useState(false);

  if (pins.length === 0) return null;

  return (
    <>
      {/* Mobile: floating toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-lg lg:hidden"
      >
        {open ? <X className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
        {open ? "Close map" : "Map"}
      </button>
      {open && (
        <div className="fixed inset-0 z-30 bg-canvas p-4 pt-20 lg:hidden">
          <ListingsMapLazy pins={pins} className="h-full w-full rounded-xl" />
        </div>
      )}

      {/* Desktop: sticky column */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <ListingsMapLazy pins={pins} className="h-[70vh] min-h-[420px] w-full rounded-xl border border-line" />
        </div>
      </div>
    </>
  );
}
