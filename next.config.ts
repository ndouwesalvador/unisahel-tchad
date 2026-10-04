import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactStrictMode: true,
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
    '/api/documents/generate': ['./src/lib/pdf/fonts/NotoNaskhArabic.ttf'],
  },
};

export default nextConfig;
