import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/**": ["db/**/*"],
  },
};

export default nextConfig;
