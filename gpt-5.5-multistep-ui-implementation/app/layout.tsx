import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Secret Escapes Booking',
  description: 'Multi-step Secret Escapes booking flow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
