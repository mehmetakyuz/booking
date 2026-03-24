# GPT-5 Codex Conversational UI Implementation

Spec-driven standalone implementation of the conversational booking UI from:

- [spec-conversational.md](/Users/mehmet.akyuz/Code/booking/spec-conversational.md)
- [spec-api.md](/Users/mehmet.akyuz/Code/booking/spec-api.md)
- [spec-design.md](/Users/mehmet.akyuz/Code/booking/spec-design.md)

## What is implemented

- Real Next.js App Router implementation at `/offers/[offerId]`
- Hardened booking runtime reused from the corrected multi-step implementation:
  - session-scoped `x-tb-sessionid`
  - two-stage calendar bootstrap
  - receipt-gated stay selection
  - backend-selected defaults across product panels
  - flight and car task-group polling
  - `createOrder` submission flow
- Conversational shell with:
  - append-only text/selection history
  - live current-stage panel rendered inline in the thread
  - sticky desktop receipt and mobile summary drawer
  - typed-message handling through `/api/assistant`
- Real API-backed stages for:
  - travellers and dates
  - rooms
  - activities
  - flights
  - cars
  - checkout
- URL-state restore of the underlying booking state
- `/api/graphql` proxy for browser runtime calls

## What is not finished

- Full browser walkthrough against the live API in this sandbox
- Richer typed assistant coverage for every possible chat instruction and recovery path
- Production accessibility and testing hardening

## Run

```bash
npm install
npm run dev
```

Use `.env.example` as the starting point for local environment variables.

Open a specific offer at:

```text
/offers/117011
```
