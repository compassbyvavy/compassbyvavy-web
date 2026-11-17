import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev assets are served from localhost. Opening the app at 127.0.0.1
  // otherwise skips hydration, so the camp day picker never updates.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
