import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure fast responses
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
