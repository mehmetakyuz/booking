# Booking Engine — Conversational UI Spec

This document is the canonical product spec for the conversational Secret Escapes booking flow.

It defines the same fundamental booking journey as the multi-step UI, but expressed through a chat-based interface driven by real backend data and an application-side OpenAI integration for typed intent handling.

Use this document as a spec-driven lifecycle artifact:

1. Specify: user-facing behavior and acceptance criteria
2. Plan: conversational architecture and state model
3. Task: atomic implementation work
4. Implement: exact turn-by-turn requirements

This spec intentionally targets the conversational UI only.
See [spec-api.md](/Users/mehmet.akyuz/Code/booking/spec-api.md) for the shared backend contract and [spec-design.md](/Users/mehmet.akyuz/Code/booking/spec-design.md) for the shared visual system.

---

## Phase 1 — Specify

### Product summary

Build a route-driven chat booking flow where:

- the user books the same trip as in the multi-step journey
- the conversation progresses through the same booking decisions
- every step is grounded in real API data
- a persistent summary / receipt stays visible and reprices live
- typed user messages are interpreted by an application-side OpenAI API integration

### Shared journey parity

The conversational flow must cover the same booking decisions as the multi-step flow:

1. dates
2. rooms
3. activities
4. flights
5. cars
6. confirm & pay

If a step is conditionally absent in the multi-step flow because of offer flags, the same rule applies here.

### Core behavior requirements

- The conversational UI must run against the real GraphQL API in the normal runtime path
- The offer ID must come from `/offers/[offerId]`
- The system must reuse the same `BookingPayload` and product-replacement rules as the multi-step flow
- The system must reuse the same `x-tb-sessionid` for the whole booking session
- The LLM must not invent prices, availability, product IDs, or dates
- The app must validate any model-proposed action against the latest real option set before applying it
- The chat history is append-only for normal progression
- The summary / receipt remains visible and updates from real receipt responses
- A newly selected stay starts a new booking tree and clears downstream products exactly as in the multi-step flow
- Whenever the backend marks a product choice as `selected`, that choice must be used as the conversational default instead of assuming the first returned array item is the default
- Any visible assistant copy must be customer-facing. Do not expose internal grouping, payload, or implementation logic in the thread.

### Acceptance criteria

The conversational spec is only satisfied when:

- a user can complete the journey from route boot to `createOrder`
- every booking decision is made from real API-derived options
- typed input can drive the journey through validated structured actions
- receipt errors prevent invalid progression
- refresh restore recovers the current conversational state and booking state
- the chat flow reaches the same final payload shape as the multi-step implementation

---

## Phase 2 — Plan

### Layout architecture

Desktop:

- left column for the chat thread
- right column for one unified summary / receipt surface
- right column is sticky
- thread scrolls independently
- composer is pinned to the bottom of the chat column

Mobile:

- single-column chat layout
- summary available through a sticky summary bar and drawer
- drawer reuses the same unified summary component

### Conversational orchestration model

The conversational runtime is split into four cooperating layers:

1. Booking flow layer
   - owns the canonical `BookingPayload`
   - calls the real booking APIs
   - reprices receipt
   - loads step datasets

2. Conversation state layer
   - owns assistant/user messages
   - tracks the current conversational stage
   - stores pending assistant prompts and inline components

3. OpenAI assistant layer
   - interprets free-text user messages
   - returns structured actions or clarification text
   - never directly mutates booking state

4. Validation / execution layer
   - validates model output against current live options
   - translates valid actions into booking flow actions
   - turns invalid/stale outputs into clarification prompts

### State model

```ts
interface ConversationalBookingState {
  payload: BookingPayload
  currentStage: ConversationStage
  messages: ConversationMessage[]

  receipt: ReceiptData | null
  receiptLoading: boolean

  calendar: CalendarData | null
  accommodations: AccommodationOption[]
  accommodationsLoading: boolean

  activities: ActivityOption[]
  activitiesLoading: boolean
  activitiesBasePrice: number

  flights: FlightOption[]
  flightSearch: AsyncTaskState

  cars: CarOption[]
  carSearch: AsyncTaskState
  carExtrasByCarId: Record<string, CarExtra[]>
  carExtrasLoadingForId?: string

  checkout: CheckoutData | null
  checkoutForm: CheckoutFormState

  assistantBusy: boolean
  pendingTurnId?: string
}
```

