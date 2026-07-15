import type { MetadataRoute } from 'next';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'rentium.ca';
const BASE_URL = ROOT_DOMAIN.includes('localhost')
  ? `http://${ROOT_DOMAIN}`
  : `https://${ROOT_DOMAIN}`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private app surfaces — nothing here should be indexed.
        disallow: ['/dashboard', '/auth'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
