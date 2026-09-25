import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  output: "standalone",
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
