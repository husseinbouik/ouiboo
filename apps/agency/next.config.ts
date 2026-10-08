import type { NextConfig } from "next";

const mediaRemotePatterns = (() => {
  const value = process.env.NEXT_PUBLIC_MEDIA_URL;
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_MEDIA_URL is required in production to allow Next.js image optimization of API media URLs.'
      );
    }
    return [];
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return [];
    const protocol = url.protocol.slice(0, -1) as 'http' | 'https';
    const basePath = url.pathname.replace(/\/$/, '');
    // Allow both /media/** and /api/v1/media/** — the API serves uploads
    // at /api/v1/media while the public CDN-style URL is /media.
    const pathnames = new Set([`${basePath}/**`, '/api/v1/media/**', '/media/**']);
    return [...pathnames].map((pathname) => ({
      protocol,
      hostname: url.hostname,
      port: url.port,
      pathname,
    }));
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns', 'recharts'],
  },
  transpilePackages: ["@ouiboo/ui", "@ouiboo/utils"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
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
};

export default nextConfig;
