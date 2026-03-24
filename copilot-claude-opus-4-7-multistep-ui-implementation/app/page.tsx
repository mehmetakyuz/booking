import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 40, fontFamily: "'Source Sans Pro', system-ui, sans-serif" }}>
      <h1>Secret Escapes — Booking</h1>
      <p>Open an offer to start the flow:</p>
      <p><Link href="/offers/117011">/offers/117011 — Iceland winter magic</Link></p>
    </main>
  );
}
