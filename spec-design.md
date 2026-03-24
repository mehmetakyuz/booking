# Booking Engine — Design System Spec

This document is the canonical visual and interaction system for the booking engine.

Use this document as a spec-driven lifecycle artifact:

1. Specify: brand and UX requirements
2. Plan: design system architecture
3. Task: implementation work units
4. Implement: exact tokens, patterns, and validation rules

Implementation-process rule:

- Before building UI, turn the design requirements into explicit task units for layout, card systems, modal systems, calendar states, receipt states, responsive behavior, and loading/error treatments
- Do not leave visual polish, consistency work, or edge-state treatments as implicit follow-up work; track them as named tasks so they are less likely to be skipped

---

## Phase 1 — Specify

### Brand intent

The booking experience must feel:

- editorial
- premium
- minimal
- travel-led
- brand-consistent with Secret Escapes

It must not feel like generic SaaS checkout UI.

### Brand pillars

The design system is organized around five explicit ingredients from the brand guide:

1. Logo
2. Icons
3. Colours
4. Typography
5. Photography

### Core visual requirements

- Use a dark top rail and light page canvas
- Use white content surfaces for the booking panels
- Use orange as the hero commercial color
- Use turquoise as the helper interaction color
- Use `Source Serif Pro` only for major display moments
- Use `Source Sans Pro` for the rest of the interface
- Use restrained line-based iconography
- Use real travel imagery without heavy filters
- Use one shared panel-loading language across steps instead of bespoke per-step loader variants

### Structural requirements

- The booking shell uses a full-width dark step rail
- The main body is a desktop two-column layout with:
  - step content on the left
  - one unified summary surface on the right
- The right summary is a single component, not stacked cards
- The left step panel and right summary column should align to the same top edge with no extra top offset on the summary
- The summary starts with a full-width image header
- The summary then flows into title, location, summary actions, date block, price lines, total, and receipt-driven sections

### Interaction requirements

- Selection states use turquoise
- Primary CTAs use orange
- Errors use red only
- Option cards must feel consistent across the flow
- Detail views must use one shared modal pattern
- The calendar should communicate state mostly through color and pattern, not helper labels
- When the backend marks a product choice as selected/default, the visible default state in the UI should match that backend choice rather than an arbitrary first-card fallback
- Avoid redundant derived helper copy. If a piece of text merely restates the currently visible selection without changing the user’s decision, validation state, or next action, omit it.
- Do not expose raw enum tokens to users. When enum-like backend values need to be shown, map them explicitly to curated user-facing labels rather than applying generic text adjustments.
- Any user-visible copy should be written for the customer, not for implementers. Do not surface internal logic explanations, spec rationale, or conversational intent in the interface.

---

## Phase 2 — Plan

### Token architecture

The implementation should define tokens for:

- brand colours
- supporting colour ramps
- typography roles
- spacing
- radii
- elevation
- breakpoints

### Component pattern architecture

The design system should be built from these reusable pattern families:

1. Shell patterns
   - top rail
   - page canvas
   - left panel
   - right summary surface
2. Input patterns
   - dropdown field
   - stepper field
   - pills / chips
   - CTA buttons
3. Selection patterns
   - option cards
   - selected states
   - loading overlays
   - shared panel skeletons
   - disabled states
4. Overlay patterns
   - standard modal shell
   - backdrops
   - close controls
5. Travel patterns
   - calendar
   - itinerary timeline
   - media galleries
   - facility icon chips

### Consistency model

The UI should preserve one consistent interaction language:

- same modal close affordance everywhere
- same option-card anatomy wherever content allows it
- same delta-price logic presentation across product types
- same loading treatment for similar async states
- same backend-selected default behavior across product panels
- same receipt-derived payment breakdown language on checkout when instalments are selected

---

## Phase 3 — Task

Implement the design system in these atomic tasks:

1. Define CSS variables for brand and support tokens
2. Add brand fonts and type roles
3. Apply the dark top rail and white-panel page shell
4. Use the provided logo asset in the header
5. Build button variants
6. Build the shared dropdown and dropdown-panel controls
7. Build the unified modal shell with top-right `×`
8. Standardize option-card anatomy and price block placement
9. Build the calendar visual system
10. Build the unified right-column summary surface
11. Build itinerary timeline icon treatment
12. Build facility icon chips for hotel and room features
13. Add responsive behavior for mobile summary drawer
14. Validate visual consistency across all steps

---

## Phase 4 — Implement

### Colours

#### Brand colours

