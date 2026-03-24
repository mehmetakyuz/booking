import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Secret Escapes — Booking',
  description: 'Complete your travel booking',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
