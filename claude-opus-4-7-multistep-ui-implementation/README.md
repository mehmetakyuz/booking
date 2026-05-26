# Secret Escapes — Multi-step Booking (Opus 4.7 implementation)

A production-style Next.js App Router booking journey for Secret Escapes offers,
built from the repository specs (`spec.md`, `spec-multistep.md`, `spec-api.md`,
`spec-design.md`) against the live GraphQL API.

## Stack

- Node.js 22 (see `.nvmrc`)
- Next.js 15 (App Router) · React 19 · TypeScript 5.8
- Native `fetch` GraphQL client (no Apollo)
- `lucide-react` for line iconography, `react-markdown` for T&C rendering

## Setup

```bash
nvm use            # Node 22
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000/offers/117011
```

`GRAPHQL_URL` points at `https://co.uk.sales.secretescapes.com/api/graphql/`.
Browser traffic is proxied through `/api/graphql` to avoid CORS; the unique
`x-tb-sessionid` is generated per session, reused across every call, and
persisted in encoded URL state so refresh continues the same backend session.

## Routes

- `/offers/[offerId]` — the booking flow (defaults: try `/offers/117011`)

## Architecture

- `lib/graphql/` — transport + query documents
- `lib/booking/` — payload types, variable mappers (calendar lists vs receipt
  singulars), product-replacement helpers, response normalizers, async
  orchestration (boot, repricing, flight/car task-group polling, checkout),
  URL-state snapshot, and the React context/reducer state engine
- `components/` — shell + top rail, unified right-column summary with itinerary
  timeline, and the six step panels (Dates, Rooms, Activities, Flights, Cars,
  Confirm & pay)

## Build

```bash
npm run build
```
