import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@ouiboo/ui"],
  staticPageGenerationTimeout: 300,
};

export default nextConfig;
