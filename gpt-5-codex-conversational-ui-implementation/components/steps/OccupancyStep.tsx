'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useBooking } from '@/lib/booking/context'
import { formatPrice, formatPriceDelta } from '@/lib/utils/price'
import { DropdownField, DropdownPanelField, getNextStepLabel, OptionCard, StepFooter, StepShell } from '@/components/steps/shared'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toMonthKey(value: string) {
  return value.slice(0, 7)
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function dayNumber(value: string) {
  return Number(value.slice(8, 10))
}

function parseDateParts(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return { year, month, day }
}

function weekdayIndex(value: string) {
  const { year, month, day } = parseDateParts(value)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return weekday === 0 ? 6 : weekday - 1
}

function formatUtcDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysBetween(start: string, end: string) {
  const startParts = parseDateParts(start)
  const endParts = parseDateParts(end)
  const startUtc = Date.UTC(startParts.year, startParts.month - 1, startParts.day)
  const endUtc = Date.UTC(endParts.year, endParts.month - 1, endParts.day)
  return Math.round((endUtc - startUtc) / 86400000)
}

function addDays(value: string, nights: number) {
  const { year, month, day } = parseDateParts(value)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + nights)
  return formatUtcDate(date)
}

function compareDateStrings(left: string, right: string) {
  return left.localeCompare(right)
}

function isDateBetween(value: string, start: string, end: string) {
  return compareDateStrings(value, start) > 0 && compareDateStrings(value, end) < 0
}

function sameDate(left: string | undefined, right: string | undefined) {
  return Boolean(left && right && left === right)
}

