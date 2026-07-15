'use client';

// The importable face of the map: dynamic + ssr:false because Leaflet needs
// `window`. Server pages (city, listing, showcase) import this one.
import dynamic from 'next/dynamic';
import type { ListingsMapProps } from './ListingsMap';

const ListingsMap = dynamic(() => import('./ListingsMap'), {
  ssr: false,
  loading: () => (
    <div
      className="h-full min-h-[320px] w-full animate-pulse rounded-xl bg-surface-sunken"
      aria-label="Loading map"
    />
  ),
});

export default function ListingsMapLazy(props: ListingsMapProps) {
  return <ListingsMap {...props} />;
}
