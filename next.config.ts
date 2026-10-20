import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
