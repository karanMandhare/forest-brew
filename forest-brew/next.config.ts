import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'ten-res-den-observations.trycloudflare.com',
    '*.trycloudflare.com',
    '192.168.1.16',
    'localhost:3000'
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Exclude Prisma from Turbopack bundling to allow native binary/library loading
  serverExternalPackages: ['@prisma/client'],
  // Allow Three.js to be bundled properly
  transpilePackages: ['three'],
  // Force Next.js to use the correct project root to avoid multiple lockfile warnings
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      return []
    }
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://images.unsplash.com https://lh3.googleusercontent.com https://*.unsplash.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.razorpay.com; frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com; media-src 'self' https://assets.mixkit.co https://player.vimeo.com https://*.pexels.com;",
          }
        ],
      },
    ]
  },
}

export default nextConfig
