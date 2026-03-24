# Booking Engine — Master Spec

This repository contains a real Secret Escapes booking engine implementation target. The purpose of this spec set is to let another model or engineer recreate the implementation accurately and completely using a modern spec-driven development lifecycle:

1. Specify
2. Plan
3. Task
4. Implement

The target UI for this repository is the multi-step booking flow, not the conversational variant.

A future implementation agent must not jump directly from reading the spec to writing code. It must first produce a concrete plan and split the work into explicit task units that cover all major functional areas, integration points, loading/error states, and validation steps so important work is not skipped by accident.

## Document Map

The spec is intentionally split by concern:

- [spec-multistep.md](./spec-multistep.md)
  - Canonical product and UX spec for the multi-step booking flow
  - Defines user-visible behavior, layout, state transitions, and acceptance criteria
- [spec-api.md](./spec-api.md)
  - Canonical backend integration spec
  - Defines payload lifecycle, GraphQL operations, polling patterns, product replacement rules, and API invariants
- [spec-design.md](./spec-design.md)
  - Canonical design system spec
  - Defines brand rules, tokens, component patterns, and visual consistency constraints

This file is the entrypoint. A build agent should read this file first, then the three subsystem specs above.

---

## Phase 1 — Specify

### Product goal

Build a production-style Next.js App Router booking journey for Secret Escapes offers where a user can:

1. Choose travellers and dates
2. Choose accommodation
3. Add or skip activities
4. Choose flights when applicable
5. Choose car hire when applicable
6. Review and complete checkout

The UI must use live GraphQL data and live repricing throughout the journey.

### Non-negotiable product requirements

- The implementation must be a real Next.js App Router + TypeScript app.
- The offer ID must come from the route shape `/offers/[offerId]`.
- The application runtime must use the real GraphQL API. Mock data is not an acceptable default runtime path.
- The persistent summary / receipt must stay visible:
  - sticky right column on desktop
  - summary bar / drawer on mobile
- The flow must use the multi-step version of the product, not the conversational version.
- The flow must use live API calls for:
  - boot
  - receipt refreshes
  - accommodations
  - activities
  - flights
  - cars
  - car extras
  - checkout metadata
- Flights and cars must use the task-group polling pattern from the API spec.
- Product replacement rules must follow the API spec exactly.
- URL-backed state must preserve the in-progress booking across refresh.
- Each booking session must carry a unique `x-tb-sessionid`.

### Functional scope

The booking flow is composed of these user-facing steps:

| Step | Label | Conditional |
|---|---|---|
| 1 | Dates | Always |
| 2 | Rooms | Skip if `offerMeta.isLeisureOnly` |
| 3 | Activities | Always, but may auto-skip if no user action is needed |
| 4 | Flights | Only if `offerMeta.hasFlights` |
| 5 | Cars | Only if `offerMeta.hasCars` |
| 6 | Confirm & pay | Always |

### Definition of done

The spec is only satisfied when:

- the app builds successfully with `npm run build`
- all major step flows are wired to the real API
- the summary / receipt updates from live API data
- URL refresh restore works
- async flight and car searches work via polling
- spec files accurately describe the implemented system

---

## Phase 2 — Plan

### Technical architecture

- Framework: Next.js App Router
- Language: TypeScript
- Data fetching: native `fetch`, GraphQL over HTTP
- GraphQL client: thin custom wrapper, no Apollo
- UI state: React context + reducer-style state transitions
- Styling: global CSS using explicit brand tokens from the brand guideline PDF
- Runtime route: `/offers/[offerId]`
- API proxy: allowed at `/api/graphql` when browser CORS requires it

### Runtime architecture

The app should be understood as four cooperating systems:

1. Booking shell
   - route boot
   - step rail
   - responsive two-column layout
2. Booking state engine
   - incremental `BookingPayload`
   - current step
   - live receipt
   - URL encoding / decoding
   - session header management
3. API orchestration layer
   - boot queries
   - receipt refreshes
   - accommodation / leisure / flight / car / checkout queries
   - async task polling for flights and cars
4. Presentation system
   - brand-consistent option cards
   - modal system
   - calendar
   - receipt
   - responsive behavior

### Implementation strategy

Build in vertical slices while wiring the real API early:

1. Boot route, session header, offer fetch, initial calendar fetch
2. Step 1 dates flow with live receipt
3. Right-column summary / receipt shell
4. Accommodation step with repricing
5. Activities step with repricing
6. Flight async flow + repricing
7. Car async flow + extras + repricing
8. Checkout metadata
9. URL state restore
10. polish and validation

Before coding begins, the implementation agent should translate this strategy into a tracked execution plan that:

- enumerates all major product surfaces and backend integration surfaces
- identifies dependencies and critical sequencing
- breaks large features into atomic tasks
- includes non-happy-path work such as loading, empty, error, restore, and validation behavior
- is maintained as implementation progresses so skipped work is visible

---

## Phase 3 — Task

Another implementation agent should treat the work as these atomic workstreams:

