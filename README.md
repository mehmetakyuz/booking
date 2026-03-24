# Booking Flow

This repository is an experiment in **spec-based development**: writing precise, structured specifications first, then delegating the entire implementation to AI models — with no human writing application code.

The product is a multi-step travel booking journey for [Secret Escapes](https://www.secretescapes.com). Users move through a sequence of steps — party size, dates, rooms, activities, flights, car hire, and checkout — with a live price receipt updating after every selection.

---

## What Is Spec-Based Development?

Traditional frontend development involves a designer producing mockups, an engineer reading them, and code being written by hand. Spec-based development shifts that model: instead of mockups feeding directly into code, the product is first captured in structured written specifications that are precise enough for an AI model to implement from scratch — without further clarification.

The key idea is that **the spec is the deliverable**. A well-written spec encodes:

- **What the product does** — user flows, state transitions, edge cases
- **How it connects to the backend** — API contracts, query shapes, data transformations
- **How it looks and feels** — design tokens, component patterns, layout rules

When the spec is complete enough, handing it to an AI model becomes a repeatable, testable act. Different models can be given the same spec and produce independent implementations. The spec becomes the source of truth; the code is a consequence of it.

This repository tests that hypothesis on a real, non-trivial product.

---

## The Experiment

The same set of specs was given to different AI models with the instruction to implement the application in full — wired to the real live API, no mocks.

Each implementation folder is named after the model that produced it. All implementations target the same live API, the same design system, and the same functional spec. The only variable is the model.

Two UI paradigms are specced, letting the experiment also explore how well models can interpret the same underlying product through different interaction lenses:

- **Multi-step wizard** — a structured, numbered-step layout with a persistent receipt sidebar
- **Conversational UI** — a chat-thread interface where the assistant guides the user and interprets natural language

---

## Repository Structure

```
/
├── spec.md                          # Master overview and implementation rules
├── spec-api.md                      # GraphQL API, types, queries, polling pattern
├── spec-design.md                   # Design language system (colors, typography, spacing)
├── spec-multistep.md                # Multi-step wizard UI spec
├── spec-conversational.md           # Conversational (chat-thread) UI spec
│
├── claude-sonnet-4-6-multistep-ui-implementation/   # Claude Sonnet 4.6 — multi-step wizard
├── gpt-5-codex-multistep-ui-implementation/         # GPT-5 Codex — multi-step wizard
└── gpt-5-codex-conversational-ui-implementation/    # GPT-5 Codex — conversational UI
```

---

## The Specs

| Spec | Contents |
|------|----------|
| [`spec-api.md`](./spec-api.md) | All GraphQL queries and mutations, TypeScript types, product ID conventions, async polling pattern for flights and cars |
| [`spec-design.md`](./spec-design.md) | Brand tokens: color palette, Zodiak-Bold typography, 8-point spacing scale, button/input/card patterns |
| [`spec-multistep.md`](./spec-multistep.md) | 2-column wizard: step panel (left) + receipt sidebar (right), Back/Continue navigation, step progress |
| [`spec-conversational.md`](./spec-conversational.md) | Chat-thread UI: assistant messages with inline components, natural language input via OpenAI assistant, pinned receipt |

---

## The Booking Flow

All implementations cover the same 7 steps:

| # | Step | Key API calls |
|---|------|---------------|
| 1 | Occupancy | `getOffer` |
| 2 | Dates, Airport & Package | `getOfferCalendar` |
| 3 | Accommodation, Room & Board | `getDynamicPackageAccommodations` |
| 4 | Activities | `getDynamicPackageLeisures` |
| 5 | Flights (async) | `startTaskGroup` → `pollTaskGroup` → `getDynamicPackageFlights` |
| 6 | Car Hire (async) | `startTaskGroup` → `pollTaskGroup` → `getDynamicPackageCars` |
| 7 | Checkout | `getDynamicPackageInfoForCustomerForm`, `getCountries` |

`getDynamicPackageReceipt` is called after every confirmed selection to keep the price panel live.

---

## Running an Implementation

Each folder is an independent Next.js 14 app.

```bash
cd <implementation-folder>
cp .env.example .env.local   # set GRAPHQL_URL
npm install
npm run dev
```

Navigate to `/offers/117011` (or any valid offer ID) to start the booking flow.

---

## Implementation Rules

These constraints were given to every model as part of the spec, to keep the comparison honest:

- All implementations must use the **real GraphQL API** at runtime — mock data is not acceptable.
- The offer ID must be **URL-driven** (`/offers/:id`) so different offers can be tested.
- A feature is only considered implemented when the real query or mutation is wired and exercised against the live API.
