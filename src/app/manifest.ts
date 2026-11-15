import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Poker Practice Academy',
    short_name: 'Poker Practice',
    description: 'Six-max cash fundamentals, saved reviews and practice.',
    start_url: '/learn',
    display: 'standalone',
    background_color: '#090b10',
    theme_color: '#090b10',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
