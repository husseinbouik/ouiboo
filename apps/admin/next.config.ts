import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// Opt-in bundle analysis: run `npm run analyze` (ANALYZE=true) to
// generate interactive treemap reports under .next/analyze/.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const mediaRemotePatterns = (() => {
  const value = process.env.NEXT_PUBLIC_MEDIA_URL;
  if (!value) return [];

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return [];
    return [{
      protocol: url.protocol.slice(0, -1) as 'http' | 'https',
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/$/, '')}/**`,
    }];
  } catch {
    return [];
  }
})();

// Security headers (#192) — the API origin differs per environment, so it is
// derived from this build's NEXT_PUBLIC_API_URL instead of hardcoding the
// production URL (#318: the hardcoded production origin made browsers block
// every API request on staging via connect-src).
const apiConnectSrc = (() => {
  const origins = new Set<string>();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        origins.add(url.origin);
      }
    } catch {
      // Invalid URL — fall back to 'self' only.
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:*');
    origins.add('ws://localhost:*');
  }
  return `'self'${origins.size ? ` ${[...origins].join(' ')}` : ''}`;
})();

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns', 'recharts'],
  },
  transpilePackages: ["@ouiboo/ui"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      ...mediaRemotePatterns,
...(process.env.NODE_ENV !== 'production' ? [
        { protocol: 'https' as const, hostname: 'example.com' },
        { protocol: 'http' as const, hostname: 'localhost' },
        { protocol: 'http' as const, hostname: '127.0.0.1' },
      ] : []),
    ],
  },
  staticPageGenerationTimeout: 300,

  // Security headers (#192)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              `connect-src ${apiConnectSrc}`,
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
