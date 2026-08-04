import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output only inside Docker, so Vercel builds are unaffected.
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
};

export default nextConfig;
