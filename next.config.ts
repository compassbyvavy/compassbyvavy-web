import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev assets are served from localhost. 127.0.0.1 otherwise skips hydration.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
