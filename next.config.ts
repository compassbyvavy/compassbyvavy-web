import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cursor port-forward hits the app as 127.0.0.1 while next dev defaults to
  // localhost — allow that loopback origin for /_next HMR in development only.
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
};

export default nextConfig;