export function OccupancyStep() {
  const {
    state: { offerMeta, payload, currentStepIndex, calendar, receipt, travellers, steps },
    actions,
  } = useBooking()

  const rules = offerMeta.occupancyRules
  const [adults, setAdults] = useState(travellers.adults || Math.max(rules.minAdults || 0, 2))
  const [childrenAges, setChildrenAges] = useState<number[]>(travellers.childrenAges)
  const [draftAdults, setDraftAdults] = useState(travellers.adults || Math.max(rules.minAdults || 0, 2))
  const [draftChildrenAges, setDraftChildrenAges] = useState<number[]>(travellers.childrenAges)
  const [occupancyOpen, setOccupancyOpen] = useState(false)
  const [airport, setAirport] = useState(payload.departureAirports?.[0] ?? calendar.departureAirports[0]?.iataCode ?? '')
  const [packageGroup, setPackageGroup] = useState(payload.packageGroup ?? calendar.packageGroups[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState(payload.selectedDate ?? '')
  const [nightFilter, setNightFilter] = useState<number | null>(payload.nights ?? null)
  const [selectedNights, setSelectedNights] = useState<number | null>(payload.nights ?? null)
  const [pendingStartDate, setPendingStartDate] = useState('')
  const [stepBusy, setStepBusy] = useState(false)

  const minChildAge = rules.minChildAge ?? 2
  const maxChildAge = rules.maxChildAge ?? 17
  const totalPeople = adults + childrenAges.length
  const occupancySummary = `${adults} adult${adults === 1 ? '' : 's'}${childrenAges.length ? `, ${childrenAges.length} child${childrenAges.length === 1 ? '' : 'ren'}` : ''}`
  const canAdjustAdults = rules.minAdults < rules.maxAdults
  const canAdjustChildren = (rules.maxChildren ?? 0) > (rules.minChildren ?? 0)
  const hasEditableOccupancy = canAdjustAdults || canAdjustChildren
  const draftTotalPeople = draftAdults + draftChildrenAges.length
  const withinBounds =
    adults >= rules.minAdults &&
    adults <= rules.maxAdults &&
    childrenAges.length >= (rules.minChildren ?? 0) &&
    childrenAges.length <= (rules.maxChildren ?? childrenAges.length) &&
    totalPeople >= (rules.minSelectablePeople ?? rules.minPeople) &&
    totalPeople <= (rules.maxSelectablePeople ?? rules.maxPeople)
  const draftWithinBounds =
    draftAdults >= rules.minAdults &&
    draftAdults <= rules.maxAdults &&
    draftChildrenAges.length >= (rules.minChildren ?? 0) &&
    draftChildrenAges.length <= (rules.maxChildren ?? draftChildrenAges.length) &&
    draftTotalPeople >= (rules.minSelectablePeople ?? rules.minPeople) &&
    draftTotalPeople <= (rules.maxSelectablePeople ?? rules.maxPeople)
  const occupancyChanged =
    draftAdults !== adults ||
    draftChildrenAges.length !== childrenAges.length ||
    draftChildrenAges.some((age, index) => age !== childrenAges[index])

  const availableMonthKeys = useMemo(
    () => Array.from(new Set(calendar.dates.map((date) => toMonthKey(date.date)))).sort(),
    [calendar.dates],
  )
  const [visibleMonth, setVisibleMonth] = useState(
    toMonthKey(payload.selectedDate ?? calendar.dates[0]?.date ?? availableMonthKeys[0] ?? ''),
  )
  const activeDate = useMemo(
    () => calendar.dates.find((date) => date.date === selectedDate) ?? calendar.dates[0],
    [calendar.dates, selectedDate],
  )
  const pendingStart = useMemo(
    () => calendar.dates.find((date) => date.date === pendingStartDate),
    [calendar.dates, pendingStartDate],
  )
  const monthDates = useMemo(
    () => calendar.dates.filter((date) => toMonthKey(date.date) === visibleMonth),
    [calendar.dates, visibleMonth],
  )
  const flexibleNightOptions = pendingStart?.nights ?? []
  const flexibleNightOptionMap = useMemo(
    () => new Map(flexibleNightOptions.map((night) => [night.nights, night.price])),
    [flexibleNightOptions],
  )
  const firstDate = monthDates[0]
  const leadingEmptyDays = firstDate ? weekdayIndex(firstDate.date) : 0
  const daysInMonth = firstDate
    ? new Date(Number(visibleMonth.slice(0, 4)), Number(visibleMonth.slice(5, 7)), 0).getDate()
    : 0
  const monthDateByDay = useMemo(() => {
    const entries = new Map<number, (typeof monthDates)[number]>()
    monthDates.forEach((date) => entries.set(dayNumber(date.date), date))
    return entries
  }, [monthDates])
  const visibleMonthIndex = availableMonthKeys.indexOf(visibleMonth)
  const selectedEndDate = useMemo(
    () => (selectedDate && selectedNights != null ? addDays(selectedDate, selectedNights) : ''),
    [selectedDate, selectedNights],
  )
  const hasReceiptErrors = Boolean(receipt?.errors.length)
  const hasValidSelectionReceipt =
    receipt != null &&
    !hasReceiptErrors &&
    receipt.startDate === selectedDate &&
    (receipt.nights ?? selectedNights) === selectedNights
  const isFlexibleCheckoutMode = nightFilter == null && Boolean(pendingStartDate)
  const showFlexibleClearSelection = nightFilter == null && Boolean(pendingStartDate || (selectedDate && selectedNights != null))

  useEffect(() => {
    if (!availableMonthKeys.includes(visibleMonth)) {
      setVisibleMonth(availableMonthKeys[0] ?? '')
    }
  }, [availableMonthKeys, visibleMonth])

  useEffect(() => {
    setAdults(travellers.adults)
    setChildrenAges(travellers.childrenAges)
    setDraftAdults(travellers.adults)
    setDraftChildrenAges(travellers.childrenAges)
  }, [travellers])

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(toMonthKey(selectedDate))
    }
  }, [selectedDate])

  useEffect(() => {
    setAirport(payload.departureAirports?.[0] ?? calendar.departureAirports[0]?.iataCode ?? '')
    setPackageGroup(payload.packageGroup ?? calendar.packageGroups[0]?.id ?? '')
    setSelectedDate(payload.selectedDate ?? '')
    setNightFilter(payload.nights ?? null)
    setSelectedNights(payload.nights ?? null)
  }, [calendar.departureAirports, calendar.packageGroups, payload.departureAirports, payload.nights, payload.packageGroup, payload.selectedDate])

  useEffect(() => {
    if (calendar.nights.length === 1 && nightFilter == null) {
      setNightFilter(calendar.nights[0].nights)
    }
  }, [calendar.nights, nightFilter])

  async function runWithStepLoading(task: () => Promise<void>) {
    setStepBusy(true)
    try {
      await task()
    } finally {
      setStepBusy(false)
    }
  }

  async function applyOccupancy(nextAdults: number, nextChildrenAges: number[]) {
    await runWithStepLoading(async () => {
      await actions.confirmOccupancy(nextAdults, nextChildrenAges)
      setPendingStartDate('')
      if (selectedDate && selectedNights != null) {
        await actions.refreshCurrentReceipt()
      }
    })
  }

  async function submitOccupancy() {
    if (!draftWithinBounds) {
      return
    }

    setAdults(draftAdults)
    setChildrenAges(draftChildrenAges)
    setOccupancyOpen(false)
    await applyOccupancy(draftAdults, draftChildrenAges)
  }

  async function applyCalendarFilters(filters: { airport?: string; packageGroup?: string; nights?: number | null }) {
    await runWithStepLoading(async () => {
      await actions.updateCalendarFilters(filters)
      setPendingStartDate('')
    })
  }

  async function previewReceiptForSelection(nextDate: string, nextNights: number) {
    const nextReceipt = await actions.previewCalendarSelection({
      selectedDate: nextDate,
      nights: nextNights,
      airport,
      packageGroup,
    })
    if (nextReceipt && nextReceipt.errors.length === 0) {
      setSelectedDate(nextDate)
      setSelectedNights(nextNights)
    } else {
      setSelectedDate('')
      setSelectedNights(nightFilter)
    }
  }

  function clearFlexibleSelection() {
    setPendingStartDate('')
    setSelectedDate('')
    setSelectedNights(null)
  }

  function handleCalendarWhitespaceClick(event: MouseEvent<HTMLDivElement>) {
    if (!isFlexibleCheckoutMode) {
      return
    }

    const target = event.target as HTMLElement
    if (
      target.closest('.calendar-day') ||
      target.closest('.calendar-header') ||
      target.closest('.calendar-weekdays') ||
      target.closest('.calendar-mode-banner')
    ) {
      return
    }

    clearFlexibleSelection()
  }

  return (
    <StepShell
      eyebrow={`Step ${currentStepIndex + 1}`}
      title="Travellers and dates"
    >
      <div className={`first-step-content${stepBusy ? ' is-busy' : ''}`}>
        <div className="step-section">
          <h3 className="section-heading">Who's travelling?</h3>
          {hasEditableOccupancy ? (
            <DropdownPanelField
              ariaLabel="Travellers"
              disabled={stepBusy}
              open={occupancyOpen}
              onOpenChange={(nextOpen) => {
                if (nextOpen) {
                  setDraftAdults(adults)
                  setDraftChildrenAges(childrenAges)
                }
                setOccupancyOpen(nextOpen)
              }}
              triggerLabel={occupancySummary}
            >
            <div className="occupancy-panel">
            <div className="occupancy-grid">
              {canAdjustAdults ? (
                <div className="counter-card">
                  <div className="counter-copy">
                    <strong>Adults</strong>
                    <span>Aged 18 and above</span>
                  </div>
                  <div className="counter-controls">
                    <button
                      className="counter-button"
                      disabled={stepBusy || draftAdults <= rules.minAdults}
                      onClick={() => {
                        setDraftAdults((value) => value - 1)
                      }}
                      type="button"
                    >
                      −
                    </button>
                    <strong>{draftAdults}</strong>
                    <button
                      className="counter-button"
                      disabled={stepBusy || draftAdults >= rules.maxAdults}
                      onClick={() => {
                        setDraftAdults((value) => value + 1)
                      }}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : null}

              {canAdjustChildren ? (
                <div className="counter-card">
                  <div className="counter-copy">
                    <strong>Children</strong>
                    <span>Aged {rules.minChildAge ?? 0} - {rules.maxChildAge ?? 17}</span>
                  </div>
                  <div className="counter-controls">
                    <button
                      className="counter-button"
                      disabled={stepBusy || draftChildrenAges.length <= (rules.minChildren ?? 0)}
                      onClick={() => {
                        setDraftChildrenAges((value) => value.slice(0, -1))
                      }}
                      type="button"
                    >
                      −
                    </button>
                    <strong>{draftChildrenAges.length}</strong>
                    <button
                      className="counter-button"
                      disabled={stepBusy || draftChildrenAges.length >= (rules.maxChildren ?? 0)}
                      onClick={() => {
                        setDraftChildrenAges((value) => [...value, minChildAge])
                      }}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {draftChildrenAges.length ? (
              <div className="field-grid occupancy-child-ages">
                {draftChildrenAges.map((age, index) => (
                  <label className="field occupancy-child-field" key={`child-${index}`}>
                    <span>Child {index + 1} age</span>
                    <select
                      disabled={stepBusy}
                      value={age}
                      onChange={(event) => {
                        const nextChildrenAges = draftChildrenAges.map((item, itemIndex) =>
                          itemIndex === index ? Number(event.target.value) : item,
                        )
                        setDraftChildrenAges(nextChildrenAges)
                      }}
                    >
                      {Array.from({ length: maxChildAge - minChildAge + 1 }, (_, offset) => minChildAge + offset).map(
                        (value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
            <div className="occupancy-actions">
              <button
                className="button button-secondary"
                onClick={() => {
                  setDraftAdults(adults)
                  setDraftChildrenAges(childrenAges)
                  setOccupancyOpen(false)
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={stepBusy || !draftWithinBounds || !occupancyChanged}
                onClick={() => {
                  void submitOccupancy()
                }}
                type="button"
              >
                Update travellers
              </button>
            </div>
            </div>
            </DropdownPanelField>
          ) : (
            <div className="field occupancy-summary-field">
              <span>{occupancySummary}</span>
            </div>
          )}
        </div>

        {offerMeta.selectDate !== false ? (
          <>
            {calendar.departureAirports.length ? (
              <div className="step-section">
                <h3 className="section-heading">Departure airport</h3>
                <DropdownField
                  ariaLabel="Departure airport"
                  disabled={stepBusy}
                  options={calendar.departureAirports.map((item) => ({
                    value: item.iataCode,
                    label: `${item.cityName} · ${item.iataCode} · ${formatPrice(item.price)}`,
                  }))}
                  value={airport}
                  onChange={async (nextAirport) => {
                    setAirport(nextAirport)
                    setSelectedDate('')
                    await applyCalendarFilters({ airport: nextAirport })
                  }}
                />
              </div>
            ) : null}

            {calendar.packageGroups.length ? (
              <div className="step-section">
                <h3 className="section-heading">Package</h3>
                <div className="package-group-list" role="list">
                  {calendar.packageGroups.map((group) => (
                    <OptionCard
                      className="package-group-card"
                      key={group.id}
                      onClick={() => {
                        if (stepBusy || packageGroup === group.id) {
                          return
                        }
                        setPackageGroup(group.id)
                        setSelectedDate('')
                        void applyCalendarFilters({ packageGroup: group.id })
                      }}
                      selected={packageGroup === group.id}
                    >
                      <div className="package-group-card-header">
                        <strong>{group.name}</strong>
                        <span className="package-group-card-price">{formatPrice(group.price)}</span>
                      </div>
                      {group.description ? (
                        <p className="package-group-card-description">{group.description}</p>
                      ) : null}
                    </OptionCard>
                  ))}
                </div>
              </div>
            ) : null}

            {calendar.nights.length ? (
              <div className="step-section">
                <h3 className="section-heading">Nights</h3>
                <DropdownField
                  ariaLabel="Nights"
                  disabled={stepBusy}
                  options={calendar.nights.map((night) => ({
                    value: night.nights == null ? 'flexible' : String(night.nights),
                    label:
                      night.nights == null
                        ? `Flexible dates · ${formatPrice(night.price)}`
                        : `${night.nights} nights · ${formatPrice(night.price)}`,
                  }))}
                  value={nightFilter == null ? 'flexible' : String(nightFilter)}
                  onChange={async (rawValue) => {
                    const nextNights = rawValue === 'flexible' ? null : Number(rawValue)
                    setNightFilter(nextNights)
                    setSelectedNights(nextNights)
                    setSelectedDate('')
                    setPendingStartDate('')
                    await applyCalendarFilters({ nights: nextNights })
                  }}
                />
              </div>
            ) : null}

            <div className="step-section">
              <h3 className="section-heading">Dates</h3>
              <div className="calendar-panel" onClick={handleCalendarWhitespaceClick}>
                <div className="calendar-header">
                  <button
                    className="calendar-nav"
                    disabled={stepBusy || visibleMonthIndex <= 0}
                    onClick={() =>
                      setVisibleMonth(availableMonthKeys[Math.max(0, visibleMonthIndex - 1)] ?? visibleMonth)
                    }
                    type="button"
                  >
                    <span aria-hidden="true">‹</span>
                  </button>
                  <strong>{visibleMonth ? monthLabel(`${visibleMonth}-01`) : 'No dates'}</strong>
                  <button
                    className="calendar-nav"
                    disabled={stepBusy || visibleMonthIndex === -1 || visibleMonthIndex >= availableMonthKeys.length - 1}
                    onClick={() =>
                      setVisibleMonth(
                        availableMonthKeys[Math.min(availableMonthKeys.length - 1, visibleMonthIndex + 1)] ?? visibleMonth,
                      )
                    }
                    type="button"
                  >
                    <span aria-hidden="true">›</span>
                  </button>
                </div>

                <div className="calendar-weekdays">
                  {WEEKDAYS.map((weekday) => (
                    <span key={weekday}>{weekday}</span>
                  ))}
                </div>

                <div className="calendar-grid">
                  {Array.from({ length: leadingEmptyDays }).map((_, index) => (
                    <div className="calendar-day is-empty" key={`empty-${index}`} />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1
                    const date = monthDateByDay.get(day)
                    const unavailable = !date || !date.nights.length || (date.quantity ?? 1) <= 0
                    const isFlexibleMode = nightFilter == null
                    const diffNights = date && pendingStart ? daysBetween(pendingStart.date, date.date) : 0
                    const candidatePrice = diffNights > 0 ? flexibleNightOptionMap.get(diffNights) : undefined
                    const canEndRange = Boolean(
                      isFlexibleMode &&
                        pendingStart &&
                        date &&
                        diffNights > 0 &&
                        flexibleNightOptionMap.has(diffNights),
                    )
                    const muteForFlexibleCheckoutMode = Boolean(
                      isFlexibleMode &&
                        pendingStart &&
                        date &&
                        !sameDate(pendingStartDate, date.date) &&
                        !canEndRange,
                    )
                    const isPendingStart = sameDate(pendingStartDate, date?.date)
                    const isSelectedStart = sameDate(selectedDate, date?.date)
                    const isSelectedEnd = sameDate(selectedEndDate, date?.date)
                    const isInsideSelectedStay = Boolean(
                      date &&
                        selectedDate &&
                        selectedEndDate &&
                        isDateBetween(date.date, selectedDate, selectedEndDate),
                    )
                    const tooltipLabel = isFlexibleMode
                      ? isPendingStart
                        ? 'Check-in'
                        : canEndRange
                          ? 'Check-out'
                          : undefined
                      : isSelectedStart
                        ? 'Check-in'
                        : isSelectedEnd
                          ? 'Check-out'
                          : undefined

                    return (
                      <button
                        aria-label={tooltipLabel ? `${date?.date} ${tooltipLabel}` : undefined}
                        className={`calendar-day${isSelectedStart ? ' is-selected' : ''}${unavailable ? ' is-unavailable' : ''}${isPendingStart ? ' is-range-start' : ''}${canEndRange ? ' is-range-end-candidate' : ''}${isSelectedEnd ? ' is-range-end' : ''}${isInsideSelectedStay ? ' is-in-selected-range' : ''}${muteForFlexibleCheckoutMode ? ' is-muted-in-flex-range' : ''}${tooltipLabel ? ' has-tooltip' : ''}${isPendingStart && isFlexibleMode ? ' is-tooltip-visible' : ''}`}
                        data-tooltip={tooltipLabel}
                        disabled={stepBusy || unavailable || muteForFlexibleCheckoutMode}
                        key={`${visibleMonth}-${day}`}
                        onClick={async () => {
                          if (!date) return
                          if (isFlexibleMode) {
                            if (
                              !pendingStart ||
                              sameDate(pendingStartDate, date.date) ||
                              diffNights <= 0 ||
                              !canEndRange
                            ) {
                              if (sameDate(pendingStartDate, date.date)) {
                                clearFlexibleSelection()
                                return
                              }

                              setPendingStartDate(date.date)
                              setSelectedDate('')
                              setSelectedNights(null)
                              return
                            }

                            await previewReceiptForSelection(pendingStart.date, diffNights)
                            setPendingStartDate('')
                            return
                          }

                          setPendingStartDate('')
                          if (selectedNights == null) {
                            return
                          }
                          await previewReceiptForSelection(date.date, selectedNights)
                        }}
                        type="button"
                      >
                        <strong>{day}</strong>
                        <span>
                          {date
                            ? isFlexibleMode && pendingStart && canEndRange && typeof candidatePrice === 'number'
                              ? formatPriceDelta(candidatePrice, pendingStart.price, '+£0')
                              : formatPrice(date.price)
                            : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {showFlexibleClearSelection ? (
                  <div className="calendar-selection-actions">
                    <button
                      className="link-button"
                      disabled={stepBusy}
                      onClick={() => {
                        clearFlexibleSelection()
                      }}
                      type="button"
                    >
                      Clear selection
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

          </>
        ) : null}

        {stepBusy ? (
          <div className="first-step-overlay" aria-live="polite" aria-busy="true">
            <div className="first-step-spinner" />
            <span>Updating availability and pricing…</span>
          </div>
        ) : null}
      </div>

      <StepFooter
        canGoBack={false}
        canContinue={offerMeta.selectDate === false ? withinBounds : Boolean(withinBounds && selectedDate && selectedNights != null && hasValidSelectionReceipt)}
        continueLabel={getNextStepLabel(steps, currentStepIndex)}
        onContinue={() => {
          if (offerMeta.selectDate === false || selectedNights == null) {
            return
          }
          void actions.confirmCalendar({
            selectedDate,
            nights: selectedNights,
            airport,
            packageGroup,
          })
        }}
      />
    </StepShell>
  )
}
