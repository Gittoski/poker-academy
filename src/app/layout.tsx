import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import './interface.css'

export const metadata: Metadata = {
  title: 'Poker Practice',
  description: 'Open-source preflop range viewer for No-Limit Hold’em.',
}

export const viewport: Viewport = {
  themeColor: '#090B10',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="classic" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
