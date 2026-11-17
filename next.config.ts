import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Metadata image routes need the approved source available in Vercel's
  // traced functions as well as during local static generation.
  outputFileTracingIncludes: {
    // The offline manifest enumerates these at runtime inside the hosted function.
    '/offline-assets.json': [
      './.next/static/**/*',
      './.next/BUILD_ID',
      './public/**/*.json',
    ],
    '/icon': ['./src/branding/spade.png'],
    '/apple-icon': ['./src/branding/spade.png'],
    '/brand-mark': ['./src/branding/spade.png'],
  },
}

export default nextConfig
