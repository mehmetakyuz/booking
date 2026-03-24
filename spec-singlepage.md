# Booking Engine — Single-Page Progressive UI Spec

This document defines a sibling UX for the same Secret Escapes booking engine used by the multi-step flow. Functionally it must use the same booking payload, the same backend integration rules, the same receipt logic, and the same checkout behavior. The only major difference is presentation:

- not separate steps shown one at a time
- one vertically scrollable page
- later sections unlock as valid earlier decisions are made

Use this document as a spec-driven lifecycle artifact:

1. Specify
2. Plan
3. Task
4. Implement

Implementation-process rule:

- Before writing code, create a concrete plan and split the work into explicit section-sized tasks that cover unlock rules, repricing, loading states, error recovery, restore behavior, and responsive behavior
- Do not assume the single-page layout is simpler than multi-step; the same booking-engine constraints still apply
- Keep the task list updated as live API learnings or UX changes are discovered

---

## Phase 1 — Specify

### Product summary

Build a route-driven single-page booking flow with:

- one scrollable booking page
- a persistent summary / receipt component
- live repricing after booking selections
- async search flows for flights and cars
- URL-backed refresh restore
- progressive unlock of later sections based on valid earlier choices

### Functional parity requirement

This UI must preserve the same fundamental booking journey as the multi-step version:

1. Define travellers and stay dates
2. Choose accommodation when applicable
3. Add or skip activities
4. Choose flights when applicable
5. Choose car hire when applicable
6. Complete checkout

The booking engine behavior must remain aligned with:

- [spec-api.md](./spec-api.md)
- [spec-design.md](./spec-design.md)

If this document conflicts with those, the conflict should be resolved by preserving the same engine semantics and only changing the surface interaction model.

### Core UX model

The page is one continuous scrollable document composed of ordered sections:

1. Dates
2. Rooms
3. Activities
4. Flights
5. Cars
6. Confirm & pay

Rules:

- only the currently reachable sections are interactive
- later sections are initially locked, collapsed, or skeletoned
- a section unlocks when the prior required decision becomes valid
- unlocking the next section should feel immediate and should scroll naturally with the page, not as a route/navigation change
- when a previously valid upstream choice becomes invalid, downstream sections must reset and return to a locked state

### Layout requirements

- Desktop:
  - left column is the scrollable booking page
  - right column is one unified sticky summary / receipt surface
- Mobile:
  - single-column scrollable layout
  - sticky summary bar that opens the same summary drawer pattern used elsewhere

### Section set

| Section | Label | Include when |
|---|---|---|
| 1 | Dates | Always |
| 2 | Rooms | `!offerMeta.isLeisureOnly` |
| 3 | Activities | Always |
| 4 | Flights | `offerMeta.hasFlights` |
| 5 | Cars | `offerMeta.hasCars` |
| 6 | Confirm & pay | Always |

### Progressive unlock rules

#### Dates unlocks Rooms or Activities

- Dates is the first interactive section
- it is considered valid only when a live receipt exists and `receipt.errors` is empty
- once valid:
  - unlock Rooms if accommodation is part of the journey
  - otherwise unlock Activities directly for leisure-only offers

#### Rooms unlocks Activities

- Rooms unlocks after a valid stay exists
- selecting hotel / room / board reprices immediately
- Activities unlock as soon as the accommodation section has a valid effective selection
- if the offer has no accommodation step, this section is absent rather than shown disabled

#### Activities unlocks Flights or Cars or Checkout

- Activities should unlock after the prior section is valid
- optional activities remain optional, but the section must still establish a resolved state:
  - included activity variations must have a selected variant
  - optional groups may remain `No thanks`
- once resolved:
  - unlock Flights if present
  - otherwise unlock Cars if present
  - otherwise unlock Confirm & pay

#### Flights unlocks Cars or Checkout

- Flights unlock only after activities are resolved
- the async flight search/validation flow happens inside the Flights section
- once a valid flight selection exists, unlock Cars or Confirm & pay

#### Cars unlocks Checkout

