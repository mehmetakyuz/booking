# Booking Engine — Multi-Step UI Spec

This document is the canonical product spec for the multi-step Secret Escapes booking flow implemented in this repository.

Use this document as a spec-driven lifecycle artifact:

1. Specify: user-facing behavior and acceptance criteria
2. Plan: UI architecture and state model
3. Task: atomic implementation work
4. Implement: exact step-by-step requirements

This spec intentionally targets the multi-step UI only.

Implementation-process rule:

- Before writing code, create a concrete plan and split the work into explicit step-sized tasks that cover all panels, modals, receipt behavior, loading states, error states, and restore behavior
- Do not rely on the high-level step list alone; break each major area into enough detail that omissions are obvious during execution
- Keep that task list updated as live API learnings or UX changes are discovered

---

## Phase 1 — Specify

### Product summary

Build a route-driven multi-step booking flow with:

- a full-width branded step rail
- a persistent summary / receipt component
- live repricing after booking selections
- async search flows for flights and cars
- URL-backed refresh restore

### Layout requirements

- Desktop:
  - left column for the active step
  - right column for one unified summary surface
  - right column is sticky
- Mobile:
  - single-column step view
  - sticky summary bar that opens a drawer

### Step set

| Step | Label | Include when |
|---|---|---|
| 1 | Dates | Always |
| 2 | Rooms | `!offerMeta.isLeisureOnly` |
| 3 | Activities | Always |
| 4 | Flights | `offerMeta.hasFlights` |
| 5 | Cars | `offerMeta.hasCars` |
| 6 | Confirm & pay | Always |

### Core behavior requirements

- Step progression is explicit and numbered
- The forward CTA should name the destination step, for example `Step 2. Rooms`
- Back navigation preserves current selections
- The first step should not render a Back button
- The summary / receipt must stay visible and update from live data
- Downstream step selections should reprice receipt immediately when they materially change the booking
- Refreshing the page should restore the in-progress booking via encoded URL state
- URL-state updates during normal interaction must not trigger a Next.js navigation
- Whenever the backend marks a product choice as `selected`, that choice must be used as the UI default for its panel instead of assuming the first returned array item is the default
- Do not add redundant helper copy that merely repeats the user’s already-visible selections, for example derived footer text like `2 travellers selected`, unless that text adds new decision-making value
- When navigating between panels, scroll the viewport back to the top so the next step always opens from its start
- Any visible explanatory copy must be customer-facing. Do not render implementation notes or logic explanations such as how a panel groups data internally.

### Acceptance criteria

The UI spec is only satisfied when:

- a user can complete the journey from route boot through checkout metadata
- step inclusion correctly follows offer flags
- receipt visibly reacts to step selections
- receipt errors prevent invalid progression
- refresh restore recovers the current step and journey state
- default product selections align with the backend-selected choice across the product panels

---

## Phase 2 — Plan

### Screen architecture

The booking shell has three main presentation layers:

1. Top rail
   - logo
   - inline numbered steps
2. Main content
   - left step panel
   - right summary / receipt panel
3. Overlay layer
   - all detail modals

### State model

The UI state should include:

```ts
interface MultistepState {
  payload: BookingPayload
  currentStep: number
  steps: StepDefinition[]

  receipt: ReceiptData | null
  receiptLoading: boolean

  accommodationsLoading: boolean
  activitiesLoading: boolean

  // additional step datasets
  calendar: CalendarData | null
  accommodations: AccommodationData | null
  activities: ActivityData | null
  flights: FlightData | null
  cars: CarData | null
  carExtras: CarExtrasData | null
  checkoutMeta: CheckoutMeta | null
}
```

### Boot model

On `/offers/[offerId]`:

1. Fetch offer metadata
2. Fetch initial calendar facets (`nights: [1]`, `dateFrom: today`, `dateTo: today+30`) to discover:
   - available `packageTypes` → default to `EXCLUDING_FLIGHTS` or first available
   - available `departureAirports` → default to first selected/available
   - available `packageGroups` → default to first
   - `nightsOptions` → apply the decision table to pick `initialNightsFilter`
