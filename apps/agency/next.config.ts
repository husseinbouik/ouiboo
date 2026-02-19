import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ouiboo/ui"],
  typescript: {
    ignoreBuildErrors: true,
  },
  staticPageGenerationTimeout: 300,
};

export default nextConfig;
