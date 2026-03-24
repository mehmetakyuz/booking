import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Booking UI</h1>
      <p>
        Open an offer at <code>/offers/[offerId]</code>.
      </p>
      <p>
        Example: <Link href="/offers/117011">/offers/117011</Link>
      </p>
    </main>
  )
}
