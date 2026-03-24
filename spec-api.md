# Booking Engine — API Spec

This document is the canonical backend integration contract for the Secret Escapes booking engine. It is shared by any UI built on top of the flow, but this repository’s primary target is the multi-step UI.

Use this document as a spec-driven lifecycle artifact:

1. Specify: backend-facing requirements and invariants
2. Plan: runtime data architecture and orchestration
3. Task: atomic implementation tasks
4. Implement: exact query, payload, and validation rules

Implementation-process rule:

- Before writing integration code, convert the API work into explicit task units covering boot, payload ownership, repricing, polling, recovery, restore, and submission
- Treat loading states, task-group failures, empty-result handling, and schema-shape normalization as first-class tasks rather than cleanup items
- Update the task breakdown whenever live-schema or runtime learnings reveal missing edge cases

---

## Phase 1 — Specify

### Integration principles

- The shipping runtime must call the real GraphQL API.
- The offer ID must come from the route, not from environment configuration.
- The API is stateless. The frontend owns the evolving booking state and must send it back on each request.
- Every booking session must generate and reuse a unique `x-tb-sessionid`.
- If the browser cannot call the upstream API directly because of CORS, proxy through `/api/graphql`.

### Money units

**All monetary amounts returned by the API are integers in the currency's minor unit (pence for GBP, cents for EUR/USD), not whole currency units.** A value of `15630000` returned from the API represents £156,300.00, not £15,630,000.

This applies to every numeric price-like field anywhere in the schema, including but not limited to:

- `OfferMeta.price`, `OfferMeta.oldPrice`
- `CalendarDate.price`, `CalendarData.nights[].price`, `CalendarData.months[].price`, `CalendarData.departureAirports[].price`, `CalendarData.packageGroups[].price` / `.oldPrice`
- `ReceiptData.totalPrice`, `ReceiptData.oldPrice`, `ReceiptData.perPersonPrice`, `ReceiptData.discount`
- `ReceiptLine.amount`
- `ReceiptData.included[].price`, `ReceiptData.excluded[].price`
- `ReceiptData.instalmentsPayments[][].amount`
- `Accommodation.price`, `AccommodationUnit.price`, `board.price`
- `LeisureGroup.price`, `LeisureUnit.price`, `dynamicPackage.price` on the leisure response
- `Flight.price`
- `Car.price`
- `CarExtra.price.amount`
- Any `totalPrice` passed into `createOrder`

Frontend rules:

- Divide by 100 (or by the appropriate minor-unit factor for the currency) at the **render boundary** only — never mutate the stored payload value.
- Keep all arithmetic (sum, delta, compare-to-baseline, instalment sums) in minor units to avoid floating-point drift; format for display last.
- When sending `totalPrice` back to `createOrder`, send the minor-unit integer — do not convert to whole units first.
- When echoing a `priceSeen` from a receipt response back into a subsequent request, preserve the raw value; do not round-trip through a formatted string.
- Formatter contract: a single helper should produce `"£1,563.00"` / `"£1,563"` from a minor-unit integer + `OfferMeta.currency`. Never concatenate a currency symbol with a raw API number.

Validation check: a 3-night European package receipt total should render in the low thousands of pounds (e.g. `£1,563`), not hundreds of thousands. If you see `£156,300` on screen, the formatter is missing a divide-by-100.

### Environment

| Variable | Value |
|---|---|
| `GRAPHQL_URL` | `https://co.uk.sales.secretescapes.com/api/graphql/` |

Example:

```env
GRAPHQL_URL=https://co.uk.sales.secretescapes.com/api/graphql/
```

### Route and session requirements

- Route shape: `/offers/[offerId]`
- Read `offerId` from route params on boot
- Generate a unique `x-tb-sessionid` when a booking session starts
- Reuse that same header on:
  - boot
  - calendar
  - receipt
  - accommodations
  - activities
  - flights
  - cars
  - car extras
  - checkout metadata
  - polling
- Persist the session ID through encoded URL state so refresh restore continues the same backend session

### `BookingPayload`

The frontend owns a single incremental payload object:

```ts
interface BookingPayload {
  offerId: string
  sessionId: string
  offerMeta?: OfferMeta

  people: PersonInput[]
  groups: PersonGroupsInput[]

  departureAirports?: string[]
  packageGroup?: string
  nights?: number
  selectedDate?: string
  tourUnit?: number | null

  products?: ProductInput[]
  coupons?: string[]
  numOfInstalments?: number
  deferred?: boolean
  properties?: OrderPropertyInput[]
  priceSeen?: string
}
```

