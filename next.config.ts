import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['canvas', 'pdfjs-dist'],
  
  // Performance optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security and small perf gain
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats
    deviceSizes: [640, 750, 828, 1080, 1200], // Mobile-first breakpoints
    imageSizes: [16, 32, 48, 64, 96], // Icon sizes
  },
  
  experimental: {
    turbopackUseSystemTlsCerts: true, // Fix TLS certificate errors on corporate/school networks
    optimizePackageImports: ['@vercel/analytics'], // Tree-shake analytics
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
