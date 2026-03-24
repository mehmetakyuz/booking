import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="landing">
      <div className="landing-card">
        <img src="/logo-light.svg" alt="Secret Escapes" className="landing-logo" />
        <h1>Booking engine</h1>
        <p>Open a real offer route to start the multi-step booking journey.</p>
        <Link className="button button-primary" href="/offers/117011">
          Open offer 117011
        </Link>
      </div>
    </main>
  )
}
