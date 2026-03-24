# GPT-5.5 Multistep UI Implementation

Clean Next.js App Router + TypeScript implementation of the multi-step booking flow from:

- `../spec.md`
- `../spec-api.md`
- `../spec-design.md`
- `../spec-multistep.md`

## Task Plan

- Build shell, dark step rail, sticky receipt, mobile drawer.
- Boot from `/offers/[offerId]`, generate one `x-tb-sessionid`, fetch offer and two-stage calendar.
- Implement Dates with custom occupancy, airport, package cards, nights chips, calendar, receipt rollback on errors.
- Implement Rooms, Activities, Flights, Cars, and Checkout with live GraphQL data and immediate receipt repricing.
- Use backend-selected defaults before array-order fallback for accommodations, activities, flights, cars, and payment methods.
- Persist only session, current step, travellers, stay selection, products, coupons, instalments, and checkout selections in URL state.
- Run build and browser/runtime validation against `/offers/117011`.

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000/offers/117011
```

Set `GRAPHQL_URL` only if the upstream endpoint changes. The default is:

```text
https://co.uk.sales.secretescapes.com/api/graphql/
```
