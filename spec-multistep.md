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

1. fetch offer
2. fetch initial calendar facets
3. derive default airport and package group
4. fetch aligned calendar
5. build steps from offer meta
6. render summary shell immediately
7. wait for the first valid receipt after a stay is selected

### Repricing model

The system has two repricing modes:

1. First-step stay repricing
   - clears downstream products
   - may invalidate the previous booking tree
2. Downstream option repricing
   - updates the relevant product family
   - keeps the existing stay selection

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
10. Build modal system and itinerary modal
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

### Calendar

- Show one month at a time
- Header is white with edge-aligned chevrons and centered month label
- Unavailable dates are greyed out / striped
- Calendar cells show day and price only
- Do not show:
  - summary pills above the calendar
  - low-stock labels
  - helper labels like `Start` or `Check-out`

### Fixed nights flow

When a concrete nights filter is selected:

- selecting a date immediately reprices the receipt
- a valid receipt response makes the stay selected
- continue becomes available only when that stay is valid

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

### Board list

- Show board options with the same delta logic
- Immediate receipt repricing on board change
- Avoid duplicate accommodation product IDs if unit and board resolve to the same `A:` ID

### Receipt loading

- While receipt reprices for accommodation changes, grey out the receipt and show a spinner overlay

## Step 3 — Activities

### Purpose

Let the user review included leisure choices and opt into optional activities.

### Grouping rules

- Included leisure variation sets group by parent leisure product
- Optional leisure presentation groups by activity title first
- Inside an optional group, day selection determines which date-specific `L:` product ID is used

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

### Flight cards

- Vertical list
- Flight-specific left branding block using airline logo
- Top-right delta and resulting total
- Clear outbound/inbound summaries
- `View flight details` opens a modal

### Flight details modal

- Show full leg/segment breakdown
- Include:
  - route
  - timestamps
  - per-segment duration
  - luggage details
  - cabin context

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
- booking total
- concise itinerary preview
- button to open full itinerary modal
- error banner when receipt has errors

### Date block

- Use visual start/end date treatment with large day numbers, month/year, weekday, and a directional arrow
- Do not repeat nights or airport immediately below it if backend itinerary already covers that context

### Price area

- No separate bordered “price summary” card
- Render receipt lines directly in flow
- Total belongs at the bottom
- Do not show a `pp` figure beside the bottom total

### Itinerary preview and modal

- Preview in the summary should use product-type icons
- It must use specific activity names, not generic `Activity`
- Full itinerary lives behind a button and modal
- Modal should show a day-by-day timeline with typed icons for flights, hotels, cars, and activities
- Accommodation items in the full itinerary modal should show explicit check-in and check-out dates when the backend provides them
- Flight items in the full itinerary modal should avoid repeating the same route information across title, subtitle, and meta rows

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
- itinerary preview and modal show specific product details
- refresh restore works without a visible full-page reload caused by URL syncing