- Cars unlock only after the flight section is resolved, or directly after activities when there is no flight section
- once car selection is resolved, unlock Confirm & pay

### Revalidation and reset behavior

Single-page UX must not weaken the booking engine reset rules:

- selecting a new stay in Dates starts a new decision tree
- changing stay-defining inputs clears downstream products and later sections
- receipt errors on the Dates section must not durably commit the stay
- receipt errors on later sections mean the package is no longer valid:
  - clear downstream section state
  - collapse/lock later sections
  - return focus/scroll guidance to Dates
  - require the user to pick a new stay

### Acceptance criteria

The single-page spec is only satisfied when:

- a user can complete the same booking journey without switching between isolated step screens
- later sections unlock only when earlier selections are valid
- receipt visibly reacts to each material selection
- refresh restore rebuilds both booking state and unlocked section state
- resetting an upstream decision correctly clears and re-locks downstream sections
- async flight/car states work inside their sections without breaking the scroll flow

---

## Phase 2 — Plan

### Screen architecture

The booking shell has three main presentation layers:

1. Top rail
   - logo
   - high-level journey indicator
2. Main content
   - scrollable ordered section stack
   - sticky receipt / summary surface
3. Overlay layer
   - detail modals

### Section model

The implementation should use an ordered section definition list rather than isolated routed panels:

```ts
interface SinglePageSectionDefinition {
  id: StepId
  label: string
  visible: boolean
  unlocked: boolean
  completed: boolean
}
```

Each section can be in one of four visual states:

1. hidden
2. locked
3. unlocked
4. completed-but-still-editable

### State model

The UI state should include:

```ts
interface SinglePageState {
  payload: BookingPayload
  sections: SinglePageSectionDefinition[]

  receipt: ReceiptData | null
  receiptLoading: boolean

  calendar: CalendarData | null
  accommodations: AccommodationData | null
  activities: ActivityData | null
  flights: FlightData | null
  cars: CarData | null
  carExtras: CarExtrasData | null
  checkoutMeta: CheckoutMeta | null

  activeSectionId: StepId
}
```

`activeSectionId` is not a route change. It is the section that currently owns the user’s attention for:

- auto-scroll
- error focus
- unlock transitions

### Unlock model

The unlock system should be derived from live state, not hand-managed flags alone.

For example:

- `Dates` completed when there is an error-free receipt for the selected stay
- `Rooms` completed when a valid accommodation selection exists, or when the step does not apply
- `Activities` completed when all mandatory activity groups are resolved
- `Flights` completed when a valid selected `F:` product exists, or when the section does not apply
- `Cars` completed when the selected/default car state is resolved, or when the section does not apply

### Scroll behavior

- unlocking the next section may auto-scroll it into view when that is clearly helpful
- do not aggressively steal scroll while the user is interacting with an earlier section
- when a downstream invalidation happens, scroll/focus back to the earliest invalid section
- restoring from URL state should scroll to the first unresolved unlocked section, or the checkout section if everything is resolved

### Loading model

Use section-owned loading states:

- Dates:
  - filters greyed out during calendar refetch
  - spinner inside the calendar panel
  - receipt owns receipt-only loading
- Rooms:
  - section skeleton while accommodations load
- Activities:
  - section skeleton while activities load
- Flights:
  - staged async loader inside the Flights section
- Cars:
  - staged async loader inside the Cars section
- Checkout:
  - skeleton while metadata loads

Do not blank the page or show generic “Working…” states that detach the user from the scroll context.

---

## Phase 3 — Task

Implement the UI in these atomic work units:

1. Create a single-page shell and ordered section stack
2. Build section definition/unlock logic from offer flags and live state
3. Reuse the existing booking payload engine and receipt repricing model
4. Implement the Dates section with the same live calendar/receipt behavior
5. Implement Rooms as an unlocked inline section
6. Implement Activities as an unlocked inline section
7. Implement Flights with async polling inside the section
8. Implement Cars with async polling and car extras inside the section
9. Implement Checkout as the final unlocked section
10. Add section transitions, scroll behavior, and focus restoration
11. Add loading, empty, locked, and error states per section
12. Reuse the unified summary / receipt surface
13. Validate restore behavior, unlock behavior, and downstream resets

