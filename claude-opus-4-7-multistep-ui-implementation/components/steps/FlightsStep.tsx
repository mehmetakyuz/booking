'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { Flight } from '@/lib/booking/types'
import { formatMoney, formatDelta } from '@/lib/booking/format'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { StepFooter } from './StepFooter'

export function FlightsStep() {
  const { state, actions } = useBooking()
  const [detailsFor, setDetailsFor] = useState<Flight | null>(null)

  useEffect(() => {
    if (!state.flights && !state.async.flightsLoading) actions.loadFlights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flights = state.flights ?? []
  const loading = state.async.flightsLoading
  const empty =
    !loading && (!!state.async.flightResultsEmpty || (state.flights !== null && flights.length === 0))

  const baseline = flights.find((f) => f.selected) ?? flights[0]
  const current =
    flights.find((f) => (state.payload.products ?? []).some((p) => p.id === f.id)) ?? baseline

  const canContinue =
    !!current && !state.async.receiptLoading && (state.receipt?.errors?.length ?? 0) === 0

  return (
    <div className="step-panel">
      <header className="step-panel-head">
        <h1 className="step-heading">Choose your flight</h1>
      </header>

      {loading ? (
        <div className="panel-loading">
          <Spinner size={32} label={state.async.flightSearchStatus ?? 'Searching flights…'} />
        </div>
      ) : empty ? (
        <div className="empty-state">
          <h3>No flights available for this stay</h3>
          <p>Try different dates or airport from Step 1.</p>
          <Button variant="secondary" onClick={() => actions.restartFromDates()}>
            Back to dates
          </Button>
        </div>
      ) : (
        <>
          {state.async.priceChangeDelta != null ? (
            <div className={'price-change-notice ' + (state.async.priceChangeDelta > 0 ? 'price-change-notice--up' : 'price-change-notice--down')}>
              The total has {state.async.priceChangeDelta > 0 ? 'increased' : 'decreased'} by{' '}
              {formatMoney(Math.abs(state.async.priceChangeDelta))} after validating flights.
            </div>
          ) : null}
          <ul className="option-list">
            {flights.map((f) => {
              const isActive = f.id === current?.id
              const isBaseline = f.id === baseline?.id
              const delta = (f.price ?? 0) - (baseline?.price ?? 0)
              const logo = f.legs?.[0]?.segments?.[0]?.airline?.logoUrl
              const airline = f.legs?.[0]?.segments?.[0]?.airline?.name
              return (
                <li
                  key={f.id}
                  className={'option-card option-card--flight' + (isActive ? ' option-card--active' : '')}
                >
                  <button
                    type="button"
                    className="option-card-image option-card-image--airline"
                    onClick={() => actions.selectFlight(f.id)}
                  >
                    {logo ? <img src={logo} alt={airline ?? ''} /> : <span>{airline}</span>}
                  </button>
                  <div className="option-card-body">
                    <div className="option-card-content">
                      {f.legs?.map((leg, i) => {
                        const first = leg.segments[0]
                        const last = leg.segments[leg.segments.length - 1]
                        return (
                          <div key={i} className="flight-leg">
                            <strong>{leg.label ?? (i === 0 ? 'Outbound' : 'Return')}</strong>
                            <span className="flight-leg-route">
                              {first?.departure?.airport?.iataCode} → {last?.arrival?.airport?.iataCode}
                            </span>
                            <span className="flight-leg-times">
                              {formatTime(first?.departure?.datetime)} –{' '}
                              {formatTime(last?.arrival?.datetime)}
                            </span>
                          </div>
                        )
                      })}
                      <button
                        type="button"
                        className="link-button btn-sm"
                        onClick={() => setDetailsFor(f)}
                      >
                        View flight details
                      </button>
                    </div>
                    <div className="option-card-price">
                      <span className="option-card-delta">
                        {isBaseline ? 'Included' : formatDelta(delta)}
                      </span>
                      <span className="option-card-total">{formatMoney(f.price ?? 0)}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <StepFooter
        onContinue={() => {
          if (canContinue) actions.goToStep(state.currentStep + 1)
        }}
        continueDisabled={!canContinue}
      />

      <FlightDetailsModal flight={detailsFor} onClose={() => setDetailsFor(null)} />
    </div>
  )
}

function formatTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function FlightDetailsModal({ flight, onClose }: { flight: Flight | null; onClose: () => void }) {
  if (!flight) return null
  return (
    <Modal open={!!flight} onClose={onClose} wide title="Flight details">
      {flight.legs?.map((leg, i) => (
        <section key={i} className="flight-details-leg">
          <h3>{leg.label ?? (i === 0 ? 'Outbound' : 'Return')}</h3>
          <ol className="flight-segment-list">
            {leg.segments.map((s, j) => (
              <li key={j} className="flight-segment">
                <div className="flight-segment-head">
                  {s.airline?.logoUrl ? (
                    <img src={s.airline.logoUrl} alt={s.airline.name ?? ''} height={18} />
                  ) : null}
                  <span>
                    {s.airline?.name} · {s.flightnumber}
                  </span>
                </div>
                <div className="flight-segment-route">
                  <span>
                    <strong>{s.departure?.airport?.iataCode}</strong>{' '}
                    {s.departure?.airport?.name} · {formatTime(s.departure?.datetime)}
                  </span>
                  <span>↓</span>
                  <span>
                    <strong>{s.arrival?.airport?.iataCode}</strong>{' '}
                    {s.arrival?.airport?.name} · {formatTime(s.arrival?.datetime)}
                  </span>
                </div>
                <div className="flight-segment-meta">
                  {s.cabinClass ? <span>Cabin: {s.cabinClass}</span> : null}
                  {s.luggageAllowance ? <span>Luggage: {s.luggageAllowance}</span> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Modal>
  )
}