| Token | Hex | Usage |
|---|---|---|
| `brand-primary` | `#FF791A` | Primary CTA, conversion emphasis, key commercial callouts |
| `brand-secondary` | `#0098A8` | Selection, links, helper emphasis |
| `pure-black` | `#17171A` | Top rail, primary text, icon strokes |
| `page-bg` | `#F2F2F2` | Main page background |
| `white` | `#FFFFFF` | Content surfaces |

#### Support colours

| Token | Hex |
|---|---|
| `brand-primary-dark` | `#D96108` |
| `brand-primary-light` | `#FFB27A` |
| `brand-primary-lightest` | `#FFF1E6` |
| `brand-secondary-dark` | `#007C89` |
| `brand-secondary-light` | `#56B8C3` |
| `brand-secondary-lightest` | `#E4F5F7` |
| `grey-darkest` | `#575757` |
| `grey-dark` | `#8B8B8B` |
| `grey` | `#CCCCCC` |
| `grey-light` | `#DFDFDF` |
| `grey-lighter` | `#F5F5F5` |
| `alert` | `#D90032` |
| `alert-light` | `#FBE5EA` |
| `positive` | `#00A37A` |
| `positive-light` | `#E5F5F1` |

#### Colour discipline

- Orange is reserved for the primary commercial action or callout
- Turquoise is the interaction support color
- Do not introduce extra brand colors for core booking surfaces

### Typography

| Role | Font |
|---|---|
| Major H1 / H2 | `Source Serif Pro` |
| All other UI text | `Source Sans Pro` |

Suggested size system:

| Token | Size |
|---|---|
| `text-xs` | `12px` |
| `text-sm` | `14px` |
| `text-base` | `16px` |
| `text-lg` | `18px` |
| `display-sm` | `28px` |
| `display-md` | `32px` |
| `display-lg` | `48px+` |

Rules:

- Buttons should use uppercase `Source Sans Pro`
- Major section display moments may use the serif face
- Everyday headings, labels, and receipt content should stay sans

### Logo

Use the supplied asset:

- Source asset: `/Users/mehmet.akyuz/Code/booking/assets/logo-light.svg`
- Runtime app copy: `/Users/mehmet.akyuz/Code/booking/gpt-5-codex-multistep-ui-implementation/public/logo-light.svg`

Rules:

- preferred treatment is white logo on `#17171A`
- do not recolor or distort the logo
- do not place the logo on orange

### Shell

#### Top rail

- full width
- `#17171A` background
- white logo on the left
- inline numbered steps on the right for desktop
- current step brightest
- completed steps dimmed but clickable
- future steps more muted
- on mobile, prefer a collapsed current-step control with a hamburger trigger and expandable step list rather than a cramped horizontally scrolling full rail
- on mobile, the sticky summary bar should carry a concise live price signal, not just a generic “view summary” label

#### Page canvas

- `#F2F2F2` background
- white content surfaces
- restrained borders and almost no heavy shadow

### Buttons

Rules from the brand guide:

- uppercase
- wide letter spacing
- small radius

Variants:

- primary: orange fill
- secondary: white/transparent with turquoise border
- tertiary: subtle text action
- disabled: muted neutrals

### Dropdown fields

Use custom React dropdown components, not native browser selects, for the first-step filters.

Rules:

- no redundant outer field chrome
- no duplicate visible labels when the section title already labels the control
- include aggregate price inside option labels when commercially relevant
- exception: package-group choices on the dates step should use a visible selectable card list rather than a dropdown, because that comparison benefits from side-by-side scanning of labels, descriptions, and prices

### Occupancy field

- render as one summary field that opens a dropdown panel
- if occupancy is fixed by backend rules, render the same compact field shell as read-only
- when occupancy is editable, keep the dropdown panel open while the user adjusts adults, children, and child ages; commit those changes only on an explicit submit action
- style the open occupancy panel as one continuous surface with internal row dividers, not as a stack of bordered mini-cards

### Calendar

Rules:

- white background
- centered month label
- chevrons aligned to left and right edges of the header
- one month visible at a time
- unavailable dates appear greyed/striped
- selected range is communicated by fills, not helper labels
- do not show summary pills above the calendar
- do not show low-stock messaging in cells
- in flexible-date checkout mode, non-valid dates should remain visible but muted while valid checkout dates show deltas
- clicking neutral whitespace in the calendar should dismiss flexible checkout-selection mode so the user can choose a new start date
- place the flexible-date reset affordance underneath the calendar rather than above it so the calendar component does not jump vertically when selection state changes
- use subtle hover feedback on selectable calendar dates
- use lightweight tooltip labels for start/end roles in flexible-date mode, for example `Check-in` on the chosen start date and `Check-out` on valid end-date hover

### Option-card consistency

Where content allows, option cards should follow this anatomy:

- media on the left
- copy on the right
- price block top-right

