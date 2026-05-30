# Secret Escapes Booking Engine — Multi-step UI (Claude Opus 4.8)

A production-style Next.js App Router booking journey for Secret Escapes offers,
implemented against the **live GraphQL API** per `spec.md`, `spec-multistep.md`,
`spec-api.md`, and `spec-design.md` in the repository root.

## Stack

- Node.js 22 (pinned via `.nvmrc`)
- Next.js 15 (App Router) + React 19 + TypeScript 5.8
- Native `fetch` GraphQL client (no Apollo)
- `lucide-react` for itinerary / facility iconography, `react-markdown` for terms
- Global CSS design system using the brand tokens from `spec-design.md`

## Run

```bash
nvm use            # Node 22
npm install
npm run dev        # http://localhost:3000/offers/117011
```

`npm run build` produces an optimized production build.

## Test

```bash
npm run test       # Vitest + coverage (TZ-pinned), fails under the coverage bar
npm run test:watch # interactive watch mode
```

The suite covers the pure logic/data layer at 100% (statements/functions/lines)
and the React provider + components with behavioural render-and-interact tests.
See the "Testing" section of `spec-multistep.md` for the coverage contract.

### Environment

`.env.local` (already present) sets the upstream API:

```
GRAPHQL_URL=https://co.uk.sales.secretescapes.com/api/graphql/
```

All browser GraphQL traffic is proxied through the same-origin route
`/api/graphql`, which keeps `GRAPHQL_URL` server-side and forwards the per-session
`x-tb-sessionid` header. Server components never need the proxy and call the
upstream directly.

## Routes

- `/` → redirects to `/offers/117011`
- `/offers/[offerId]` → server reads `offerId`, renders the client booking shell
- `/api/graphql` → POST proxy to the upstream GraphQL API

## Architecture

```
lib/graphql/      client.ts (fetch transport), queries.ts (all documents)
lib/booking/      types, session, format (minor-unit money), products
                  (A:/F:/C:/L:/CE: replacement helpers), variables (calendar=list
                  args, dynamicPackage=singular args), normalize, labels (enum maps,
                  ISO-8601 duration), icons, steps, dates (TZ-safe), url-state,
                  api (orchestration + task-group polling), context (reducer +
                  async thunks; payloadRef as the synchronous source of truth)
components/       BookingApp (provider+shell), TopRail, Summary, Calendar, Dropdown,
                  OptionCard, Modal, Gallery, Itinerary (vertical timeline)
components/steps/ DatesStep, RoomsStep, ActivitiesStep, FlightsStep, CarsStep,
                  CheckoutStep, StepNav
```

### Key behaviors

- **Two-stage boot**: unfiltered calendar facets → pick leading airport + package
  group → filtered calendar; steps built from offer flags.
- **Live repricing** after every material selection via `dynamicPackageReceipt`.
  Money is kept in minor units (pence) and divided by 100 only at the render
  boundary.
- **Backend-selected defaults**: cards default to the `selected` choice, falling
  back to the current payload then array order.
- **Accommodation** emits a single `A:` product (the board/meal-plan id), never a
  separate unit + board.
- **Flights/cars** use the async task-group pattern (`startTaskGroup` /
  `pollTaskGroup`) with terminal no-results recovery back to Dates.
- **URL-state restore**: a compact base64 snapshot in `?b=` is written with
  `history.replaceState` (no navigation) and rebuilt on refresh, re-fetching live
  data for the restored step.

## Validation

Verified end-to-end in a headless Chrome against the live API: boot, fixed and
flexible date flows, live receipt totals (e.g. `£1,063`, not `£106,300`), room /
board / activity / flight repricing, detail modals with galleries and facility
icons, itinerary timeline with specific names, checkout (instalment schedule,
payment methods, terms), mobile layout, and refresh restore — with zero console
errors.
