import type { Metadata } from 'next';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  weight: ['300', '400', '500', '600', '700', '800']
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  weight: ['300', '400', '600', '700', '800']
});

export const metadata: Metadata = {
  title: 'Secret Escapes - Multi-step Booking Flow',
  description: 'Editorial, premium travel booking engine for Secret Escapes packages.'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${sourceSerif.variable}`}>
        {children}
      </body>
    </html>
  );
}
