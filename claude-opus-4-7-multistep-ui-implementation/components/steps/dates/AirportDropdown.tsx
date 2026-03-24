'use client'

import { useBooking } from '@/lib/booking/context'
import { Dropdown } from '@/components/ui/Dropdown'
import { formatMoney } from '@/lib/booking/format'

export function AirportDropdown() {
  const { state, actions } = useBooking()
  const options = state.calendar?.departureAirports ?? []
  const current = state.payload.departureAirports?.[0]
  const selected = options.find((o) => o.airport.iataCode === current) ?? options[0]

  const summary = selected
    ? `${selected.airport.cityName ?? selected.airport.name} (${selected.airport.iataCode})`
    : 'Select airport'

  return (
    <Dropdown label="Flying from" summary={summary} width={360}>
      {(close) => (
        <ul className="dropdown-list">
          {options.map((opt) => {
            const isActive = opt.airport.iataCode === selected?.airport.iataCode
            return (
              <li key={opt.airport.iataCode}>
                <button
                  type="button"
                  className={'dropdown-option' + (isActive ? ' dropdown-option--active' : '')}
                  onClick={() => {
                    close()
                    actions.refreshFirstStep(
                      { departureAirports: [opt.airport.iataCode] },
                      {
                        reprice:
                          state.payload.selectedDate !== undefined && state.payload.nights != null,
                      },
                    )
                  }}
                >
                  <span>
                    <strong>{opt.airport.cityName ?? opt.airport.name}</strong>
                    <span className="dropdown-option-sub"> ({opt.airport.iataCode})</span>
                  </span>
                  {opt.price != null ? (
                    <span className="option-price">{formatMoney(opt.price)}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Dropdown>
  )
}