#### Bootstrap convention

- Default first render should use 2 adults, even if `occupancyRules.minAdults` is lower
- Bootstrap calendar in two phases:
  1. fetch unselected calendar facets for the default party
  2. choose the leading available airport and package group and fetch the calendar again with those values
- Render the second calendar result so the UI does not visibly jump from an unfiltered grid to a filtered one
- Persist the bootstrap-selected package group into the frontend payload / local step state so the dates-step package card is visibly selected on first render
- If the backend represents the `All packages` choice as `packageGroup: ""`, preserve that empty-string value in frontend selection state as a valid chosen option while still omitting it from outbound API variables

#### People convention

- Adults are represented as empty `PersonInput` objects in the runtime booking path, for example `[{}, {}]`
- `groups` should map indices into the `people` array
- Lead passenger checkout data enriches `people[0]` later

### Product ID contract

| Type | Prefix |
|---|---|
| Accommodation / unit / board | `A:` |
| Car | `C:` |
| Flight | `F:` |
| Leisure | `L:` |
| Unit supplement | `S:` |
| Car extra | `CE:` |

### Product replacement rules

Selections replace prior selections within the same product family:

- one selected accommodation family at a time
- one selected flight at a time
- one selected car at a time
- one selected leisure per leisure group at a time

Do not accumulate duplicates.

### Backend-selected default rule

- If a product-family response marks one choice as `selected`, that choice is the authoritative default for the UI
- Do not infer the default from array order when a backend-selected choice exists
- The fallback order for a panel is:
  1. current payload selection, if the user has already made one
  2. backend-selected/default choice from the latest API response
  3. first available item only when the API does not mark any default
- Apply this consistently to:
  - accommodations
  - accommodation units
  - accommodation boards
  - included leisure variations
  - flights
  - cars
  - payment methods when the API exposes a default flag

Special rule for accommodation:

- accommodation selection is represented by one `A:` product at a time
- when a room / unit has board or meal-plan variants, choosing a board replaces the accommodation product ID with that board / meal-plan product ID
- board / meal-plan choices are scoped to the selected room / unit; do not treat them as a global list shared by all room types
- do not send the unit `A:...` product and the board `A:...` product together as separate accommodation products
- switching hotel, room, board, or meal plan must replace the existing `A:` product family rather than append another `A:` product

### Calendar dependency rules

- Calendar depends on first-step inputs only:
  - `people`
  - `groups`
  - `departureAirports`
  - `packageGroup`
  - selected length-of-stay filter (`nights` when concrete, omitted when the filter is `All nights`)
- Calendar does not depend on `products`
- Later-step product selections must not trigger calendar refetches during normal interaction
- A newly selected stay starts a new decision tree, so first-step receipt repricing must clear downstream `products`

### Receipt error contract

- A stay selection is not valid unless the receipt succeeds and `receipt.errors[]` is empty
- If the receipt returns backend errors for a proposed stay:
  - surface the error in the summary
  - rollback the booking payload to the last valid stay
  - do not allow forward progression

---

## Phase 2 — Plan

### Runtime orchestration model

The API layer should be implemented as a thin orchestration service with these responsibilities:

1. GraphQL transport
2. variable mapping from `BookingPayload`
3. response normalization
4. async task polling
5. payload mutation helpers for product replacement
6. refresh / hydration re-fetch orchestration

### Query lifecycle

#### Boot lifecycle

1. `getOffer`
2. initial `getOfferCalendar`
3. derive default airport + package group
4. filtered `getOfferCalendar`
5. build initial payload and step list

#### First-step lifecycle

When the user changes occupancy, airport, package group, nights, or date:

1. update first-step payload fields
2. clear downstream `products`
3. refetch calendar if the changed field affects calendar
4. reprice receipt when a full valid stay is selected

Length-of-stay state has two meanings that must not be conflated:

- the visible filter may be `All nights` / `null`, which means the calendar query omits `nights`
- the receipt payload must still receive a concrete effective night count after the user selects a flexible start and checkout date
- if a concrete length is selected, clicking a start date is enough to derive checkout and reprice immediately
- if `All nights` is selected, first click chooses check-in and second click chooses one of the API-provided checkout dates from that start date's `nights[]`

#### Accommodation lifecycle