### Conversation model

The thread is built from assistant and user messages.

Assistant messages may contain:

- customer-facing text
- one or more inline interactive components
- confirmation summaries
- clarification prompts

User messages may come from:

- typed natural language
- clicking/selecting inline components
- explicit skip actions where allowed

### OpenAI integration model

Use an application-side OpenAI API integration for typed input handling.

Recommended runtime contract:

- route: `/api/assistant`
- input:
  - latest user text
  - current conversation stage
  - current `BookingPayload`
  - current receipt/error state
  - current step dataset and valid choices relevant to this stage
  - recent conversation history
- output:
  - customer-facing assistant text, or
  - a structured action proposal, or
  - a clarification request

The assistant integration should use structured tool/function outputs rather than free-form hidden instructions.

### Validation model

Every model-proposed action must be validated against live state.

Examples:

- airport must exist in `calendar.departureAirports`
- package group must exist in `calendar.packageGroups`
- selected date / nights combination must exist in the latest calendar response
- accommodation, leisure, flight, and car IDs must exist in the latest loaded step data
- payment method must exist in checkout metadata

Invalid or stale proposals must not mutate the booking state.
They must become a follow-up assistant clarification turn instead.

### Restore model

Refresh restore must recover both:

- booking state
- conversation state

URL state should encode:

- session ID
- current conversational stage
- current `BookingPayload`
- relevant checkout selections
- a lightweight conversation snapshot sufficient to rebuild the thread

The restore path must re-fetch real backend data for the current stage rather than trusting cached option payloads from the URL.

---

## Phase 3 — Task

Implement the conversational flow in these atomic work units:

1. Build the chat shell, composer, and summary layout
2. Build message rendering for assistant and user turns
3. Build the conversation state machine and stage model
4. Integrate the shared booking flow / API layer
5. Build the application-side OpenAI assistant route
6. Build action validation and execution
7. Build the dates conversation and calendar/filter components
8. Build the rooms conversation and room/board components
9. Build the activities conversation and leisure components
10. Build the flight conversation with async search flow
11. Build the car conversation with async search and extras flow
12. Build the checkout conversation and submit flow
13. Build restore, loading, and error recovery behavior
14. Validate parity with the multi-step implementation

---

## Phase 4 — Implement

## Shell

### Chat layout

- Use a full-height conversation shell
- Desktop:
  - left chat column
  - right sticky summary / receipt column
- Mobile:
  - single-column chat
  - sticky summary button and drawer
- The composer is pinned to the bottom of the chat column
- The thread must have enough bottom padding so the composer never obscures the latest turn

### Summary / receipt

- Reuse the same unified summary surface as the multi-step flow
- Keep the same receipt loading and error states
- Keep the same itinerary modal behavior
- The summary is the single source of truth for live pricing during the chat journey

## Conversation primitives

### Message types

```ts
type ConversationRole = 'assistant' | 'user'

type ConversationMessage =
  | {
      id: string
      role: ConversationRole
      type: 'text'
      content: string
    }
  | {
      id: string
      role: 'assistant'
      type: 'component'
      component: ConversationalComponent
      props: Record<string, unknown>
    }
  | {
      id: string
      role: 'user'
      type: 'selection'
      label: string
      value: string
    }
```

### Inline component families

The conversational UI may render these component types inline in assistant turns:

- `OccupancyDraftPicker`
- `AirportDropdown`
- `PackageGroupCardList`
- `NightsDropdown`
- `CalendarPicker`
- `ClearSelectionAction`
- `AccommodationCardList`
- `RoomCardList`
- `BoardCardList`
- `RoomExtrasPicker`
- `ActivityGroupPicker`
- `FlightList`
- `FlightDetailsModalAction`
- `CarList`
- `CarExtrasPicker`
- `CheckoutForm`
- `InstalmentButtonGroup`
- `PaymentMethodList`
- `ConfirmBookingAction`

