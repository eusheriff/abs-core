import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: { unoptimized: true },
  reactCompiler: false,
};

export default nextConfig;
