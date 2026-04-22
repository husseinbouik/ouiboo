import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ouiboo/ui"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  staticPageGenerationTimeout: 300,
};

export default nextConfig;
