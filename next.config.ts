import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure server responses (including API) are gzip-compressed
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
