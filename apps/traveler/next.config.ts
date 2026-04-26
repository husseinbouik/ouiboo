import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ouiboo/ui"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'www.svgrepo.com',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  staticPageGenerationTimeout: 300,
};

export default nextConfig;
