'use client'

import { useBooking } from '@/lib/booking/context'
import { formatMoney } from '@/lib/booking/format'

export function NightsChips() {
  const { state, actions } = useBooking()
  const options = state.calendar?.nights ?? []
  const current = state.payload.nights
  return (
    <div className="chips" role="radiogroup" aria-label="Nights">
      {options.map((opt) => {
        const isAll = opt.nights === null
        const isActive = current === opt.nights || (isAll && current === null)
        return (
          <button
            key={opt.nights === null ? 'all' : `n-${opt.nights}`}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={'chip' + (isActive ? ' chip--active' : '')}
            onClick={() => {
              const nights = isAll ? null : opt.nights
              actions.refreshFirstStep(
                { nights },
                {
                  reprice:
                    state.payload.selectedDate !== undefined && nights !== null && nights !== undefined,
                },
              )
            }}
          >
            <span className="chip-label">
              {isAll ? 'All nights' : `${opt.nights} nights`}
            </span>
            {opt.price != null ? (
              <span className="chip-price">{formatMoney(opt.price)}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