1. call accommodation query using the stay selection
2. omit current accommodation `A:` products from the accommodation-options fetch
3. preview hotel / unit / board changes by repricing receipt immediately
4. on step continue, persist the final accommodation product as a single `A:` product
5. when switching hotels, initialize room and board from that hotel’s backend-selected unit and backend-selected board
6. if the selected board / meal plan has its own `A:` product ID, use that ID as the product ID in place of the unit ID
7. when switching rooms, recompute the active board / meal-plan choices from the newly selected room's own board list

#### Activities lifecycle

1. call leisure query using the current stay and prior non-leisure products
2. omit current leisure `L:` products from the leisure-options fetch
3. preserve the returned `dynamicPackage.price` as the leisure-step baseline price
4. update `payload.products` and receipt immediately on leisure changes

#### Flights lifecycle

1. start async flight search task group
2. poll until finished
3. start async price validation task group
4. poll until finished
5. fetch flight results
6. selection immediately replaces `F:` in `payload.products` and reprices receipt
7. if the task group fails or the final flight result set is empty, treat that as a no-results outcome for the chosen stay rather than surfacing raw backend task-group text
8. expose a UI recovery path that resets the journey back to the calendar / stay-selection step
9. a failed, timed-out, or empty flight search must be terminal for the current stay; do not automatically restart the same search in a render/effect loop

#### Cars lifecycle

1. start async car search task group
2. poll until finished
3. fetch car results
4. use backend-selected default car if one is returned
5. selecting a car triggers car-extras async flow
6. extras become `CE:` options on the selected `C:` product
7. if the task group fails or the final car result set is empty, treat that as a no-results outcome for the chosen stay rather than surfacing raw backend task-group text
8. expose a UI recovery path that resets the journey back to the calendar / stay-selection step
9. a failed, timed-out, or empty car search must be terminal for the current stay; do not automatically restart the same search in a render/effect loop

#### Checkout lifecycle

On step entry, fetch checkout metadata in parallel:

- customer form metadata
- countries
- latest receipt

On final submit:

1. call `createOrder`
2. pass the same booking-selection parameters used for the receipt
3. include checkout customer details, payment method, total price, and a `restore_url` property
4. redirect the browser to `paymentResult.continueUrl`

### URL-state rehydration model

Encoded URL state may contain:

- session ID
- current step
- party composition
- stay selection
- products
- coupons
- checkout selections

Encoded URL state must not contain cached API response payloads.

Refresh restore must:

1. decode the snapshot
2. rebuild `BookingPayload`
3. re-fetch real API data for the restored step
4. show loading states while that step’s data is rehydrating

### Option baseline model

For cards that show `Included` or deltas:

- prefer the backend-selected default option as the baseline
- do not infer the baseline purely from lowest price
- do not infer the baseline from array order when the backend already marks a selected/default choice
- tied non-baseline options must show `+£0`, not `Included`
- cheaper alternatives against the baseline may show negative deltas, for example `-£80`

---

## Phase 3 — Task

Implement the API layer in these atomic tasks:

1. Create a GraphQL client with optional request headers
2. Add `/api/graphql` proxy support when needed
3. Define TypeScript payload and normalized response types
4. Implement session header generation and forwarding
5. Implement `getOffer`
6. Implement two-stage boot calendar loading
7. Implement receipt query and variable mapper
8. Implement product replacement helpers
9. Implement accommodation query path with accommodation-product stripping
10. Implement leisure query path with leisure-product stripping and base-price capture
11. Implement flight task-group start and polling
12. Implement car task-group start and polling
13. Implement car-extras task-group flow
14. Implement checkout metadata queries
15. Implement URL-state hydration fetch orchestration
16. Add response normalization for receipt itinerary typed components
17. Add validation guards for receipt errors and rollback behavior

---

## Phase 4 — Implement

### GraphQL client contract

Use native `fetch`, not Apollo:

```ts
export async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(process.env.GRAPHQL_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()

  if (json.errors?.length) {
    throw new Error(json.errors[0].message)
  }

  if (!json.data) {
    throw new Error('Missing GraphQL data payload')
  }

  return json.data
}
```

### Offer query

`getOffer` must fetch the offer summary, occupancy rules, feature flags, and information content needed to drive the flow and right-column summary.

Use these fields at minimum:

- title and short title
- summary image
- location data
- feature flags:
  - `hasFlights`
  - `hasCars`
  - `hasAccommodationUnits`
  - `isLeisureOnly`
  - `selectDate`
  - `isRoundtrip`
- occupancy rules
- payment help and terms metadata
- information lists for summary modals

### Calendar query

`getOfferCalendar` must support:

