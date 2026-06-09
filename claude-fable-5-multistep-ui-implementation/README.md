# Claude Fable 5 — Multi-step booking implementation

A Secret Escapes multi-step booking flow built from the specs in this repository
(`spec.md`, `spec-multistep.md`, `spec-api.md`, `spec-design.md`), wired to the
real GraphQL API at runtime.

## Stack

- Node.js 22 (pinned via `.nvmrc`)
- Next.js 15 (App Router), React 19, TypeScript 5.8
- Native `fetch` GraphQL client (no Apollo) via a same-origin `/api/graphql` proxy
- React context + reducer state engine, URL-encoded refresh restore
- `lucide-react` for line-based facility and itinerary icons

## Running

```bash
nvm use
cp .env.example .env.local   # GRAPHQL_URL is preset to the live API
npm install
npm run dev
```

Then open [http://localhost:3000/offers/117011](http://localhost:3000/offers/117011)
(or any valid offer ID — the offer ID is route-driven).

## Notes

- Every booking session generates a unique `x-tb-sessionid`, reused across all
  API calls and persisted through the encoded URL state (`?s=…`) so refresh
  restore continues the same backend session.
- All money values from the API are minor-unit integers; they are divided by
  100 only at the render boundary.
- Flights and cars run through the async `startTaskGroup` / `pollTaskGroup`
  flow; failed, timed-out, or empty searches are terminal for the chosen stay
  and offer a reset-to-Dates recovery.
- Validation note: demo offer `117011` has flights but no cars (`hasCars:
  false`), so the Cars step is skipped there by design. The cars flow follows
  the same task-group pattern as flights and the `carExtra` query was verified
  against the live schema.