1. Create Next.js app structure under `gpt-5-codex-multistep-ui-implementation`
2. Add environment and GraphQL client plumbing
3. Implement server boot for `offerId`
4. Implement session header generation and forwarding
5. Define booking types and payload helpers
6. Implement step list builder from `offerMeta`
7. Implement first-step traveller and date flow
8. Implement receipt panel and live repricing
9. Implement accommodation flow and product replacement
10. Implement activities flow and grouping rules
11. Implement flight polling flow and selection details
12. Implement car polling flow, extras, and defaults
13. Implement checkout metadata fetches
14. Implement URL-backed restore
15. Apply design system and responsive behavior
16. Validate against live API and fix mismatches
17. Run build verification and document run instructions

Tasking rule:

- Do not keep this as an informal mental checklist only
- Represent the work as explicit task units before implementation starts
- Track enough granularity that a later agent can tell whether a requirement has been completed, is in progress, or has not been addressed
- If new requirements or live-API learnings emerge during implementation, update both the task breakdown and the relevant specs

The detailed task decomposition for each subsystem lives in:

- [spec-multistep.md](./spec-multistep.md)
- [spec-api.md](./spec-api.md)
- [spec-design.md](./spec-design.md)

---

## Phase 4 — Implement

### Required implementation output

The implementation must live in its own folder under this repository root, named `{model-name}-multistep-ui-implementation`.

### Spec maintenance rule

If implementation behavior changes, update the relevant spec files in the same change set. The spec is part of the product contract, not optional documentation.

---

## Phase 5 — Validate (MANDATORY)

**A successful build is not sufficient.** The implementation agent MUST interactively validate the running application by loading it in a browser (or via HTTP requests to verify rendered output) and iterating until the flow actually works. Compiling without errors does not mean the UI renders correctly or that interactions function.

### Validation checklist

The agent must start the dev server and verify each of the following. If any check fails, fix the issue and re-verify before moving on.

#### 5a. Visual rendering

1. Load `/offers/117011` and confirm the page renders without blank screens or console errors.
2. Confirm the top rail with logo and step navigation is visible.
3. Confirm the two-column layout renders: step panel on the left, summary panel on the right (desktop).
4. Confirm all form controls are visually styled — dropdowns have borders, steppers have buttons, chips have pill shapes, the calendar has a grid with day cells.
5. Confirm CSS class names used in components match the class names defined in `globals.css`. A class mismatch results in unstyled elements — the agent must cross-reference component JSX class names against CSS definitions.

#### 5b. Dates step interactions

1. Open the occupancy dropdown, adjust adults/children, click Apply — confirm the calendar reloads.
2. Select a departure airport from the dropdown — confirm the dropdown closes and the calendar reloads.
3. Click a package group card — confirm it highlights and the calendar reloads.
4. Click a nights chip — confirm the calendar reloads with updated prices.
5. Click an available (non-greyed-out) calendar day — confirm it highlights as selected.
6. Click the Continue button — confirm the flow advances to the next step and the receipt panel updates.

#### 5c. Subsequent steps

1. Rooms step: confirm accommodation cards render with images, names, prices. Confirm selection updates receipt.
2. Activities step: confirm activities render grouped. Confirm toggling updates receipt.
3. Flights step: confirm the async search status is shown, then flight cards appear.
4. Cars step: confirm the async search status is shown, then car cards appear.
5. Checkout step: confirm form fields render and the submit button is present.

#### 5d. Common CSS pitfalls to verify

These are patterns that frequently break in generated implementations:

- **Dropdown positioning**: The `.dropdown` wrapper must have `position: relative` so that `.dropdown-panel` (`position: absolute`) positions correctly relative to its trigger.
- **Overflow clipping**: If a parent element (e.g., `.step-panel`) has `overflow: hidden`, dropdown panels and absolute-positioned elements inside it will be clipped. Verify dropdowns are visible when open.
- **Spinner class names**: Ensure the spinner class in components matches the CSS definition (e.g., `loader-spinner` vs `spinner`).
- **Calendar button styling**: Calendar day cells rendered as `<button>` elements need explicit `border: none; background: none` to remove browser defaults.
- **Nested wrappers**: If the shell wraps step components in a styled container AND the step component wraps itself in the same styled container, you get nested styling (double padding, double overflow:hidden). Only one layer should apply the card styling.

### Iteration requirement

If any validation check fails, the agent must:
1. Diagnose the root cause
2. Fix it in code
3. Re-run the failing check
4. Continue only when the check passes

This phase is not optional. An implementation that builds but does not render or interact correctly is incomplete.

---

## Reading Order For Future Models

To recreate the implementation as faithfully as possible, read in this order:

1. [spec.md](./spec.md) — this file; phases, architecture, validation requirements
2. [spec-multistep.md](./spec-multistep.md) — product behavior and UX spec
3. [spec-api.md](./spec-api.md) — GraphQL operations, payload lifecycle, polling
4. [spec-design.md](./spec-design.md) — brand tokens, component patterns, CSS

Then implement the multi-step UI, and **do not skip Phase 5 (Validate)**. A build that compiles is not done — the flow must render and interact correctly.
