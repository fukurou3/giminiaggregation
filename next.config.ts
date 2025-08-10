import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Exclude functions directory from build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/functions/**'],
    };
    return config;
  },
  // Exclude functions directory from TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow images from Google Cloud Storage and Firebase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/giminiaggregation-profile-images/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/giminiaggregation.firebasestorage.app/**',
      },
    ],
  },
};

export default nextConfig;