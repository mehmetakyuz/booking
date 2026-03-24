import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conversational Booking UI',
  description: 'Spec-driven conversational booking experience implementation.',
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
