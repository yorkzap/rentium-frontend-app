// sitemap.ts
import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/publicApi";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData();
  if (!data) return [{ url: SITE, changeFrequency: "daily", priority: 1 }];

  return [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    ...data.cities.map((c) => ({
      url: `${SITE}/${c.province_code}/${c.city_slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...data.properties.map((p) => ({
      url: `${SITE}/${p.province_code}/${p.city_slug}/${p.public_slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...data.showcases.map((s) => ({
      url: `${SITE}/l/${s.slug}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}