The thread may also render assistant status turns for:

- panel loading
- polling
- retry
- validation clarification

## Boot lifecycle

On `/offers/[offerId]`:

1. fetch offer
2. fetch initial calendar facets for the default party
3. derive leading airport and package group
4. fetch aligned calendar
5. initialize `BookingPayload`
6. initialize the conversation thread
7. render the first assistant turn for dates

Bootstrap rules:

- default first render should use 2 adults
- use the same two-step calendar bootstrap as the multi-step flow so the chat does not visibly jump between unfiltered and filtered calendars
- no mock boot path counts as completion

## Turn-by-turn journey

### Stage 1 — Dates

#### Assistant turn

The first assistant turn should help the user define the stay.

It should render:

- occupancy picker
- airport control
- package-group cards
- nights control
- compact calendar

#### Occupancy behavior

- occupancy edits stay local inside the inline occupancy panel until explicitly submitted
- adding children exposes age selectors for each child
- submitting occupancy reloads the calendar
- if a valid stay already exists, submitting occupancy also reprices the receipt
- if occupancy is truly fixed by backend rules, render a read-only summary instead

#### Calendar filter behavior

- airport and nights use compact custom controls
- package groups render as visible cards
- the controls are linked and may invalidate each other
- changing any first-step filter:
  - updates first-step payload fields
  - clears downstream `products`
  - refetches calendar
  - preserves the same session ID
- actual calendar refreshes show an in-panel loading treatment
- date selection itself should not grey out the calendar if only the receipt is repricing

#### Date selection behavior

Concrete nights selected:

- the user chooses a start date
- selecting a valid date reprices the receipt immediately
- a stay is only considered selected if receipt returns without backend errors

Flexible nights (`nights: null`):

- the top-level flexible option comes from the real API, including its price
- the user first chooses a start date
- the calendar then enters checkout-selection mode
- valid checkout dates are emphasized and show deltas
- invalid checkout dates remain visible but muted
- clicking whitespace inside the calendar exits checkout-selection mode
- `Clear selection` appears beneath the calendar and remains visible after a full range is selected
- once a valid checkout date is chosen, derive nights from the date span and reprice the receipt

#### Error handling

- if receipt returns errors for a proposed stay:
  - do not commit the selection
  - keep the previous valid payload
  - surface the error in the summary and/or a customer-facing assistant clarification
  - do not allow progression

#### Completion

Once a valid stay exists, the assistant may:

- append a short user-style selection summary, or
- move directly into the next assistant turn for rooms

Do not emit redundant customer copy that merely repeats visible UI state.

### Stage 2 — Rooms

#### Assistant turn

Render:

- hotel list
- room list for the selected hotel
- board list for the selected room
- room extras when applicable

#### Behavior

- hotel cards use left-side galleries and top-right delta/total pricing
- room cards use a vertical list with left imagery and facility icons
- board cards use the same option-card pricing language
- hotel, room, and board changes reprice receipt immediately
- accommodation option fetches must omit current `A:` products, but receipt repricing must include the selected ones
- when a hotel is selected, the default room and board must come from that hotel’s backend-selected unit and board
- only the true backend-selected baseline shows `Included`
- tied non-baseline options show `+£0`

### Stage 3 — Activities

#### Assistant turn

Render activity groups with:

- included groups first
- optional groups below
- imagery
- price deltas and totals
- details modal action

#### Included leisure behavior

- included groups are required choices
- backend-selected variation is the default
- if multiple included variations share the same day, the backend-selected one must still be the active default
- cards themselves are the selectable surface
- only the true included baseline shows `Included`

#### Optional leisure behavior

