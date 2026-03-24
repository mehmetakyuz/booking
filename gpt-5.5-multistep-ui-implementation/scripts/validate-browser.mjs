const base = process.env.BOOKING_APP_URL ?? 'http://127.0.0.1:3000'
const url = `${base.replace(/\/$/, '')}/offers/117011`

const res = await fetch(url)
const html = await res.text()

if (!res.ok) {
  throw new Error(`Expected 2xx from ${url}, got ${res.status}`)
}

for (const expected of ['Secret Escapes', 'Loading booking', 'Booking']) {
  if (!html.includes(expected)) {
    throw new Error(`Rendered HTML did not contain "${expected}"`)
  }
}

console.log(`Validated initial render at ${url}`)
