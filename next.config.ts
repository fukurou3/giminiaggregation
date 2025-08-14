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
      {
        protocol: 'https',
        hostname: 'giminiaggregation.firebasestorage.app',
        port: '',
        pathname: '/public/**',
      },
    ],
    // パフォーマンス最適化
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  // キャッシュヘッダー設定
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;