Tasking rule:

- treat section unlocking, downstream clearing, and restore-driven rehydration as first-class tasks
- explicitly task empty/error/loading behavior per section so they are not omitted
- track which sections are complete, pending, or blocked during implementation

---

## Phase 4 — Implement

## Shell

### Top rail

Use the same branded top rail family as the multi-step version, but the journey indicator should be adapted to a single-page model.

Rules:

- logo on the left
- desktop may still show the ordered journey labels inline
- mobile should collapse to a compact navigation affordance
- the journey indicator is informational, not the primary navigation model

### Main layout

- Desktop:
  - left column is one ordered vertical section stack
  - right column is one unified sticky summary component
- The right column should align horizontally with the top of the left content stack

## Section presentation rules

### General section behavior

- each section should have a clear title and compact intro only when it helps the customer
- completed sections remain editable in place; do not force the user into a separate edit mode
- locked sections should still be visible enough to communicate what comes next, but not interactive
- unlocking a section should not remount the whole page or break scroll position

### Dates section

Reuse the same product logic as the multi-step Dates step:

- travellers
- airport
- package groups
- nights
- calendar
- pricing disclaimer
- flexible `All nights` mode
- live receipt repricing

Dates is the engine root:

- selecting a new stay clears downstream `products`
- valid stay selection unlocks the next section
- invalid stay selection must not unlock anything

### Rooms section

Reuse the same accommodation product logic:

- hotel list
- room list
- board choice
- details modal
- immediate receipt repricing

If the Dates section changes in a way that invalidates the current accommodation branch, this section must reset to its locked/unresolved state.

### Activities section

Reuse the same activity grouping and selection rules:

- included vs optional activity behavior
- day/variation grouping
- live repricing
- details modal

The section is considered resolved only when included activity groups have a valid selected variant.

### Flights section

Reuse the same async polling rules:

- `FLIGHT_SEARCH`
- `FLIGHT_PRICE_VALIDATION`
- final results fetch
- price-change message after validation if total changed

The section should show:

- staged loading
- no-results recovery
- inline flight cards
- details modal

### Cars section

Reuse the same car async flow:

- async search
- default selected car from backend
- extras
- repricing

### Confirm & pay section

Reuse the same checkout metadata and `createOrder` rules:

- payment methods
- instalments
- markdown/html rendering rules
- createOrder redirect

This section should unlock only when all prior required sections are resolved.

## Summary / receipt behavior

The summary surface must match the same core behavior as the multi-step version:

- sticky on desktop
- drawer on mobile
- live repricing
- itinerary modal
- receipt errors visible

The summary is not the unlock mechanism. It reflects the booking state while the left-side sections control progression.

## Restore behavior

Refresh restore must reconstruct:

- payload
- current valid selections
- which sections are unlocked
- which section should be focused next
- receipt
- any already-fetched product datasets needed for the restored state

---

## Validation checklist

The implementation is incomplete unless all of the following are true:

1. `/offers/117011` renders as one scrollable booking page, not isolated panel navigation.
2. Only Dates is interactive on first load.
3. Selecting a valid stay unlocks the next applicable section in place.
4. Changing a stay-defining choice clears and re-locks downstream sections.
5. Rooms, Activities, Flights, Cars, and Checkout each load inside their own section without replacing the whole page.
6. Receipt reprices after material selections and remains visible.
7. Receipt errors on downstream sections reset the journey back to Dates.
8. Refresh restore returns the user to the correct unlocked point in the page.
9. Mobile still supports the scrollable section model cleanly with the summary bar/drawer.

## Relationship to the multi-step spec

This document is a presentation-variant spec, not a new booking engine.

What must stay the same:

- backend API behavior
- payload lifecycle
- product replacement rules
- session handling
- restore behavior
- receipt/error semantics
- checkout submission behavior

What changes:

- navigation model
- progressive unlock model
- section layout
- scroll/focus behavior
