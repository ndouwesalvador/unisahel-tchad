import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/**": ["prisma/db/**/*"],
  },
};

export default nextConfig;
