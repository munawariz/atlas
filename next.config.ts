import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server (.next/standalone) for Docker self-hosting.
  // Gated on DOCKER_BUILD so it only kicks in inside the Docker build — Vercel builds
  // are untouched.
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
};

export default nextConfig;