Price rules:

- use the backend-selected default option as the baseline
- only that baseline gets `Included`
- tied non-baselines show `+£0`
- cheaper alternatives may show negative deltas
- show the resulting total package price as a smaller secondary line under the delta where useful
- do not add explanatory sublabels like `Base stay` or `Hotel upgrade`
- all API price values are in minor units (pence / cents); divide by 100 at the render boundary and format with the offer currency — see spec-api.md §Money units

Product-specific notes:

- accommodation cards use left imagery and gallery behavior
- room cards are also vertical list cards
- flight cards may use airline-logo blocks rather than travel-photo media
- car cards use left imagery
- activity cards use left imagery

### Modals

All detail modals must share:

- dark backdrop
- white content shell
- consistent radius and spacing
- top-right circular `×` close control

Do not mix different close patterns in the same flow.

### Right-column summary

The right column is one unified component:

- full-width image on top
- headline and supporting offer details below
- trip-information actions below that
- integrated date block
- integrated price lines
- total at the bottom of the pricing area

Additional rules:

- do not show a static lead price once live receipt pricing exists
- do not repeat nights or airport as fallback scalar lines when the backend already provides richer itinerary data
- do not show “Based on 2 adults sharing”
- do not show payment-plan rows in the persistent summary
- detailed itinerary belongs behind a button and modal

### Itinerary iconography

Icons must be line-based and restrained. A shared icon library is allowed for itinerary/product-type icons if its stroke treatment aligns with the brand system.

Use icons in both:

- the compact receipt preview
- the full itinerary modal

### Facilities and travel imagery

- accommodation cards should stay visually compact and should not enumerate hotel or room facilities inline
- accommodation facilities should be shown in the accommodation-details modal using real representative icons, not letter badges
- accommodation facility iconography should key off backend facility `icon` tokens, not string heuristics on translated labels; the icon map should be explicit and stable
- where a shared icon library is already present in the implementation, reuse it for facility chips instead of inventing bespoke SVG artwork
- photography should remain premium, realistic, and not over-processed

### Itinerary rendering

The receipt itinerary must render as a **vertical timeline**, not a flat list or table:

- A thin vertical line connects event dots from top to bottom
- Each event has a circular dot marker on the line
- Event content sits to the right of the timeline rail

Component type indicators must use **inline SVG icons**, not text labels. Never render raw GraphQL `__typename` values or type strings like `ItineraryFlightComponent` to the user. Use a mapping:

| API type (case-insensitive) | Icon |
|---|---|
| `accommodation` | Building/hotel |
| `flight` | Airplane |
| `car`, `carrental` | Car |
| `activity`, `leisure` | Clock/activity |

The same timeline treatment applies to both:
- The compact preview in the receipt sidebar (up to 3 events with "View full itinerary" link)
- The full itinerary in the modal (all events, scrollable)

### Checkout page density

- The checkout step should avoid container-within-container composition
- Prefer one continuous form surface with section dividers, simple grouped rows, and restrained supporting boxes only where the content truly needs it
- Do not wrap every subsection in its own heavy panel if the overall step already sits within the main step surface
- Checkout inputs should use a lighter, borderless or near-borderless field treatment rather than boxed controls with heavy outlines

### Spacing and radius

| Token | Value |
|---|---|
| `space-1` | `4px` |
| `space-2` | `8px` |
| `space-3` | `12px` |
| `space-4` | `16px` |
| `space-6` | `24px` |
| `space-8` | `32px` |

| Token | Value |
|---|---|
| `radius-sm` | `3px` |
| `radius-md` | `4px` |
| `radius-lg` | `6px` |
| `radius-full` | `9999px` |

### API data shape pitfalls (design-relevant)

- `facilities` in accommodation responses are objects like `{name, icon}` rather than strings on the accommodation query path. Preserve the backend `icon` token so facility iconography can map from stable backend values; use `.name` only for customer-facing text.
- `itinerary` in receipt responses is `{events: [...]}`, not a flat array. Access `receipt.itinerary.events` in the normalizer.

### Visual validation checklist

The implementation is design-complete only if:

- the header uses the supplied logo asset
- the top rail is full-width and dark
- the right column reads as one unified summary surface
- option cards share a consistent visual grammar
- selected states use turquoise
- primary CTA uses orange
- the calendar matches the quiet editorial treatment
- all detail modals share one structure
- itinerary uses SVG icons (not text labels or GraphQL type names) for component types
- itinerary renders as a vertical timeline with connecting line and dots, not a flat list
- the receipt total row is visually distinct with weight and separator
- the itinerary preview shows compact rows with date, label, and type badges
- the full itinerary modal shows day-grouped events with component cards
