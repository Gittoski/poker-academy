import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import './interface.css'
import './navy-table.css'
import './home.css'

export const metadata: Metadata = {
  title: 'Poker Trainer by Greg',
  description: 'Six-max poker practice, guided fundamentals and saved mistake reviews.',
}

export const viewport: Viewport = {
  themeColor: '#090B10',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="classic" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
