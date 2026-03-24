# GPT-5.4 Multistep UI Implementation

Real Next.js App Router + TypeScript implementation of the multi-step booking flow from:

- `spec.md`
- `spec-api.md`
- `spec-design.md`
- `spec-multistep.md`

## Run

1. Create `gpt-5.4-multistep-ui-implementation/.env.local`
2. Add:

```bash
GRAPHQL_URL=https://co.uk.sales.secretescapes.com/api/graphql/
```

3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

5. Open:

```text
/offers/117011
```

## Notes

- Runtime API requests go through the real GraphQL endpoint, with a Next.js proxy at `/api/graphql`.
- Offer ID comes from the route: `/offers/[offerId]`.
- Flights use the sequential `FLIGHT_SEARCH` → `FLIGHT_PRICE_VALIDATION` polling flow.
- Cars use `CAR_SEARCH`, and car extras are fetched separately with `CAR_EXTRAS` after a car is selected.
