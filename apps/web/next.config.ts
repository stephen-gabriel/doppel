import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@doppel/engine",
    "@doppel/sdk",
    "@doppel/sources",
    "@doppel/widget",
    "@doppel/harness",
  ],
};

export default nextConfig;
