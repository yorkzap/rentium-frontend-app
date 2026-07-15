// next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
    ],
  },

  // The type/lint debt is paid: `npx tsc --noEmit` and `next lint` both run
  // clean, so builds enforce them again. Keep it that way.
};

export default nextConfig;
