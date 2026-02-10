import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['canvas', 'pdfjs-dist'],
  experimental: {
    turbopackUseSystemTlsCerts: true, // Fix TLS certificate errors on corporate/school networks
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas'];
    }
    return config;
  },
  // Fix 404 errors on page refresh - treat as SPA fallback
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path*',
          destination: '/',
        },
      ],
    };
  },
};

export default nextConfig;
