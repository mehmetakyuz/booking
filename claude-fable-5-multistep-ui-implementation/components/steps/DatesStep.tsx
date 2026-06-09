'use client'

import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useBookingActions, useBookingState } from '@/lib/store'
import { Dropdown } from '../Dropdown'
import { LoadingOverlay } from '../Loading'
import { StepFooter } from '../StepFooter'
import { addDays, formatMoney, monthLabel, parseISODate, toISODate } from '@/lib/format'
import { describeParty, partyComposition } from '@/lib/payload'
import type { CalendarDate } from '@/lib/types'

export function DatesStep() {
  const state = useBookingState()
  const actions = useBookingActions()
  const { calendar, calendarLoading, payload, nightsFilter, offerMeta } = state
  const currency = offerMeta?.currency ?? 'GBP'

  // Flexible-mode checkout selection state (start picked, awaiting end).
  const [flexStart, setFlexStart] = useState<string | null>(null)

  const dateByIso = useMemo(() => {
    const map = new Map<string, CalendarDate>()
    for (const d of calendar?.dates ?? []) map.set(d.date, d)
    return map
  }, [calendar])

  // Valid checkout dates for the chosen flexible start date.
  const flexCheckouts = useMemo(() => {
    if (!flexStart) return null
    const start = dateByIso.get(flexStart)
    if (!start) return null
    const map = new Map<string, { nights: number; price: number | null }>()
    for (const entry of start.nights) {
      if (entry.nights != null) map.set(addDays(flexStart, entry.nights), { nights: entry.nights, price: entry.price })
    }
    return map
  }, [flexStart, dateByIso])

  const selectedStart = payload.selectedDate ?? null
  const selectedEnd = selectedStart && payload.nights != null ? addDays(selectedStart, payload.nights) : null

  function handleDayClick(iso: string) {
    const day = dateByIso.get(iso)
    if (nightsFilter != null) {
      if (!day || day.quantity <= 0 || day.price == null) return
      actions.selectStay(iso, nightsFilter)
      return
    }
    // Flexible mode
    if (flexStart) {
      if (iso === flexStart) {
        setFlexStart(null)
        return
      }
      const checkout = flexCheckouts?.get(iso)
      if (checkout) {
        const start = flexStart
        setFlexStart(null)
        actions.selectStay(start, checkout.nights)
        return
      }
      // Another available date restarts the start-date choice.
      if (day && day.quantity > 0 && day.price != null) {
        setFlexStart(iso)
        return
      }
      setFlexStart(null)
      return
    }
    if (!day || day.quantity <= 0 || day.price == null) return
    setFlexStart(iso)
  }

  function clearSelection() {
    setFlexStart(null)
    if (selectedStart) actions.clearStay()
  }

  return (
    <div className="step-panel">
      <h1 className="step-heading">Choose your dates</h1>

      <div className={`dates-filters${calendarLoading ? ' is-disabled' : ''}`}>
        <div className="filter-row">
          <div className="filter-field">
            <h2 className="field-heading">Travellers</h2>
            <OccupancyField disabled={calendarLoading} />
          </div>
          {calendar?.departureAirports.length ? (
            <div className="filter-field">
              <h2 className="field-heading">Departure airport</h2>
              <AirportField disabled={calendarLoading} currency={currency} />
            </div>
          ) : null}
        </div>

        {calendar?.packageGroups.length ? (
          <div className="filter-field">
            <h2 className="field-heading">Package</h2>
            <div className="package-card-list">
              {calendar.packageGroups.map((pg) => {
                const id = pg.id ?? ''
                const isSelected = (payload.packageGroup ?? '') === id && payload.packageGroup !== undefined
                return (
                  <button
                    key={id || '__all__'}
                    type="button"
                    disabled={calendarLoading}
                    className={`package-card${isSelected ? ' is-selected' : ''}`}
                    onClick={() => actions.selectPackageGroup(id)}
                  >
                    <span className="package-card-name">{pg.name}</span>
                    {pg.description ? <span className="package-card-desc">{pg.description}</span> : null}
                    {pg.price != null ? (
                      <span className="package-card-price">
                        From {formatMoney(pg.price, currency)}
                        {pg.oldPrice != null && pg.oldPrice > pg.price ? (
                          <s className="package-card-oldprice">{formatMoney(pg.oldPrice, currency)}</s>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {calendar?.nights.length ? (
          <div className="filter-field">
            <h2 className="field-heading">Length of stay</h2>
            <div className="chip-row">
              {calendar.nights.map((n) => {
                const isSelected = nightsFilter === n.nights
                const label = n.nights == null ? 'All nights' : `${n.nights} nights`
                return (
                  <button
                    key={n.nights ?? 'all'}
                    type="button"
                    disabled={calendarLoading}
                    className={`chip${isSelected ? ' is-selected' : ''}`}
                    onClick={() => {
                      setFlexStart(null)
                      actions.selectNightsFilter(n.nights)
                    }}
                  >
                    {label}
                    {n.price != null ? <span className="chip-price">{formatMoney(n.price, currency)}</span> : null}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <CalendarGrid
        loading={calendarLoading}
        currency={currency}
        dateByIso={dateByIso}
        flexMode={nightsFilter == null}
        flexStart={flexStart}
        flexCheckouts={flexCheckouts}
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
        onDayClick={handleDayClick}
        onWhitespaceClick={() => {
          if (flexStart) setFlexStart(null)
        }}
      />

      {nightsFilter == null && (flexStart || selectedStart) ? (
        <div className="calendar-actions">
          <button type="button" className="btn btn-tertiary" onClick={clearSelection}>
            Clear selection
          </button>
        </div>
      ) : null}

      <p className="pricing-disclaimer">
        Prices are estimates, calculated per person and based on your selected travellers (or at least 2 adults
        sharing). Where flights are included, flight prices may still change during booking.
      </p>

      <StepFooter
        continueDisabled={!state.stayConfirmed || Boolean(state.receiptError) || state.receiptLoading}
        onContinue={actions.confirmDates}
      />
    </div>
  )
}

// ---- Occupancy ----

function OccupancyField({ disabled }: { disabled: boolean }) {
  const { payload, offerMeta, calendar } = useBookingState()
  const actions = useBookingActions()
  const rules = offerMeta?.occupancyRules ?? null

  const editable =
    !rules || rules.maxAdults > rules.minAdults || rules.maxChildren > 0

  const summary = describeParty(payload.people)

  if (!editable) {
    return <div className="occupancy-readonly">{summary}</div>
  }

  const { adults, childAges } = partyComposition(payload.people)

  return (
    <Dropdown label={summary} disabled={disabled} closeOnSelect={false} panelClassName="occupancy-panel">
      {(close) => (
        <OccupancyEditor
          initialAdults={adults}
          initialAges={childAges}
          minAdults={Math.max(1, rules?.minAdults ?? 1)}
          maxAdults={rules?.maxAdults ?? 8}
          maxChildren={rules?.maxChildren ?? 8}
          minChildAge={calendar?.minChildAge ?? rules?.minChildAge ?? 0}
          maxChildAge={calendar?.maxChildAge ?? rules?.maxChildAge ?? 17}
          onApply={(a, ages) => {
            close()
            actions.commitOccupancy(a, ages)
          }}
        />
      )}
    </Dropdown>
  )
}

function OccupancyEditor({
  initialAdults,
  initialAges,
  minAdults,
  maxAdults,
  maxChildren,
  minChildAge,
  maxChildAge,
  onApply,
}: {
  initialAdults: number
  initialAges: number[]
  minAdults: number
  maxAdults: number
  maxChildren: number
  minChildAge: number
  maxChildAge: number
  onApply: (adults: number, childAges: number[]) => void
}) {
  // Edits stay local while the panel is open; Apply commits them.
  const [adults, setAdults] = useState(initialAdults)
  const [childAges, setChildAges] = useState<number[]>(initialAges)

  function setChildCount(count: number) {
    const next = childAges.slice(0, count)
    while (next.length < count) next.push(minChildAge)
    setChildAges(next)
  }

  return (
    <div className="occupancy-editor">
      <div className="occupancy-row">
        <span className="occupancy-row-label">Adults</span>
        <StepperControl value={adults} min={minAdults} max={maxAdults} onChange={setAdults} ariaLabel="Number of adults" />
      </div>
      <div className="occupancy-row">
        <span className="occupancy-row-label">Children</span>
        <StepperControl
          value={childAges.length}
          min={0}
          max={maxChildren}
          onChange={setChildCount}
          ariaLabel="Number of children"
        />
      </div>
      {childAges.map((age, i) => (
        <div className="occupancy-row occupancy-row-age" key={i}>
          <span className="occupancy-row-label">Child {i + 1} age</span>
          <StepperControl
            value={age}
            min={minChildAge}
            max={maxChildAge}
            onChange={(v) => {
              const next = [...childAges]
              next[i] = v
              setChildAges(next)
            }}
            ariaLabel={`Age of child ${i + 1}`}
          />
        </div>
      ))}
      <div className="occupancy-apply">
        <button type="button" className="btn btn-primary btn-small" onClick={() => onApply(adults, childAges)}>
          Apply
        </button>
      </div>
    </div>
  )
}

function StepperControl({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  ariaLabel: string
}) {
  return (
    <span className="stepper" role="group" aria-label={ariaLabel}>
      <button type="button" className="stepper-btn" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease">
        <Minus size={14} />
      </button>
      <span className="stepper-value">{value}</span>
      <button type="button" className="stepper-btn" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase">
        <Plus size={14} />
      </button>
    </span>
  )
}

// ---- Airport ----

function AirportField({ disabled, currency }: { disabled: boolean; currency: string }) {
  const { calendar, payload } = useBookingState()
  const actions = useBookingActions()
  const current = payload.departureAirports?.[0]
  const currentEntry = calendar?.departureAirports.find((a) => a.airport?.iataCode === current)

  return (
    <Dropdown
      label={currentEntry?.airport ? currentEntry.airport.name : 'Any airport'}
      disabled={disabled}
    >
      <ul className="dropdown-options">
        {calendar?.departureAirports.map((a) => {
          if (!a.airport) return null
          const isSelected = a.airport.iataCode === current
          return (
            <li key={a.airport.iataCode}>
              <button
                type="button"
                className={`dropdown-option${isSelected ? ' is-selected' : ''}`}
                onClick={() => actions.selectAirport(a.airport!.iataCode)}
              >
                <span>{a.airport.name}</span>
                {a.price != null ? <span className="dropdown-option-price">{formatMoney(a.price, currency)}</span> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </Dropdown>
  )
}

// ---- Calendar ----

function CalendarGrid({
  loading,
  currency,
  dateByIso,
  flexMode,
  flexStart,
  flexCheckouts,
  selectedStart,
  selectedEnd,
  onDayClick,
  onWhitespaceClick,
}: {
  loading: boolean
  currency: string
  dateByIso: Map<string, CalendarDate>
  flexMode: boolean
  flexStart: string | null
  flexCheckouts: Map<string, { nights: number; price: number | null }> | null
  selectedStart: string | null
  selectedEnd: string | null
  onDayClick: (iso: string) => void
  onWhitespaceClick: () => void
}) {
  const isoDates = [...dateByIso.keys()].sort()
  const initialIso = selectedStart ?? isoDates[0]
  const [viewYM, setViewYM] = useState<{ y: number; m: number } | null>(null)

  if (!isoDates.length) {
    return (
      <div className="calendar-shell">
        {loading ? <LoadingOverlay /> : <p className="calendar-empty">No availability was found for these filters.</p>}
      </div>
    )
  }

  const first = parseISODate(initialIso)
  const view = viewYM ?? { y: first.getFullYear(), m: first.getMonth() }

  const lastIso = isoDates[isoDates.length - 1]
  const last = parseISODate(lastIso)
  const canPrev = view.y > first.getFullYear() || (view.y === first.getFullYear() && view.m > first.getMonth())
  const canNext = view.y < last.getFullYear() || (view.y === last.getFullYear() && view.m < last.getMonth())

  // Build the month grid (Monday-first).
  const monthStart = new Date(view.y, view.m, 1)
  const leading = (monthStart.getDay() + 6) % 7
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(view.y, view.m, d)))

  const startPrice = flexStart ? dateByIso.get(flexStart)?.price ?? null : null

  return (
    <div
      className="calendar-shell"
      onClick={(e) => {
        if (e.target === e.currentTarget) onWhitespaceClick()
      }}
    >
      {loading ? <LoadingOverlay /> : null}
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-chevron"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => setViewYM(view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 })}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="calendar-month-label">{monthLabel(view.y, view.m)}</span>
        <button
          type="button"
          className="calendar-chevron"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => setViewYM(view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 })}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        className="calendar-grid"
        onClick={(e) => {
          if (e.target === e.currentTarget) onWhitespaceClick()
        }}
      >
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d} className="calendar-dow">
            {d}
          </span>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <span key={`empty-${i}`} className="calendar-cell-empty" />
          const day = dateByIso.get(iso)
          const available = Boolean(day && day.quantity > 0 && day.price != null)

          const inFlexCheckoutMode = flexMode && Boolean(flexStart)
          const checkoutEntry = inFlexCheckoutMode ? flexCheckouts?.get(iso) : undefined
          const isFlexStart = flexStart === iso
          const isSelectedStart = selectedStart === iso
          const isSelectedEnd = selectedEnd === iso
          const inSelectedRange =
            selectedStart && selectedEnd ? iso > selectedStart && iso < selectedEnd : false

          let clickable: boolean
          let muted: boolean
          if (inFlexCheckoutMode) {
            clickable = Boolean(checkoutEntry) || isFlexStart || available
            muted = !checkoutEntry && !isFlexStart
          } else {
            clickable = available
            muted = !available
          }

          const classes = ['calendar-cell']
          if (muted) classes.push('is-muted')
          if (!available && !checkoutEntry) classes.push('is-unavailable')
          if (isFlexStart || isSelectedStart) classes.push('is-start')
          if (isSelectedEnd) classes.push('is-end')
          if (inSelectedRange) classes.push('is-in-range')
          if (checkoutEntry) classes.push('is-checkout-option')

          const tooltip = isFlexStart ? 'Check-in' : checkoutEntry ? 'Check-out' : undefined

          let priceText: string | null = null
          if (checkoutEntry && startPrice != null && checkoutEntry.price != null) {
            const delta = checkoutEntry.price - startPrice
            priceText = `${delta >= 0 ? '+' : ''}${formatMoney(delta, currency)}`
          } else if (!inFlexCheckoutMode && available && day?.price != null) {
            priceText = formatMoney(day.price, currency)
          }

          const num = Number(iso.slice(8, 10))

          return (
            <button
              key={iso}
              type="button"
              className={classes.join(' ')}
              disabled={!clickable}
              data-tooltip={tooltip}
              onClick={() => onDayClick(iso)}
            >
              <span className="calendar-cell-day">{num}</span>
              {priceText ? <span className="calendar-cell-price">{priceText}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