- party size
- airport filter
- package group filter
- nights filter
- date range browsing

Important notes:

- use the API’s real `nights: null` item as the flexible-date option
- omit optional filters rather than sending empty strings
- `packageGroup: ""` is invalid; omit the variable entirely when unselected

#### Calendar argument types — plural lists on calendar, singulars on root

The `offer.calendar(...)` field and the root `dynamicPackage*` queries look
similar but have **different argument types for the same conceptual filters**.
Mixing them up yields errors like:

```
Variable '$nights' of type 'Int' used in position expecting type '[Int]'.
```

Rule of thumb:

- `offer.calendar(...)` takes **lists** for all filter inputs:
  - `nights: [Int]`
  - `departureAirports: [String]`
  - `packageGroups: [String]` (note the trailing `s`)
  - `tourUnits: [String]` (note the trailing `s`)
- `dynamicPackage(...)` / `dynamicPackageReceipt(...)` take **singulars**:
  - `nights: Int`
  - `departureAirports: [String]` (still a list)
  - `packageGroup: String` (no trailing `s`)
  - `tourUnit: Int` (no trailing `s`)

Implementation rule: keep one scalar `payload.nights: number | null` in the
booking payload and wrap it as `[payload.nights]` only at the calendar-query
boundary. Do not use the same variable object for both calendar and receipt
calls; shape them per-query.

Validation check: if you bootstrap two adults on offer `117011` and call
`offer.calendar(..., nights: [3])` you should receive a dates list. A
`nights: Int used in position expecting '[Int]'` error means the calendar query
is sending the receipt-shaped variable.

### Receipt query

`getDynamicPackageReceipt` is the live pricing engine. Use it after every meaningful booking selection.
This includes instalment-count changes on checkout.

It must at minimum fetch:

- title
- `totalPrice`
- `oldPrice`
- `discount`
- `perPersonPrice`
- `startDate`
- `endDate`
- `nights`
- `lines`
- `included`
- `excluded`
- instalment arrays
- `cancellationConditions`
- `errors`
- `itinerary.events.components`

#### Receipt itinerary typed components

Retain and normalize typed itinerary component data instead of flattening it.

At minimum preserve:

- `ItineraryAccommodationComponent`
  - `checkinDate`
  - `checkoutDate`
  - `stayNights`
  - `accommodation.name`
  - `unit.name`
  - `board.name`
- `ItineraryFlightComponent`
  - leg label
  - segment airline / operating airline
  - route and timestamps
  - cabin class
  - luggage fields
- `ItineraryCarComponent`
  - car model and image
  - pickup location
  - dropoff location

Schema note:

- do not assume nested `id` fields are available on receipt itinerary accommodation objects
- nested `name` fields are safe and sufficient for UI rendering

#### Itinerary component types

The itinerary `components` array uses `__typename` to distinguish types (e.g., `ItineraryFlightComponent`, `ItineraryAccommodationComponent`). The normalizer should extract a simple `type` string (e.g., `"flight"`, `"accommodation"`) for the UI layer. **The raw `__typename` value must never be rendered to the user.** The UI must map types to SVG icons — see spec-design.md for the icon mapping.

#### Receipt list-key note

- Do not key UI rows from `instalmentsPayments[].amount` and `payBeforeDate` alone
- those values may be null or duplicated

#### Instalment presentation note

- The receipt returns `instalmentsPayments` as a list of schedules, not one flat schedule
- Each top-level entry corresponds to an instalment-plan option in order:
  - index `0` = pay in full
  - index `1` = 2 instalments
  - and so on
- The UI must select the schedule that matches the currently selected `numOfInstalments`
- Within the selected schedule:
  - the first row is the immediate due-now payment
  - the remaining rows are due-later payments
- Do not flatten all schedules together
- Do not derive the due-now amount from `receipt.totalPrice - sum(...)` when the API already provides the selected schedule rows
- When `numOfInstalments` changes, reprice the receipt and refresh the displayed schedule for that selected plan

### Accommodation query

Use `dynamicPackage.accomodations` exactly as returned by the API typo.

When fetching accommodation options:

- strip existing accommodation `A:` products from the request
- keep all other relevant payload state
- preserve facility objects rather than collapsing them to plain strings; keep `facilities[].icon` from the accommodation query so the UI can map icons from stable backend tokens

### Leisure query

When fetching leisure options:

- strip existing leisure `L:` products from the request
- retain the returned `dynamicPackage.price` as the leisure baseline price for delta calculations

Leisure grouping rules:

