"use client";

// Leaflet + OpenStreetMap — no API key, no external service account.
// This component is prop-driven and knows nothing about publicApi, so it can
// be wired to the city page (pins) and the listing page (approximate circle)
// without dragging data-layer types into the map layer.
//
// Never import this directly from a server component: Leaflet touches
// `window` at module scope. Import `components/public/ListingsMapLazy`
// instead, which does the ssr:false dynamic import.

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export type MapPin = {
  id: string | number;
  title: string;
  href: string;
  /** e.g. "$1,450/mo" — shown in the pin popup */
  priceLabel?: string;
  coords: { lat: number; lng: number };
};

export type ListingsMapProps = {
  /** Pin mode: one marker per listing (city pages). Null coords are skipped upstream. */
  pins?: MapPin[];
  /**
   * Area mode: a ~400 m "approximate location" circle instead of a pin
   * (listing pages) — consistent with not publishing exact addresses.
   */
  area?: { coords: { lat: number; lng: number }; radiusMeters?: number };
  className?: string;
};

// A branded divIcon sidesteps Leaflet's default marker-image bundling issue
// entirely — no PNG assets to configure, and the pin matches the product.
const pinIcon = L.divIcon({
  className: "",
  iconSize: [30, 38],
  iconAnchor: [15, 36],
  popupAnchor: [0, -32],
  html: `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 1C7.8 1 2 6.8 2 14c0 9.6 13 23 13 23s13-13.4 13-23C28 6.8 22.2 1 15 1z"
      fill="#0f766e" stroke="#ffffff" stroke-width="2"/>
    <circle cx="15" cy="14" r="4.5" fill="#ffffff"/>
  </svg>`,
});

function fitBounds(pins: MapPin[]): L.LatLngBoundsExpression {
  return L.latLngBounds(pins.map((p) => [p.coords.lat, p.coords.lng]));
}

export default function ListingsMap({ pins, area, className }: ListingsMapProps) {
  const hasPins = !!pins && pins.length > 0;

  if (!hasPins && !area) return null;

  const center = area
    ? ([area.coords.lat, area.coords.lng] as [number, number])
    : ([pins![0].coords.lat, pins![0].coords.lng] as [number, number]);

  return (
    <MapContainer
      className={className ?? "h-full min-h-[320px] w-full rounded-xl"}
      center={center}
      zoom={area ? 15 : 13}
      bounds={hasPins && pins!.length > 1 ? fitBounds(pins!) : undefined}
      boundsOptions={{ padding: [40, 40] }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {hasPins &&
        pins!.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.coords.lat, pin.coords.lng]}
            icon={pinIcon}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <Link
                  href={pin.href}
                  style={{ fontWeight: 600, color: "#0f766e", textDecoration: "none" }}
                >
                  {pin.title}
                </Link>
                {pin.priceLabel && (
                  <div style={{ marginTop: 2, fontSize: 13, color: "#3a3833" }}>
                    {pin.priceLabel}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

      {area && (
        <Circle
          center={[area.coords.lat, area.coords.lng]}
          radius={area.radiusMeters ?? 400}
          pathOptions={{
            color: "#0f766e",
            weight: 1.5,
            fillColor: "#0f766e",
            fillOpacity: 0.12,
          }}
        />
      )}
    </MapContainer>
  );
}
