import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Metadata image routes need the approved source available in Vercel's
  // traced functions as well as during local static generation.
  outputFileTracingIncludes: {
    '/icon': ['./src/branding/spade.png'],
    '/apple-icon': ['./src/branding/spade.png'],
    '/brand-mark': ['./src/branding/spade.png'],
  },
}

export default nextConfig
