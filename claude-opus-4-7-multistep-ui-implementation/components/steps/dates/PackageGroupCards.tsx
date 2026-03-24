'use client'

import { useBooking } from '@/lib/booking/context'
import { formatMoney } from '@/lib/booking/format'

export function PackageGroupCards() {
  const { state, actions } = useBooking()
  const groups = state.calendar?.packageGroups ?? []
  const current = state.payload.packageGroup

  return (
    <div className="package-cards" role="radiogroup" aria-label="Package options">
      {groups.map((g) => {
        const isActive = current === g.id
        return (
          <button
            key={g.id || 'all'}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={'package-card' + (isActive ? ' package-card--active' : '')}
            onClick={() => {
              const patch: any = { packageGroup: g.id }
              actions.refreshFirstStep(patch, {
                reprice:
                  state.payload.selectedDate !== undefined && state.payload.nights != null,
              })
            }}
          >
            {g.images?.[0]?.url ? (
              <span className="package-card-image">
                <img src={g.images[0].url} alt="" />
              </span>
            ) : null}
            <span className="package-card-body">
              <span className="package-card-name">{g.name}</span>
              {g.description ? <span className="package-card-desc">{g.description}</span> : null}
              {g.price != null ? (
                <span className="package-card-price">{formatMoney(g.price)}</span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
