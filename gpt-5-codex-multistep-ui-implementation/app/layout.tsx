import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Multi-step Booking UI',
  description: 'Spec-driven multi-step booking experience.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