3. Commit the derived defaults (packageType, departureAirports, packageGroup, nightsFilter)
4. Fetch filtered facets with the committed payload and `initialNightsFilter`, **no date range** — this gives the accurate `globalMinDate` for the offer and corrects facets for the actual filter context. The `minDate` from step 2 is unreliable because that call used `nights: [1]` with a narrow date window; the true global min must come from step 4.
5. Determine the initial calendar month from `globalMinDate` (jump to that month if it is more than 30 days away, otherwise use today's month)
6. Fetch the first month of calendar dates using `dateFrom`/`dateTo` for that month
7. Build steps from offer meta
8. Render summary shell immediately
9. Wait for the first valid receipt after a stay is selected

### Repricing model

The system has two repricing modes:

1. First-step stay repricing
   - clears downstream products
   - may invalidate the previous booking tree
2. Downstream option repricing
   - updates the relevant product family
   - keeps the existing stay selection

### Product price semantics

- Every product option's `price` (hotels, rooms, boards, activities, flights, cars) is the **resulting whole-package total** if that option were selected — it is not the standalone price of that product.
- This is why option cards show a delta against the baseline option on top and the resulting package total beneath: the "total" is the package total, not the product's own cost.
- Never relabel a product `price` as that product's own price (for example "Flight total", "Hotel price", "Car total"). Such labels are factually wrong and mislead the user.
- The only standalone-priced values are explicitly itemised receipt lines and add-on extras that the backend returns with their own discrete price.

### Loading model

Use explicit loading states for:

- first-step calendar/receipt recomputation
- accommodation step loading
- activities step loading
- receipt repricing
- flight task polling
- car task polling
- car extras loading
- hydration / refresh restore

Do not render misleading empty-state copy while a panel is still loading.
When progressing between steps, navigate into the next panel immediately and let that panel show its own loading state while data resolves. Do not block the user on the previous panel with a generic `Working…` CTA label.
For first-step calendar refetches, keep the filters visible but greyed out/disabled, and show the loading spinner inside the calendar panel itself rather than covering the whole first step.

---

## Phase 3 — Task

Implement the UI in these atomic work units:

1. Build the booking shell and top rail
2. Build the step builder and navigation logic
3. Build the right-column unified summary surface
4. Build the dates step with live calendar and receipt logic
5. Build the accommodation step and preview repricing
6. Build the activities step and preview repricing
7. Build the flight step with async search flow
8. Build the car step with async search and extras flow
9. Build the checkout step
10. Build modal system and the inline always-visible itinerary
11. Build URL-state persistence and restore
12. Add loading, error, and retry states
13. Validate cross-step consistency and responsive behavior

---

## Phase 4 — Implement

## Shell

### Top rail

Use a full-width dark booking-navigation rail:

```text
Secret Escapes    1. Dates   2. Rooms   3. Activities   4. Flights   5. Cars   6. Confirm & pay
```

Rules:

- logo on the left
- steps inline across the width on desktop
- current step brightest
- completed steps clickable
- future steps muted
- on mobile, collapse the step rail into a compact current-step trigger with a hamburger control that can expand to reveal the full step list instead of forcing the whole inline rail to remain visible

### Main layout

- Desktop:
  - left panel approximately 60%
  - right panel approximately 40%
- Right panel is one sticky summary component, not separate cards
- The right panel should start on the same horizontal line as the active step panel, without an extra top offset
- Summary starts with a full-width image and flows into receipt content

### Mobile layout

- Active step occupies the main screen
- Summary available via sticky bar and drawer
- The sticky mobile summary bar should expose the current live total price when a receipt exists so repricing is visible without opening the drawer
- Drawer uses the same unified summary component as desktop

## Step 1 — Dates

### Purpose

The first step combines:

- travellers
- airport
- package group
- nights
- calendar

This is the stay-definition step.

### Occupancy

- Render occupancy as a compact field that opens a dropdown panel
- Default first render is 2 adults
- Closed field shows concise summary, for example `2 adults`
- Adults and children controls appear inside the dropdown
- Changes inside the occupancy dropdown should remain local while the panel stays open
- Submitting the occupancy panel should commit the new party composition and then reload the calendar
- If backend rules truly make occupancy non-editable, render a read-only summary field
- Adding children should expose age selectors for each child within that same panel before submit
- Changing occupancy refetches calendar facets/dates and reprices receipt when there is already a valid stay

### Airport, package group, and nights filters

- Use custom React dropdowns, not native selects
- Airport and nights should use the compact dropdown language
- Package groups should render as a visible list of selectable cards rather than a dropdown so users can compare transfer/package variants directly
- Include aggregate price in option labels
- The filters are linked:
  - changing one may change the valid values and prices of the others
  - reconcile the current payload to valid values returned by the refreshed calendar
- If package groups are present, select the leading available package group by default
- That default package group must appear visibly selected in the card list on the initial render; do not wait for a user interaction before showing the selected state
- If the backend uses an empty-string package-group ID for an `All packages` option, treat that empty string as a valid selected option in the UI rather than as an unset value
- If no package group is selected, omit it from API variables instead of sending an empty string
- The length-of-stay selector must have a visible selected state after boot
- On boot, inspect the `nightsOptions` returned by the initial facets call (made with `nights: [1]`) and apply this decision tree:

  | Condition | `nightsFilter` | Notes |
  |---|---|---|
  | Includes `null` (All nights / flexible) | `null` | — |
  | Includes `1` but no `null` | `1` | Initial facets call used `1`, no reload needed |
  | Includes other values but NOT `1` and NOT `null` | First available value (e.g. `2`) | Initial call used invalid `1`; reload with the correct value using `globalMinDate` to land on the right month |
  | Empty array | `1` | Synthetic 1–31 selector shown; no API nights constraint |

  Never force `nightsFilter = 1` when `1` is not a valid option — passing an invalid nights value causes an API error. Always use the first value the API returned.

- If the API returns an **empty** `nightsOptions` array, synthesise a 1–31 chip selector so the user can still pick a stay length; chips show night counts only (no prices); the default selection is `1`
- If the API returns `All nights` / `nights: null` as the selected/default length filter, keep that chip selected while the user chooses a flexible start and checkout date
- If the user selects a concrete nights chip, selecting a start date immediately implies the checkout date and must not require a second calendar click

### Package types (hotel-only vs hotel + flight)

The calendar returns a `packageTypes` facet that represents the highest-level booking distinction: whether the package includes flights or not. Each entry has a `name` (customer-facing) and a `type` enum value. The known values are:

| `type` | `name` | Meaning |
|---|---|---|
| `INCLUDING_FLIGHTS` | Hotel + flights | Package includes flight; departure airport selector is active |
| `EXCLUDING_FLIGHTS` | Hotel only | No flight component; departure airport selector is hidden |

#### Rendering

- Render `packageTypes` as selectable cards at the top of the Dates step, before the occupancy/airport row and before `packageGroups`
- **Hide the facet entirely when only one type is returned** — there is nothing to choose between
- Cards have no price (the type facet carries no price); render name only, with a type-specific icon (`Building2` for hotel-only, `PlaneTakeoff` for hotel + flights)
- The selected type must show a visible selected state immediately — do not wait for the calendar re-fetch

#### Behaviour and filtering

The `packageTypes` facet is **read-only** — the API does not accept it as a filter argument. Filtering between hotel-only and hotel + flight is done entirely through `departureAirports`:

| State | `departureAirports` value | Effect |
|---|---|---|
| Not yet set | `undefined` (omit from query) | API returns all availability |
| Hotel only (`EXCLUDING_FLIGHTS`) | `[]` explicit empty array | API returns hotel-only dates |
| Hotel + flight (`INCLUDING_FLIGHTS`) | `["LHR"]` specific airport code | API returns flight-inclusive dates for that airport |

Never collapse `[]` to `undefined` — the empty array is a deliberate signal, not an absent value.

On fresh boot, default to `EXCLUDING_FLIGHTS` when that type is present in the facets; fall back to the first returned type otherwise.

When the user selects a package type, eagerly commit the airport state before the calendar re-fetches so dependent UI responds immediately:
- `EXCLUDING_FLIGHTS` selected → set `departureAirports: []`, hide the departure airport selector
- `INCLUDING_FLIGHTS` selected → clear `departureAirports` to `undefined` so the first calendar fetch runs without an airport filter and can return the full available airport list for reconciliation

#### Airport reconciliation after a type switch

After loading the calendar for the new package type:
- `EXCLUDING_FLIGHTS`: commit `departureAirports: []`
- `INCLUDING_FLIGHTS`: if the currently selected airport is absent from the new calendar's airport list (or `departureAirports` was cleared), promote the first selected or available airport, commit it, then re-fetch the calendar with that airport so dates are filtered correctly. The re-fetch must clear the month cache first because the previous month data was for a different airport.

### Calendar

- Show one month at a time
- Header is white with edge-aligned chevrons and centered month label
- Unavailable dates are greyed out / striped
- Calendar cells show day and price only
- Do not show:
  - summary pills above the calendar
  - low-stock labels
  - helper labels like `Start` or `Check-out`

#### Month-by-month loading

The calendar fetches one month of date data at a time rather than all available dates in a single call. The `dateFrom`/`dateTo` range arguments on the calendar query control this.

**Initial month selection on boot:**
1. Fetch the unfiltered facets call first to obtain `globalMinDate`
2. If `globalMinDate` is more than 30 days away from today, open on `globalMinDate`'s month; otherwise open on the current calendar month
3. If a `selectedDate` is already in the payload (URL restore), open on that date's month regardless

**Navigation:**
- Prev/next arrows navigate one calendar month at a time
- Before fetching, check an in-memory month cache (keyed by `YYYY-MM`)
- Cache hit: update the displayed dates synchronously with no loading indicator
- Cache miss: fetch the month, show a spinner overlay on the calendar grid only (do not disable the rest of the step), then populate the cache
- Navigation bounds come from the API's `minDate` and `maxDate` fields on the calendar response; disable the prev arrow when the displayed month equals or precedes `minDate`'s month, and the next arrow when it equals or exceeds `maxDate`'s month
- The calendar shell and navigation arrows must always render once a month is known — even when the current month has no available dates or a fetch failed. Show a "No dates available this month" note below the grid in that case so the user can navigate forward to find availability

**Cache invalidation:**
- Clear the entire month cache whenever any first-step filter changes (occupancy, airport, package type, package group, nights) — all cached dates are stale after a filter change
- Also clear the cache before re-fetching the calendar after an airport-reconciliation step, because the previous month data was for a different airport

### Fixed nights flow

When a concrete nights filter is selected:

- selecting a date triggers the stay-commit sequence (see below), then reprices the receipt
- a valid receipt response makes the stay selected
- continue becomes available only when that stay is valid

### Stay-commit sequence

When any date selection finalises a stay (fixed-nights click, or flexible checkout-date click), the following steps happen in order before the receipt is called:

1. Commit `selectedDate`, `nights`, and clear `products` to `[]`
2. Set receipt loading immediately so the spinner appears during the next step
3. For non-leisure-only offers, call `dynamicPackage` (accommodations) to get fresh product options with backend `selected` flags
4. Walk the response: `selected` hotel → `selected` unit → `selected` board; commit the resolved `A:` product ID
5. Call receipt with the pre-populated product — this ensures the receipt is priced against a real room/board from the first call

**Why this matters:** the receipt API requires at least one `A:` product to price correctly. Without pre-selection the backend guesses a default, which may differ from the option the backend marks as `selected`. The Rooms step reads the pre-selected product and preserves it rather than re-deriving it.

Leisure-only offers skip step 3–4 (no accommodation component) and go straight to the receipt.

### Flexible nights flow

When the API `nights: null` option is selected:

- first click selects a start date
- calendar enters checkout-selection mode
- keep the start date visible
- keep other dates visible but greyed out
- valid checkout dates should show deltas relative to the chosen start-date price
- allow the user to cancel out of that mode and choose a different start date, including by clicking neutral calendar whitespace
- the flexible-date reset action should sit underneath the calendar as `Clear selection`, not above it, so the grid does not jump vertically when state changes
- that `Clear selection` action should remain visible after a full flexible date range has been selected
- the nights filter itself remains on the flexible/null option after selection
- add subtle hover feedback to active calendar dates so the interaction feels responsive
- in flexible-date mode, the chosen start date should show a `Check-in` tooltip and valid end dates should show a `Check-out` tooltip on hover
- the chip label for the `nights: null` option should read **"All nights"**, not "Flexible dates"

#### Flexible checkout date derivation

Valid checkout dates are computed from the selected start date's `calendarDate.nights` array. Each entry `{ nights: N, price: P }` means `startDate + N days` is a valid checkout date. The price delta shown on checkout dates should be `P - startDatePrice`. After the user clicks a checkout date, the effective `nights` value is `N` from the matching entry — use that to reprice.

Do **not** implement flexible mode as a free-form date-range picker. The valid end dates are constrained by the API data, not by arbitrary user selection.

### First-step loading and error handling

- occupancy, airport, package, nights, and date interactions use one unified loading state
- grey out the panel and show a spinner overlay while refreshing calendar-driven inputs such as occupancy, airport, package, and nights
- selecting dates should not blank or grey out the calendar when only the receipt is being repriced; in that case the loading treatment belongs on the receipt only
- show a short pricing disclaimer directly beneath the calendar explaining that prices are estimated, calculated per person based on the selected traveller count (or at least 2 adults), and that included-flight prices may still change during booking
- a receipt error must not durably commit the stay
- if receipt errors occur:
  - show the error in the summary
  - on the Dates step, rollback payload to the last valid stay and keep continue disabled
  - on any later step, treat the combination as no longer packageable, clear later-step state, return the user to Dates, and require them to choose a new stay

### First-step payload rule

Selecting a new stay starts a new decision tree:

- clear downstream product IDs before first-step receipt repricing
- do not carry accommodation, leisure, flight, or car selections into a newly selected stay

## Step 2 — Rooms

### Purpose

Let the user choose:

- hotel
- room
- board
- unit options when present

### Hotel list

- Render hotels as a vertical list
- Use left-side image galleries
- Keep cards compact
- Do not render full descriptions inline
- Price block sits top-right
- Show delta on top and resulting total beneath
- Only the backend-selected default hotel should show `Included`
- When a hotel is selected, the default room and board for that hotel must come from the backend-selected unit and backend-selected board, not array order
- Equal-price non-baseline hotels show `+£0`
- Provide a hotel-details modal
- The hotel-details modal image area should behave as a slidable gallery carousel, not a static lead image plus separate thumbnail block
- The hotel-details modal should be the place where hotel facilities are shown, using icon-led chips
- Those facility icons should map from the backend facility `icon` tokens such as `wifi`, `restaurant`, `lift`, `front-desk`, `private-bathroom`, `tea-facilities`, `coffee-machine`, `parking`, `spa`, and `smoking-no`, and should use a shared icon library rather than bespoke hand-drawn SVGs

### Room list

- Render rooms as a vertical list
- Left image
- Right-side content
- Top-right delta and total
- Immediate receipt repricing on room change
- Room type choices and meal-plan choices must be visually distinct controls
- Selecting a different room should refresh the meal-plan choices to that room's available boards / meal plans

### Board list

- Show board options with the same delta logic
- Show only the board / meal-plan options available for the currently selected room
- Do not merge board / meal-plan choices into the room-type list; each room may expose a different meal-plan set
- Immediate receipt repricing on board change
- Board and meal-plan changes replace the current accommodation `A:` product ID
- Do not send the room/unit product ID and the board/meal-plan product ID as two separate `A:` products
- The selected accommodation payload should contain one `A:` product for the active hotel / room / meal-plan combination

### Receipt loading

- While receipt reprices for accommodation changes, grey out the receipt and show a spinner overlay

## Step 3 — Activities

### Purpose

Let the user review included leisure choices and opt into optional activities.

### Grouping rules

- Included leisure variation sets group by parent leisure product
- Optional leisure is returned as one group per day slot (`leisures[]` entries carry
  a `date` and `optional: true`); each day slot exposes its available excursions as
  the group's `units[]` variations
- Render optional leisure as one selectable section per day slot, where the user
  either opts into one variation for that day or explicitly chooses `No thanks`
- The chosen variation's `units[].id` is the date-specific `L:` product ID used for
  that day; only one variation per day group can be selected at a time
- Note: an earlier revision of this spec described optional leisure as grouped "by
  activity title first, then by day". The live schema groups by day slot first with
  alternative activities as variations inside, so the implementation follows the
  day-slot model above.

### Included leisure behavior

- Included groups render first
- One backend-default variation is selected
- If multiple included variations exist for the same day, the backend-selected variation must be the default active card
- Alternative variations are selectable cards, not explicit radio buttons
- Only the true baseline variation shows `Included`
- Same-price alternatives show `+£0`
- Cheaper alternatives may show negative deltas

### Optional leisure behavior

- Optional groups are not selected by default
- They should still show full content and imagery before opt-in
- Card itself is the selection affordance
- `No thanks` is the explicit opt-out state
- If a selected day has only one variation, select it automatically

### Activity cards

- Image on the left
- Content on the right
- Delta top-right
- Total package price under the delta
- Keep inline descriptions compact and truncated; full descriptive copy belongs in the details modal
- Human-readable duration, for example `2 hours 30 mins`
- Human-readable tour-type badges driven by explicit enum-to-label mappings, for example `GROUP_TOUR` should map to `Group tour`
- Details modal available
- The activity-details modal image area should use the same slidable gallery-carousel pattern as the accommodation-details modal instead of a static lead image plus separate thumbnails

### Repricing

- Selecting or removing leisure choices updates `payload.products` immediately
- Receipt reprices immediately

### Loading

- While activities are loading, show a loader
- Do not show misleading “already included” copy before data arrives

## Step 4 — Flights

### Purpose

Let the user choose a flight result after async search and validation.

### Async flow

- Show staged loader while searching and validating
- Record the current receipt total before starting flight search
- After flight search and price validation complete, reprice the receipt again for the unchanged payload
- If that total changed, show a customer-facing notice above the flight list explaining whether the total increased or decreased
- On success, replace loader with results
- On failure, timeout, or zero results, show a customer-facing no-results state
- Do not surface raw backend task-group failure text in the UI
- The recovery action should reset the journey back to the Dates step so the user can choose another stay
- Do not automatically retry a failed, timed-out, or empty search for the same stay; show the recovery state until the user changes stay or explicitly takes a recovery action

### Flight cards

- Vertical list
- Flight-specific left branding block using airline logo
- Top-right delta and resulting total
- Clear outbound/inbound summaries
- `View flight details` opens a modal

### Flight details modal

- Show a complete leg-by-leg, segment-by-segment breakdown — the modal must read as a full itinerary, not a thin summary
- For each leg (outbound and inbound), show a leg header with:
  - leg label / direction
  - origin → destination route (city + airport code)
  - total leg duration (departure of first segment to arrival of last segment)
  - stop count (`Direct` or `N stop(s)`)
- For each segment, show:
  - operating airline logo and marketing airline name
  - flight code (airline IATA + flight number)
  - cabin class
  - departure: time, airport (city + code), full date
  - arrival: time, airport (city + code), full date, with a `+N` day-offset badge for overnight arrivals
  - per-segment flight duration (computed from departure/arrival timestamps when no explicit field is provided)
  - luggage details (checked allowance vs hand luggage only), falling back to leg-level allowance when the segment omits it
  - operating-carrier note when the segment is operated by a different airline than the marketing airline
- Between connecting segments, show a layover/connection row with the connection duration and the connection airport
- Show any leg-level hand-luggage rules
- Do not present a price in this modal labelled as the flight's own price. A flight result's `price` is the resulting whole-package total with that flight selected (see "Product price semantics"), not a standalone fare. The card already shows that total with its delta; repeating it here as a "Flight total" misleads users into thinking it is the flight-only cost. If a price anchor is wanted, reuse the card's delta + resulting-total treatment, not a bare total labelled as the flight price.

### Selection behavior

- Choosing a flight immediately replaces the `F:` product in `payload.products`
- Receipt reprices immediately
- The active flight card on first render must come from the backend-selected default flight unless the payload already contains a selected `F:...`

## Step 5 — Cars

### Purpose

Let the user choose the included/default car or an upgrade, then configure extras.

### Async flow

- Show car-search loader on entry
- On success show car list
- On failure, timeout, or zero results, show a customer-facing no-results state
- Do not surface raw backend task-group failure text in the UI
- The recovery action should reset the journey back to the Dates step so the user can choose another stay
- Do not automatically retry a failed, timed-out, or empty search for the same stay; show the recovery state until the user changes stay or explicitly takes a recovery action

### Car cards

- Vertical list with left imagery
- Delta top-right and total beneath
- Use backend-selected default car as the initial selection
- Do not infer the default car from array position
- Car extras should surface richer backend detail when available, not only `name · price`; include fields like type, payment timing, and document links
- Do not invent a synthetic “no car” option when the API returns an included default car

### Car extras

- Selecting a car starts the extras flow
- Show inline loader while extras are loading
- Extras are applied as `CE:` options on the selected `C:` product
- Render car extras using the same selectable option-card language as the other product choices, rather than as plain checkbox rows

## Step 6 — Confirm & pay

### Purpose

Collect checkout metadata and render the final form shell.

### Requirements

- Fetch checkout metadata on step entry
- Render passenger forms using backend-provided field metadata
- Render terms and conditions
- Render payment choices here, not in the persistent summary
- Keep the checkout page structurally flatter than the selection steps: one continuous form flow with light section dividers is preferred over multiple nested cards, boxes, and inner containers
- Checkout inputs should still keep comfortable internal padding and field framing; flattening the page structure must not make the form controls feel collapsed or edge-to-edge
- Payment methods should show the payment logo returned by the API when available
- Render `termsMarkdown` as markdown rather than plain text
- Render the EU directive content as HTML rather than escaped text
- Instalment choices should render as an explicit button group rather than a native select
- Changing instalment count should immediately reflect the live receipt breakdown for what is due now versus what is due later
- The checkout UI should show a payment breakdown beneath the instalment buttons using the live receipt schedule
- The receipt returns one schedule per instalment-plan button; the UI must show the schedule matching the currently selected button
- Within that selected schedule, show the first row as `Due now` and only the remaining rows as later payments
- `Confirm and pay` should call the real `createOrder` mutation and redirect the user to the returned payment continuation URL

## Right-column summary

### Structure

The summary is one unified component containing:

- image header
- title and location
- modal links for:
  - what’s included
  - what’s excluded
  - trip information
- trip date block
- integrated price lines
- always-visible full itinerary
- booking total
- error banner when receipt has errors

### Date block

- Use visual start/end date treatment with large day numbers, month/year, weekday, and a directional arrow
- Do not repeat nights or airport immediately below it if backend itinerary already covers that context

### Price area

- No separate bordered “price summary” card
- Render receipt lines directly in flow
- Total belongs at the bottom
- Do not show a `pp` figure beside the bottom total

### Itinerary

- The full day-by-day itinerary is always visible inline in the summary panel — it is not hidden behind a button or modal
- Show a day-grouped timeline with typed icons for flights, hotels, cars, and activities
- Use product-type icons and specific activity names, not generic `Activity`
- Accommodation items should show explicit check-in and check-out dates when the backend provides them
- Flight items should avoid repeating the same route information across title, subtitle, and meta rows
- On desktop, when the itinerary is long, the timeline scrolls within the panel so the booking total stays reachable without scrolling the whole page; the sticky panel must never push the total out of view
- In the mobile drawer the itinerary renders in full (the drawer itself scrolls)

### Summary exclusions

Do not show these in the persistent summary:

- static lead price
- “Based on 2 adults sharing”
- payment-plan rows
- duplicate nights/airport fallback lines

## Modal system

All detail modals in the journey should use one pattern:

- dark backdrop
- white shell
- consistent spacing
- top-right `×` close affordance

### Modal trigger links

- The inline text links that open detail modals (`View hotel details`, `View flight details`, and similar) are left-aligned, sized to their own text, and read as inline links.
- Watch the implementation trap: these triggers are `<button>` elements placed inside column flex containers (card content bodies), which by default stretch the button to full width and center its label. The link must shrink to its content and stay left-aligned (for example `align-self: flex-start` with left-aligned text), never appearing centered within the card.

## URL-state requirements

- Encode journey state into the URL
- Use compact encoded state, not many raw query params
- Restore enough state to reload the correct step and datasets after refresh
- Use history replacement, not router navigation, when updating the encoded state during normal interaction

## Validation checklist

The UI is complete only if:

- step rail reflects the real enabled steps
- right summary remains visible and coherent across the flow
- first-step stay selection and error rollback work
- room/activity/flight/car changes reprice receipt correctly
- async loaders and retries work
- step transitions feel immediate, with shared in-panel skeleton/loading treatments rather than ad hoc per-step busy labels
- the always-visible inline itinerary shows specific product details and keeps the total reachable
- refresh restore works without a visible full-page reload caused by URL syncing
