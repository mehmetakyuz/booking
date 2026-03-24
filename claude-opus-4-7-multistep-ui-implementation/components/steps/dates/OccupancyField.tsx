'use client'

import { useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { Dropdown } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/Button'

export function OccupancyField() {
  const { state, actions } = useBooking()
  const rules = state.payload.offerMeta?.occupancyRules
  const editable = !!rules && rules.minPeople !== rules.maxPeople
  const current = state.payload

  const childAges = useMemo(() => {
    return current.people
      .map((p) => (p as any)?.age)
      .filter((v): v is number => typeof v === 'number')
  }, [current.people])
  const adults = current.people.length - childAges.length
  const children = childAges

  const summary = (() => {
    const parts = [`${adults} adult${adults === 1 ? '' : 's'}`]
    const kids = childAges.length
    if (kids) parts.push(`${kids} child${kids === 1 ? '' : 'ren'}`)
    return parts.join(' · ')
  })()

  if (!editable) {
    return <div className="field-readonly">{summary}</div>
  }

  return (
    <Dropdown label="Travellers" summary={summary} width={320}>
      {(close) => (
        <OccupancyPanel
          initialAdults={adults}
          initialChildAges={childAges}
          rules={rules!}
          onSubmit={(adultsN, agesN) => {
            const people: any[] = []
            for (let i = 0; i < adultsN; i += 1) people.push({})
            for (let j = 0; j < agesN.length; j += 1) people.push({ age: agesN[j] })
            const groups = [{ people: people.map((_, i) => i) }]
            close()
            actions.refreshFirstStep(
              { people, groups },
              { reprice: state.payload.selectedDate !== undefined && state.payload.nights != null },
            )
          }}
        />
      )}
    </Dropdown>
  )
}

function OccupancyPanel({
  initialAdults,
  initialChildAges,
  rules,
  onSubmit,
}: {
  initialAdults: number
  initialChildAges: number[]
  rules: NonNullable<ReturnType<typeof useBooking>['state']['payload']['offerMeta']>['occupancyRules']
  onSubmit: (adults: number, childAges: number[]) => void
}) {
  const [adults, setAdults] = useState(initialAdults)
  const [ages, setAges] = useState<number[]>(initialChildAges)

  const minAdults = rules.minAdults ?? 1
  const maxAdults = rules.maxAdults ?? 9
  const minChildren = rules.minChildren ?? 0
  const maxChildren = rules.maxChildren ?? 4
  const minChildAge = rules.minChildAge ?? 0
  const maxChildAge = rules.maxChildAge ?? 17

  return (
    <div className="occupancy-panel">
      <div className="stepper-row">
        <div>
          <div className="stepper-label">Adults</div>
          <div className="stepper-sublabel">18+</div>
        </div>
        <div className="stepper-controls">
          <button
            type="button"
            className="stepper-btn"
            onClick={() => setAdults((n) => Math.max(minAdults, n - 1))}
            aria-label="Decrease adults"
            disabled={adults <= minAdults}
          >
            −
          </button>
          <span className="stepper-value" aria-live="polite">
            {adults}
          </span>
          <button
            type="button"
            className="stepper-btn"
            onClick={() => setAdults((n) => Math.min(maxAdults, n + 1))}
            aria-label="Increase adults"
            disabled={adults >= maxAdults}
          >
            +
          </button>
        </div>
      </div>
      <div className="stepper-row">
        <div>
          <div className="stepper-label">Children</div>
          <div className="stepper-sublabel">
            {minChildAge}–{maxChildAge} years
          </div>
        </div>
        <div className="stepper-controls">
          <button
            type="button"
            className="stepper-btn"
            onClick={() => setAges((a) => a.slice(0, Math.max(minChildren, a.length - 1)))}
            aria-label="Decrease children"
            disabled={ages.length <= minChildren}
          >
            −
          </button>
          <span className="stepper-value" aria-live="polite">
            {ages.length}
          </span>
          <button
            type="button"
            className="stepper-btn"
            onClick={() =>
              setAges((a) => (a.length < maxChildren ? [...a, maxChildAge > 6 ? 6 : maxChildAge] : a))
            }
            aria-label="Increase children"
            disabled={ages.length >= maxChildren}
          >
            +
          </button>
        </div>
      </div>
      {ages.length ? (
        <div className="child-ages">
          {ages.map((age, idx) => (
            <div className="child-age-row" key={idx}>
              <label className="child-age-label" htmlFor={`child-age-${idx}`}>
                Child {idx + 1} age
              </label>
              <select
                id={`child-age-${idx}`}
                className="child-age-select"
                value={age}
                onChange={(e) =>
                  setAges((a) => a.map((v, i) => (i === idx ? parseInt(e.target.value, 10) : v)))
                }
              >
                {Array.from({ length: maxChildAge - minChildAge + 1 }).map((_, i) => {
                  const v = minChildAge + i
                  return (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  )
                })}
              </select>
            </div>
          ))}
        </div>
      ) : null}
      <div className="occupancy-panel-footer">
        <Button variant="primary" onClick={() => onSubmit(adults, ages)}>
          Apply
        </Button>
      </div>
    </div>
  )
}
