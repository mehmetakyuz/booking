'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { CalendarDate, NightOption } from '@/lib/booking/types'

/* ── Helpers ── */

function formatPrice(pence: number): string {
  return `\u00A3${(pence / 100).toFixed(0)}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Monday = 0, Sunday = 6 */
function dayOfWeek(year: number, month: number, day: number): number {
  const d = new Date(year, month, day).getDay()
  return (d + 6) % 7
}

function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

function partySummary(adults: number, childrenAges: number[]): string {
  const parts: string[] = []
  parts.push(`${adults} adult${adults !== 1 ? 's' : ''}`)
  if (childrenAges.length > 0) {
    parts.push(`${childrenAges.length} child${childrenAges.length !== 1 ? 'ren' : ''}`)
  }
  return parts.join(', ')
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/* ── Component ── */

export default function DatesStep() {
  const { state, actions } = useBooking()
  const { offerMeta, calendar, travellers, payload, steps, currentStepIndex } = state
  const { occupancyRules } = offerMeta

  /* ── Occupancy local state ── */
  const [occupancyOpen, setOccupancyOpen] = useState(false)
  const [localAdults, setLocalAdults] = useState(travellers.adults)
  const [localChildrenAges, setLocalChildrenAges] = useState<number[]>([...travellers.childrenAges])

  const occupancyEditable =
    !(occupancyRules.minAdults === occupancyRules.maxAdults && occupancyRules.maxChildren === 0)

  const occupancyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (occupancyRef.current && !occupancyRef.current.contains(e.target as Node)) {
        setOccupancyOpen(false)
      }
    }
    if (occupancyOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [occupancyOpen])

  useEffect(() => {
    setLocalAdults(travellers.adults)
    setLocalChildrenAges([...travellers.childrenAges])
  }, [travellers.adults, travellers.childrenAges])

  function handleApplyOccupancy() {
    setOccupancyOpen(false)
    actions.updateTravellers(localAdults, localChildrenAges)
  }

  function adjustLocalChildren(newCount: number) {
    const minAge = occupancyRules.minChildAge ?? 0
    if (newCount > localChildrenAges.length) {
      setLocalChildrenAges([
        ...localChildrenAges,
        ...Array(newCount - localChildrenAges.length).fill(minAge),
      ])
    } else {
      setLocalChildrenAges(localChildrenAges.slice(0, newCount))
    }
  }

  /* ── Filter state ── */
  const [selectedAirport, setSelectedAirport] = useState<string>(
    payload.departureAirports?.[0] ?? '',
  )
  const [selectedPackageGroup, setSelectedPackageGroup] = useState<string>(
    payload.packageGroup ?? '',
  )
  const [selectedNights, setSelectedNights] = useState<number | null>(
    payload.nights ?? null,
  )
  const [airportDropdownOpen, setAirportDropdownOpen] = useState(false)
  const airportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (airportRef.current && !airportRef.current.contains(e.target as Node)) {
        setAirportDropdownOpen(false)
      }
    }
    if (airportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [airportDropdownOpen])

  /* ── Calendar filter loading ── */
  const [calendarLoading, setCalendarLoading] = useState(false)

  async function updateFilters(overrides: {
    airport?: string
    packageGroup?: string
    nights?: number | null
  }) {
    setCalendarLoading(true)
    try {
      await actions.updateCalendarFilters({
        airport: overrides.airport ?? selectedAirport,
        packageGroup: overrides.packageGroup ?? selectedPackageGroup,
        nights: overrides.nights !== undefined ? overrides.nights : selectedNights,
      })
    } finally {
      setCalendarLoading(false)
    }
  }

  function handleAirportSelect(iataCode: string) {
    setSelectedAirport(iataCode)
    setAirportDropdownOpen(false)
    updateFilters({ airport: iataCode })
  }

  function handlePackageGroupSelect(id: string) {
    setSelectedPackageGroup(id)
    updateFilters({ packageGroup: id })
  }

  function handleNightsSelect(nights: number | null) {
    setSelectedNights(nights)
    setSelectedDate(null)
    setFlexibleCheckout(null)
    setFlexiblePhase('idle')
    updateFilters({ nights })
  }

  /* ── Date selection state ── */
  const [selectedDate, setSelectedDate] = useState<string | null>(payload.selectedDate ?? null)

  // Flexible mode: two-phase selection
  type FlexiblePhase = 'idle' | 'checkin-selected' | 'complete'
  const [flexiblePhase, setFlexiblePhase] = useState<FlexiblePhase>('idle')
  const [flexibleCheckout, setFlexibleCheckout] = useState<string | null>(null)

  /* ── Repricing on date select ── */
  const [repricing, setRepricing] = useState(false)

  async function triggerReprice(date: string, nights: number) {
    setRepricing(true)
    try {
      await actions.selectDate({
        selectedDate: date,
        nights,
        airport: selectedAirport || undefined,
        packageGroup: selectedPackageGroup || undefined,
      })
    } finally {
      setRepricing(false)
    }
  }

  /* ── Calendar view state ── */
  const firstAvailable = useMemo(() => {
    if (calendar.dates.length > 0) {
      return parseDate(calendar.dates[0].date)
    }
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth(), day: 1 }
  }, [calendar.dates])

  const [viewYear, setViewYear] = useState(firstAvailable.year)
  const [viewMonth, setViewMonth] = useState(firstAvailable.month)

  useEffect(() => {
    if (calendar.dates.length > 0) {
      const first = parseDate(calendar.dates[0].date)
      setViewYear(first.year)
      setViewMonth(first.month)
    }
  }, [calendar.dates])

  /* ── Calendar date lookup map ── */
  const dateMap = useMemo(() => {
    const map = new Map<string, CalendarDate>()
    for (const d of calendar.dates) {
      map.set(d.date, d)
    }
    return map
  }, [calendar.dates])

  /* ── Flexible mode: compute valid checkout dates from selected start date ── */
  const validCheckoutDates = useMemo(() => {
    if (selectedNights !== null || !selectedDate) return new Map<string, NightOption>()
    const startCalDate = dateMap.get(selectedDate)
    if (!startCalDate) return new Map<string, NightOption>()

    const map = new Map<string, NightOption>()
    for (const nightOpt of startCalDate.nights) {
      if (nightOpt.nights !== null && nightOpt.nights > 0) {
        const checkoutDate = addDays(selectedDate, nightOpt.nights)
        map.set(checkoutDate, nightOpt)
      }
    }
    return map
  }, [selectedNights, selectedDate, dateMap])

  /* ── Calendar navigation ── */
  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  /* ── Calendar day cells ── */
  const calendarCells = useMemo(() => {
    const totalDays = daysInMonth(viewYear, viewMonth)
    const firstDayOffset = dayOfWeek(viewYear, viewMonth, 1)
    const cells: Array<{
      day: number | null
      dateStr: string
      calDate: CalendarDate | null
      available: boolean
      isCheckoutOption: boolean
      checkoutNightOpt: NightOption | null
    }> = []

    for (let i = 0; i < firstDayOffset; i++) {
      cells.push({ day: null, dateStr: '', calDate: null, available: false, isCheckoutOption: false, checkoutNightOpt: null })
    }

    const inCheckoutMode = selectedNights === null && flexiblePhase === 'checkin-selected' && selectedDate

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = toDateStr(viewYear, viewMonth, d)
      const calDate = dateMap.get(dateStr) ?? null
      const checkoutNightOpt = validCheckoutDates.get(dateStr) ?? null
      const isCheckoutOption = inCheckoutMode ? checkoutNightOpt !== null : false

      let available = false
      if (inCheckoutMode) {
        // In checkout selection mode: only checkout dates are clickable
        available = isCheckoutOption
      } else if (calDate && calDate.nights.length > 0) {
        if (selectedNights === null) {
          available = true
        } else {
          available = calDate.nights.some((n) => n.nights === selectedNights)
        }
      }

      cells.push({ day: d, dateStr, calDate, available, isCheckoutOption, checkoutNightOpt })
    }

    return cells
  }, [viewYear, viewMonth, dateMap, selectedNights, flexiblePhase, selectedDate, validCheckoutDates])

  /* ── Handle calendar day click ── */
  function handleDayClick(cell: typeof calendarCells[number]) {
    if (!cell.available || cell.day === null) return

    if (selectedNights !== null) {
      // Fixed nights mode: select date and immediately reprice
      setSelectedDate(cell.dateStr)
      triggerReprice(cell.dateStr, selectedNights)
    } else {
      // Flexible mode
      if (flexiblePhase === 'idle' || flexiblePhase === 'complete') {
        // First click: select check-in date
        setSelectedDate(cell.dateStr)
        setFlexibleCheckout(null)
        setFlexiblePhase('checkin-selected')
      } else if (flexiblePhase === 'checkin-selected') {
        // Second click: select checkout date
        if (cell.checkoutNightOpt && cell.checkoutNightOpt.nights) {
          setFlexibleCheckout(cell.dateStr)
          setFlexiblePhase('complete')
          triggerReprice(selectedDate!, cell.checkoutNightOpt.nights)
        }
      }
    }
  }

  function clearDateSelection() {
    setSelectedDate(null)
    setFlexibleCheckout(null)
    setFlexiblePhase('idle')
  }

  /* ── Determine effective nights for continue ── */
  const effectiveNights = useMemo<number | null>(() => {
    if (selectedNights !== null) return selectedNights
    if (selectedDate && flexibleCheckout && flexiblePhase === 'complete') {
      const opt = validCheckoutDates.get(flexibleCheckout)
      return opt?.nights ?? null
    }
    return null
  }, [selectedNights, selectedDate, flexibleCheckout, flexiblePhase, validCheckoutDates])

  const canContinue = selectedDate !== null && effectiveNights !== null && effectiveNights > 0 && !repricing

  /* ── Continue / confirm ── */
  const [confirming, setConfirming] = useState(false)

  async function handleContinue() {
    if (!canContinue || !selectedDate || effectiveNights === null) return
    setConfirming(true)
    try {
      await actions.confirmDates({
        selectedDate,
        nights: effectiveNights,
        airport: selectedAirport || undefined,
        packageGroup: selectedPackageGroup || undefined,
      })
    } catch {
      // Error handled in flow
    } finally {
      setConfirming(false)
    }
  }

  /* ── Next step label ── */
  const nextStep = steps[currentStepIndex + 1]
  const continueLabel = nextStep
    ? `Step ${currentStepIndex + 2}. ${nextStep.label}`
    : 'Continue'

  /* ── Month/year label ── */
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  /* ── Airport display name ── */
  const selectedAirportObj = calendar.departureAirports.find((a) => a.iataCode === selectedAirport)
  const airportTriggerLabel = selectedAirportObj
    ? `${selectedAirportObj.cityName} (${selectedAirportObj.iataCode})`
    : 'All airports'

  /* ── Flexible mode: price of selected start date for computing deltas ── */
  const startDatePrice = useMemo(() => {
    if (!selectedDate) return 0
    const calDate = dateMap.get(selectedDate)
    return calDate?.price ?? 0
  }, [selectedDate, dateMap])

  /* ── Render ── */
  return (
    <div className="step-panel">
      <div className="step-panel-header">
        <h2 className="step-title serif">Choose your dates</h2>
      </div>

      <div className="step-panel-content" style={{ position: 'relative' }}>
        {/* Loading overlay */}
        {(calendarLoading || repricing) && (
          <div className="loader-overlay">
            <div className="loader-spinner" />
          </div>
        )}

        {/* ── Occupancy ── */}
        <section className="dates-section">
          <label className="field-label">Travellers</label>
          {occupancyEditable ? (
            <div className="dropdown" ref={occupancyRef}>
              <button
                type="button"
                className="dropdown-trigger"
                onClick={() => setOccupancyOpen(!occupancyOpen)}
              >
                <span>{partySummary(travellers.adults, travellers.childrenAges)}</span>
                <span className={`chevron ${occupancyOpen ? 'open' : ''}`}>&#9662;</span>
              </button>

              {occupancyOpen && (
                <div className="dropdown-panel">
                  {/* Adults stepper */}
                  <div className="stepper-row">
                    <span className="stepper-label">Adults</span>
                    <div className="stepper-controls">
                      <button
                        type="button"
                        className="stepper-btn"
                        disabled={localAdults <= occupancyRules.minAdults}
                        onClick={() => setLocalAdults(Math.max(occupancyRules.minAdults, localAdults - 1))}
                      >
                        &minus;
                      </button>
                      <span className="stepper-value">{localAdults}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        disabled={localAdults >= occupancyRules.maxAdults}
                        onClick={() => setLocalAdults(Math.min(occupancyRules.maxAdults, localAdults + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Children stepper */}
                  <div className="stepper-row">
                    <span className="stepper-label">Children</span>
                    <div className="stepper-controls">
                      <button
                        type="button"
                        className="stepper-btn"
                        disabled={localChildrenAges.length <= occupancyRules.minChildren}
                        onClick={() =>
                          adjustLocalChildren(
                            Math.max(occupancyRules.minChildren, localChildrenAges.length - 1),
                          )
                        }
                      >
                        &minus;
                      </button>
                      <span className="stepper-value">{localChildrenAges.length}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        disabled={localChildrenAges.length >= occupancyRules.maxChildren}
                        onClick={() =>
                          adjustLocalChildren(
                            Math.min(occupancyRules.maxChildren, localChildrenAges.length + 1),
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Child age selectors */}
                  {localChildrenAges.length > 0 && (
                    <div className="child-ages">
                      {localChildrenAges.map((age, idx) => {
                        const minAge = occupancyRules.minChildAge ?? 0
                        const maxAge = occupancyRules.maxChildAge ?? 17
                        return (
                          <div key={idx} className="child-age-row">
                            <label className="child-age-label">Child {idx + 1} age</label>
                            <select
                              className="child-age-select"
                              value={age}
                              onChange={(e) => {
                                const updated = [...localChildrenAges]
                                updated[idx] = parseInt(e.target.value, 10)
                                setLocalChildrenAges(updated)
                              }}
                            >
                              {Array.from({ length: maxAge - minAge + 1 }, (_, i) => minAge + i).map(
                                (a) => (
                                  <option key={a} value={a}>
                                    {a}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={handleApplyOccupancy}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="field-readonly">
              {partySummary(travellers.adults, travellers.childrenAges)}
            </div>
          )}
        </section>

        {/* ── Airport filter ── */}
        {calendar.departureAirports.length > 0 && (
          <section className="dates-section">
            <label className="field-label">Departure airport</label>
            <div className="dropdown" ref={airportRef}>
              <button
                type="button"
                className="dropdown-trigger"
                onClick={() => setAirportDropdownOpen(!airportDropdownOpen)}
              >
                <span>{airportTriggerLabel}</span>
                <span className={`chevron ${airportDropdownOpen ? 'open' : ''}`}>&#9662;</span>
              </button>

              {airportDropdownOpen && (
                <div className="dropdown-panel">
                  {calendar.departureAirports.map((airport) => (
                    <button
                      key={airport.iataCode}
                      type="button"
                      className={`dropdown-option ${selectedAirport === airport.iataCode ? 'selected' : ''}`}
                      onClick={() => handleAirportSelect(airport.iataCode)}
                    >
                      <span>
                        {airport.cityName} ({airport.iataCode})
                      </span>
                      {airport.price !== 0 && (
                        <span className="option-price">{formatPrice(airport.price)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Package group selector ── */}
        {calendar.packageGroups.length > 0 && (
          <section className="dates-section">
            <label className="field-label">Package</label>
            <div className="package-cards">
              {calendar.packageGroups.map((pg) => (
                <button
                  key={pg.id}
                  type="button"
                  className={`package-card ${selectedPackageGroup === pg.id ? 'selected' : ''}`}
                  onClick={() => handlePackageGroupSelect(pg.id)}
                >
                  <div className="package-card-name">{pg.name}</div>
                  {pg.description && (
                    <div className="package-card-desc">
                      {pg.description.length > 80
                        ? `${pg.description.slice(0, 80)}...`
                        : pg.description}
                    </div>
                  )}
                  <div className="package-card-price">{formatPrice(pg.price)}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Nights filter ── */}
        {calendar.nights.length > 0 && (
          <section className="dates-section">
            <label className="field-label">Duration</label>
            <div className="chip-row">
              {calendar.nights.map((opt) => (
                <button
                  key={opt.nights === null ? 'flexible' : opt.nights}
                  type="button"
                  className={`chip ${selectedNights === opt.nights ? 'selected' : ''}`}
                  onClick={() => handleNightsSelect(opt.nights)}
                >
                  <span className="chip-label">
                    {opt.nights === null ? 'All nights' : `${opt.nights} nights`}
                  </span>
                  {opt.price !== 0 && (
                    <span className="chip-price">{formatPrice(opt.price)}</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Calendar ── */}
        <section className="dates-section">
          <div className="calendar">
            <div className="calendar-header">
              <button
                type="button"
                className="calendar-nav"
                onClick={prevMonth}
                aria-label="Previous month"
              >
                &#8249;
              </button>
              <span className="calendar-month-label">{monthLabel}</span>
              <button
                type="button"
                className="calendar-nav"
                onClick={nextMonth}
                aria-label="Next month"
              >
                &#8250;
              </button>
            </div>

            <div className="calendar-grid">
              {DAY_LABELS.map((label) => (
                <div key={label} className="calendar-day-label">
                  {label}
                </div>
              ))}

              {calendarCells.map((cell, idx) => {
                if (cell.day === null) {
                  return <div key={`empty-${idx}`} className="calendar-day empty" />
                }

                const isCheckinSelected = selectedDate === cell.dateStr
                const isCheckoutSelected = flexibleCheckout === cell.dateStr
                const inCheckoutMode = selectedNights === null && flexiblePhase === 'checkin-selected'

                let className = 'calendar-day'
                if (cell.available) {
                  className += ' available'
                  if (cell.isCheckoutOption) className += ' checkout-option'
                } else if (inCheckoutMode && !cell.isCheckoutOption && cell.dateStr !== selectedDate) {
                  className += ' greyed'
                } else if (cell.calDate) {
                  className += ' unavailable'
                } else {
                  className += ' unavailable'
                }
                if (isCheckinSelected) className += ' selected'
                if (isCheckoutSelected) className += ' selected'

                // Determine price to show
                let displayPrice: number | null = null
                if (inCheckoutMode && cell.isCheckoutOption && cell.checkoutNightOpt) {
                  // Show delta relative to start date price
                  const delta = cell.checkoutNightOpt.price - startDatePrice
                  displayPrice = delta
                } else if (cell.calDate) {
                  if (selectedNights !== null) {
                    const nightOpt = cell.calDate.nights.find((n) => n.nights === selectedNights)
                    displayPrice = nightOpt ? nightOpt.price : cell.calDate.price
                  } else {
                    displayPrice = cell.calDate.price
                  }
                }

                // Tooltip for flexible mode
                let tooltip: string | undefined
                if (selectedNights === null) {
                  if (isCheckinSelected && (flexiblePhase === 'checkin-selected' || flexiblePhase === 'complete')) {
                    tooltip = 'Check-in'
                  } else if (inCheckoutMode && cell.isCheckoutOption) {
                    tooltip = 'Check-out'
                  } else if (isCheckoutSelected && flexiblePhase === 'complete') {
                    tooltip = 'Check-out'
                  }
                }

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    className={className}
                    disabled={!cell.available && cell.dateStr !== selectedDate}
                    onClick={() => handleDayClick(cell)}
                    title={tooltip}
                  >
                    {tooltip && <span className="calendar-day-tooltip">{tooltip}</span>}
                    <span className="calendar-day-number">{cell.day}</span>
                    {displayPrice !== null && displayPrice !== 0 && (
                      <span className="calendar-day-price">
                        {inCheckoutMode && cell.isCheckoutOption
                          ? (displayPrice >= 0 ? '+' : '') + formatPrice(displayPrice)
                          : formatPrice(displayPrice)
                        }
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Flexible mode: clear selection link */}
            {selectedNights === null && selectedDate && (
              <div className="calendar-footer">
                <button
                  type="button"
                  className="link-button"
                  onClick={clearDateSelection}
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Actions ── */}
      <div className="step-panel-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={!canContinue || confirming}
          onClick={handleContinue}
        >
          {confirming ? 'Loading...' : continueLabel}
        </button>
      </div>
    </div>
  )
}
