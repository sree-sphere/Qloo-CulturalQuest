import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.qloo.com'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;