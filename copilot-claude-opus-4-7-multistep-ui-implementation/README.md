# Secret Escapes Multistep Booking — Claude Opus 4.7

Implementation of [`spec-multistep.md`](../spec-multistep.md) using Next.js 14 App Router
+ TypeScript, written entirely by Claude Opus 4.7 without copying from any other
implementation folder in this repository.

## What's in here

- `app/` — App Router entry, the offer route `/offers/[offerId]`, `/api/graphql`
  proxy that injects the `x-tb-sessionid` header, and global design-system CSS.
- `components/` — `BookingProvider` (reducer + all async side-effects),
  `TopRail`, `BookingShell`, `Summary` with live receipt, itinerary preview and
  full-itinerary modal, plus one step component per funnel stage.
- `components/steps/` — `StepDates`, `StepRooms`, `StepActivities`,
  `StepFlights`, `StepCars`, `StepCheckout`.
- `lib/` — typed GraphQL client, queries, API helpers (receipt, task-group
  polling for flights/cars, accommodation, leisure, checkout, createOrder),
  payload shaping helpers and URL-state (base64-json) persistence.

## Run locally

```bash
npm install
npm run dev
# then open http://localhost:3000/offers/117011
```

The default upstream is the live Secret Escapes sales GraphQL endpoint. You can
override it with `GRAPHQL_URL` in `.env.local`.

## Validated flow (offer 117011)

Live end-to-end checked via the `/api/graphql` proxy:

1. `offer(id:117011)` — Northern Lights package with flights.
2. `offer.calendar(...)` — dates, airports, package groups, nights options.
3. `dynamicPackageReceipt` — returns total + itinerary events.
4. `dynamicPackage.accomodations` — multiple hotels, rooms, boards.
5. `dynamicPackage.leisures` — included + optional activities.
6. `startTaskGroup(FLIGHT_SEARCH)` → `pollTaskGroup` → `dynamicPackage.flights`
   — fully polling-aware.
7. `dynamicPackage.customerSalesflowDisplayFields` + `countries` — customer form
   fields, payment methods, instalments.

## Deploy to Vercel

```bash
# from repo root
vercel --cwd copilot-claude-opus-4-7-multistep-ui-implementation
```

No build-time environment variables are required; `GRAPHQL_URL` defaults to the
live endpoint. Set `GRAPHQL_URL` as a Vercel env var only if you want to target
a different backend.
