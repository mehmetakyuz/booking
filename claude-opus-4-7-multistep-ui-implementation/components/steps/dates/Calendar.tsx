'use client'

import { useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { formatMoney, formatDelta } from '@/lib/booking/format'
import { Spinner } from '@/components/ui/Spinner'
import type { CalendarDate } from '@/lib/booking/types'

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function Calendar() {
  const { state, actions } = useBooking()
  const cal = state.calendar
  const payload = state.payload
  const isFlexible = payload.nights === null

  const availableByDate = useMemo(() => {
    const map = new Map<string, CalendarDate>()
    for (const d of cal?.dates ?? []) map.set(d.date, d)
    return map
  }, [cal])

  const [cursor, setCursor] = useState<Date>(() => {
    if (payload.selectedDate) return startOfMonth(new Date(payload.selectedDate))
    if (cal?.minDate) return startOfMonth(new Date(cal.minDate))
    const first = cal?.dates?.[0]?.date
    return first ? startOfMonth(new Date(first)) : startOfMonth(new Date())
  })

  const startPicked = payload.selectedDate
    ? availableByDate.get(payload.selectedDate) ?? null
    : null
  const startPickedDate = startPicked ? new Date(startPicked.date) : null
  const [checkoutMode, setCheckoutMode] = useState(false)

  const validCheckoutMap = useMemo(() => {
    if (!isFlexible || !startPicked) return new Map<string, { nights: number; delta: number }>()
    const base = startPicked.price ?? 0
    const map = new Map<string, { nights: number; delta: number }>()
    for (const nentry of startPicked.nights ?? []) {
      const co = new Date(startPicked.date)
      co.setDate(co.getDate() + nentry.nights)
      map.set(ymd(co), { nights: nentry.nights, delta: nentry.price - base })
    }
    return map
  }, [isFlexible, startPicked])

  const days = useMemo(() => {
    const first = startOfMonth(cursor)
    const startDay = new Date(first)
    const weekday = (startDay.getDay() + 6) % 7
    startDay.setDate(startDay.getDate() - weekday)
    const cells: { date: Date; inMonth: boolean }[] = []
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(startDay)
      d.setDate(startDay.getDate() + i)
      cells.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() })
    }
    return cells
  }, [cursor])

  const monthLabel = cursor.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const loading = state.async.calendarLoading
  const isRepricing = state.async.receiptLoading && payload.selectedDate != null

  function handleDateClick(date: Date) {
    const key = ymd(date)
    const av = availableByDate.get(key)
    if (!av) {
      if (isFlexible && checkoutMode) {
        setCheckoutMode(false)
      }
      return
    }
    if (isFlexible) {
      if (!startPicked || !checkoutMode) {
        // pick start date
        actions.patch({ selectedDate: key, nights: null })
        setCheckoutMode(true)
      } else {
        const info = validCheckoutMap.get(key)
        if (!info) return
        // pick checkout date; commit nights from the matching entry
        actions.selectStay(startPicked.date, info.nights)
        setCheckoutMode(false)
      }
    } else {
      actions.selectStay(key, payload.nights ?? null)
    }
  }

  function clearFlexibleSelection() {
    actions.patch({ selectedDate: undefined })
    setCheckoutMode(false)
  }

  return (
    <div className={'calendar' + (loading ? ' calendar--loading' : '')}>
      <div className="calendar-nav" role="group" aria-label="Month navigation">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setCursor((c) => addMonths(c, -1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="calendar-month-label">{monthLabel}</span>
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="calendar-weekdays">
        {weekdayLabels.map((w) => (
          <span key={w} className="calendar-weekday">
            {w}
          </span>
        ))}
      </div>
      <div className="calendar-grid" role="grid">
        {days.map(({ date, inMonth }, i) => {
          const key = ymd(date)
          const av = availableByDate.get(key)
          const isStart = startPickedDate && sameDay(startPickedDate, date)
          const isCheckout =
            isFlexible && checkoutMode && validCheckoutMap.has(key) && !isStart
          const isAvailable = !!av && (!isFlexible || !checkoutMode || isCheckout || isStart)
          const greyed = !inMonth || !av || (isFlexible && checkoutMode && !isCheckout && !isStart)
          const coInfo = isCheckout ? validCheckoutMap.get(key) : null
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={
                'calendar-day' +
                (greyed ? ' calendar-day--muted' : '') +
                (isStart ? ' calendar-day--start' : '') +
                (isCheckout ? ' calendar-day--checkout' : '') +
                (!isAvailable ? ' calendar-day--unavailable' : '')
              }
              aria-pressed={!!isStart}
              aria-label={`${date.toDateString()}${av?.price ? ` ${formatMoney(av.price)}` : ''}`}
              disabled={!isAvailable}
              onClick={() => handleDateClick(date)}
              title={isStart ? 'Check-in' : isCheckout ? 'Check-out' : undefined}
            >
              <span className="calendar-day-num">{date.getDate()}</span>
              {av?.price != null && !isCheckout ? (
                <span className="calendar-day-price">{formatMoney(av.price)}</span>
              ) : null}
              {coInfo ? (
                <span className="calendar-day-price">{formatDelta(coInfo.delta)}</span>
              ) : null}
              {isStart ? <span className="calendar-day-tooltip">Check-in</span> : null}
            </button>
          )
        })}
      </div>
      {loading ? (
        <div className="calendar-loading-overlay" aria-live="polite">
          <Spinner size={28} />
        </div>
      ) : null}
      <div className="calendar-footer">
        {isFlexible && (startPicked || checkoutMode) ? (
          <button type="button" className="link-button" onClick={clearFlexibleSelection}>
            Clear selection
          </button>
        ) : null}
        {isRepricing ? <Spinner size={16} label="Updating price…" /> : null}
      </div>
    </div>
  )
}
