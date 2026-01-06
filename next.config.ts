import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    turbopackUseSystemTlsCerts: true, // Fix TLS certificate errors on corporate/school networks
  },
};

export default nextConfig;