- included leisure variations are grouped by parent leisure product
- optional leisure presentation is grouped by activity title first, then by day inside that choice
- different days may map to different `L:` product IDs
- use the unit-level `selected` flag for default variation selection
- do not treat the leisure-level `selected` flag as meaning every variation is selected

Rendering note:

- any enum-like API value that is shown to users should be rendered through an explicit UI mapping table
- do not rely on generic text transformations like lowercasing, replacing underscores, or title-casing raw enum strings
- if a value is intended to be user-facing, define and maintain a deliberate label map for it

### Flight polling pattern

Flights must follow this exact async pattern:

1. start `FLIGHT_SEARCH`
2. poll task group until finished
3. start `FLIGHT_PRICE_VALIDATION`
4. poll task group until finished
5. fetch final flight results
6. re-fetch the receipt for the unchanged payload
7. compare the new `receipt.totalPrice` with the total captured before step 1, and surface any increase/decrease in the flights UI

### Car polling pattern

Cars must follow this exact async pattern:

1. start `CAR_SEARCH`
2. poll until finished
3. fetch final cars
4. after a car is selected, start car-extras flow
5. poll until car extras are ready
6. fetch extras

### Checkout metadata queries

On checkout entry fetch:

- customer form metadata
- participant form metadata
- countries
- latest receipt

### Order creation

Checkout submission must use a real `createOrder` mutation.

It should include at minimum:

- `offerId`
- `people`
- `totalPrice`
- `date`
- `paymentMethod`
- `nights`
- `products`
- `groups`
- `coupons`
- `numOfInstalments`
- `departureAirports`
- `tourUnit`
- `packageGroup`
- `properties`
- `deferred`
- `priceSeen`

Implementation rule:

- include a `restore_url` property so the backend retains the current booking restore location
- use the current receipt total as `totalPrice`
- after success, redirect to `result.paymentResult.continueUrl`

### Common implementation pitfalls

These are concrete mistakes that have occurred in prior implementations. The implementor MUST verify each one.

#### GraphQL variable naming

The `BookingPayload` type uses `selectedDate` internally, but every GraphQL query uses the parameter name `$date`. The variable mapper **must** map `payload.selectedDate` → `date` in the variables object. Sending `selectedDate` as a GraphQL variable will silently pass `undefined` for `$date` and the query will return empty or incorrect results.

Verify: after building the variable mapper, confirm the keys in the output object match the `$variable` names in the corresponding GraphQL query string.

#### Receipt itinerary shape

The receipt query returns itinerary as a nested object:

```
itinerary {
  events {
    label sublabel date
    components { ... }
  }
}
```

The normalizer must access `receipt.itinerary.events` (an array), **not** `receipt.itinerary` directly. Treating `receipt.itinerary` as the events array will cause a `.map is not a function` error at runtime.

Verify: after writing the receipt normalizer, confirm every nested access path matches the GraphQL query structure level by level.

#### Date selection must trigger receipt immediately

In the dates step, selecting a calendar date with a specific night duration must immediately call the receipt query to reprice. It must NOT wait for the user to click Continue. The Continue button should only advance to the next step — the receipt must already be loaded and valid.

This means the flow layer needs two separate actions:
- `selectDate` — sets the date/nights in payload and reprices the receipt
- `confirmDates` — validates the receipt is error-free, completes the step, and advances

#### Accommodation API typo

The API returns `dynamicPackage.accomodations` (single 'm'). The normalizer must use this exact misspelled key, not `accommodations`.

#### Product IDs already include their prefix

The API returns product IDs **with the family prefix already included** (e.g., `"A:386918317"`, `"F:12345"`, `"C:67890"`, `"L:11111"`). When building a `ProductInput` for the payload, use the ID as-is from the normalized data. **Do not add another prefix** — doing so produces invalid double-prefixed IDs like `"A:A:386918317"` which the API rejects or ignores silently.

The `stripProductsByPrefix` helper should still match by prefix (e.g., `id.startsWith("A:")`) since the prefix is part of the ID string.

### Validation checklist

An implementation is API-complete only if it proves all of the following:

- route-driven `offerId`
- unique session header reused across the journey
- live boot against the real API
- live receipt repricing after all required selections
- accommodation/leisure option fetches strip their own family products
- new stay selection clears downstream products
- flight and car polling works
- refresh restore rebuilds live data
- receipt errors block invalid progression
- receipt errors on downstream steps are treated as an invalid package combination: clear downstream state, reset to the Dates step, and require a new stay selection