- optional groups are opt-in
- `No thanks` is the explicit opt-out
- optional groups should still show their content before opt-in
- optional grouping is by activity title first, with day choices nested inside
- each day may map to a different `L:` product ID
- if a selected day has only one variation, choose it automatically
- optional leisure deltas must use the leisure query base package price, not the already-mutated receipt total

#### Repricing behavior

- leisure changes immediately update `payload.products`
- receipt reprices immediately
- leisure option fetches omit existing `L:` products, but downstream steps include the selected leisure products

### Stage 4 — Flights

#### Assistant turn

When flights apply, render:

- search / validation progress turn while task groups run
- retry state on failure
- vertical flight card list on success

#### Flight card behavior

- airline branding on the left
- route summary and luggage summary
- delta top right, resulting total beneath
- details action opens full segment breakdown
- active/default flight comes from payload selection first, then backend-selected flight
- selecting a flight replaces `F:` in `payload.products` and reprices receipt immediately

### Stage 5 — Cars

#### Assistant turn

When cars apply, render:

- async car-search loading turn
- car list
- extras picker for the selected car

#### Car behavior

- included/default car comes from backend `selected`
- do not invent a synthetic “no car” state when the API includes a selected default car
- selecting a car loads extras
- extras attach as options on the selected `C:` product
- car selection reprices receipt

### Stage 6 — Confirm & pay

#### Assistant turn

Render:

- checkout form fields
- co-traveller fields
- promo codes
- payment methods with logos
- instalment button group
- terms markdown
- EU directive HTML
- confirm-and-pay action

#### Checkout behavior

- checkout metadata is loaded from the real API
- payment method default comes from backend default metadata
- inputs must be customer-grade UI, not browser-default form chrome
- final submission calls `createOrder`
- pass the same booking-selection parameters used for receipt
- include customer details, payment method, total price, date, nights, and `restore_url`
- redirect the browser to `paymentResult.continueUrl`

## OpenAI assistant contract

### Assistant responsibilities

The assistant may:

- interpret typed free text
- map language to valid current choices
- ask clarifying questions
- propose explicit skip actions where the product rules allow it
- explain the currently available choices in customer-facing language

The assistant may not:

- fabricate unavailable options
- fabricate product IDs
- fabricate receipt prices
- bypass validation
- mutate backend state directly

### Structured action examples

```ts
type AssistantAction =
  | { type: 'select_occupancy'; adults: number; childrenAges: number[] }
  | { type: 'set_airport'; airport: string }
  | { type: 'set_package_group'; packageGroup?: string }
  | { type: 'set_nights_filter'; nights: number | null }
  | { type: 'select_stay'; startDate: string; nights: number }
  | { type: 'select_flexible_stay'; startDate: string; endDate: string }
  | { type: 'select_accommodation'; unitId: string; boardId: string; optionValues?: Record<string, string> }
  | { type: 'select_activities'; leisureIds: string[] }
  | { type: 'select_flight'; flightId: string; optionValues?: Record<string, string> }
  | { type: 'select_car'; carId: string; extraIds: string[] }
  | { type: 'update_checkout'; patch: Partial<CheckoutFormState> }
  | { type: 'confirm_booking' }
  | { type: 'clarify'; message: string }
```

The app must still validate these actions against current live state before execution.

## Loading and responsiveness

- Typed user messages show composer sending state
- Destination-stage components should appear immediately and own their own loading state
- Use one shared loading language across the conversational panels
- Polling-heavy stages should show assistant status turns plus panel-level loading
- Receipt loading remains separate and visible in parallel

## Copy rules

- Copy must be written for the customer
- Do not expose internal stage names, payload fields, or implementation explanations
- Do not add redundant derived helper text that merely repeats a visible selection
- Enum-like backend values must be explicitly mapped to customer labels before display

## Parity invariants with multi-step flow

The conversational implementation must preserve these invariants from the multi-step version:

- same `BookingPayload` contract
- same product replacement rules
- same stay-selection error handling
- same clearing of downstream products on new stay selection
- same async task-group polling for flights and cars
- same backend-selected default handling
- same receipt and itinerary data richness
- same checkout submission semantics

