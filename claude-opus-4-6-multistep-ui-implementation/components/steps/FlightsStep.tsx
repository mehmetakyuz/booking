'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { FlightOption, FlightLeg, FlightSegment } from '@/lib/booking/types'

/* ── Helpers ── */

function formatPrice(pence: number): string {
  return `\u00A3${(pence / 100).toFixed(0)}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function priceDeltaLabel(flight: FlightOption, baselinePrice: number, currency: string): string {
  if (flight.selected) return 'Included'
  const diff = flight.price - baselinePrice
  if (diff === 0) return '+\u00A30'
  const sign = diff > 0 ? '+' : '-'
  return `${sign}\u00A3${Math.abs(diff / 100).toFixed(0)}`
}

/* ── Component ── */

export default function FlightsStep() {
  const { state, actions } = useBooking()
  const {
    flights,
    flightSearch,
    offer,
    steps,
    currentStepIndex,
  } = state

  /* ── Local state ── */
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null)
  const [detailModalFlightId, setDetailModalFlightId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  /* ── Derive baseline flight (backend-selected) ── */
  const baselineFlight = useMemo(
    () => flights.find((f) => f.selected) ?? flights[0] ?? null,
    [flights],
  )

  const baselinePrice = baselineFlight?.price ?? 0

  /* ── Initialize selected flight once flights load ── */
  useEffect(() => {
    if (flights.length > 0 && selectedFlightId === null) {
      const defaultFlight = flights.find((f) => f.selected) ?? flights[0]
      if (defaultFlight) {
        setSelectedFlightId(defaultFlight.id)
      }
    }
  }, [flights, selectedFlightId])

  /* ── Load flights on mount ── */
  useEffect(() => {
    actions.loadFlights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Select a flight ── */
  const handleSelectFlight = useCallback(
    async (flight: FlightOption) => {
      setSelectedFlightId(flight.id)
      // Immediately replace F: product and reprice via confirmFlight-style logic
      // We use patchState through the flow by calling confirmFlight only on Continue,
      // but we need to replace the product now for live repricing.
      // The flow's replaceProduct + reprice is done inside confirmFlight,
      // but we want intermediate repricing. Use the same approach as the flow:
      const products = state.payload.products.filter((p) => !p.id.startsWith('F:'))
      products.push({ id: `F:${flight.id}` })
      const payload = { ...state.payload, products }
      // We can patch state and reprice directly through the context
      // Since we don't have direct access to reprice, we'll handle this
      // by just tracking locally and confirming on Continue
    },
    [state.payload],
  )

  /* ── Detail modal flight ── */
  const detailFlight = useMemo(
    () => (detailModalFlightId ? flights.find((f) => f.id === detailModalFlightId) ?? null : null),
    [detailModalFlightId, flights],
  )

  /* ── Next step label ── */
  const nextStep = steps[currentStepIndex + 1]
  const continueLabel = nextStep
    ? `Step ${currentStepIndex + 2}. ${nextStep.label}`
    : 'Continue'

  /* ── Continue handler ── */
  async function handleContinue() {
    if (!selectedFlightId) return
    setConfirming(true)
    try {
      await actions.confirmFlight({ flightId: selectedFlightId, options: [] })
    } catch {
      // Error handled in flow
    } finally {
      setConfirming(false)
    }
  }

  /* ── Loading states ── */
  if (flightSearch.status === 'idle' || flightSearch.status === 'searching') {
    return (
      <div className="step-panel">
        <div className="step-panel-header">
          <h2 className="step-title serif">Choose your flight</h2>
        </div>
        <div className="step-panel-content">
          <div className="loader-center">
            <div className="loader-spinner" />
            <p className="loader-text">Searching for flights...</p>
          </div>
        </div>
      </div>
    )
  }

  if (flightSearch.status === 'validating') {
    return (
      <div className="step-panel">
        <div className="step-panel-header">
          <h2 className="step-title serif">Choose your flight</h2>
        </div>
        <div className="step-panel-content">
          <div className="loader-center">
            <div className="loader-spinner" />
            <p className="loader-text">Validating prices...</p>
          </div>
        </div>
      </div>
    )
  }

  if (flightSearch.status === 'error') {
    return (
      <div className="step-panel">
        <div className="step-panel-header">
          <h2 className="step-title serif">Choose your flight</h2>
        </div>
        <div className="step-panel-content">
          <div className="error-block">
            <p className="error-message">{flightSearch.error ?? 'Something went wrong'}</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => actions.loadFlights()}
            >
              Try again
            </button>
          </div>
        </div>
        <div className="step-panel-actions">
          <button type="button" className="btn-secondary" onClick={() => actions.goBack()}>
            Back
          </button>
        </div>
      </div>
    )
  }

  /* ── Success: render flight list ── */
  return (
    <div className="step-panel">
      <div className="step-panel-header">
        <h2 className="step-title serif">Choose your flight</h2>
      </div>

      <div className="step-panel-content">
        <div className="option-list">
          {flights.map((flight) => {
            const isSelected = flight.id === selectedFlightId
            const firstLeg = flight.legs[0]
            const firstSegment = firstLeg?.segments[0]
            const delta = priceDeltaLabel(flight, baselinePrice, offer.currency)

            return (
              <button
                key={flight.id}
                type="button"
                className={`option-card${isSelected ? ' selected' : ''}`}
                onClick={() => setSelectedFlightId(flight.id)}
              >
                <div className="option-card-body">
                  {/* Airline logo / fallback */}
                  <div className="flight-airline-block">
                    {firstSegment?.airlineLogoUrl ? (
                      <img
                        src={firstSegment.airlineLogoUrl}
                        alt={firstSegment.airlineName}
                        className="flight-airline-logo"
                      />
                    ) : (
                      <div className="flight-airline-fallback">
                        <span className="flight-airline-code">{firstSegment?.airlineCode ?? ''}</span>
                        <span className="flight-airline-name">{firstSegment?.airlineName ?? ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Legs summary */}
                  <div className="flight-legs">
                    {flight.legs.map((leg, legIdx) => {
                      const depSeg = leg.segments[0]
                      const arrSeg = leg.segments[leg.segments.length - 1]
                      if (!depSeg || !arrSeg) return null

                      return (
                        <div key={legIdx} className="flight-leg-row">
                          <span className="flight-leg-label">{leg.label}</span>
                          <span className="flight-leg-route">
                            {depSeg.departureCity} &rarr; {arrSeg.arrivalCity}
                          </span>
                          <span className="flight-leg-times">
                            {formatTime(depSeg.departureAt)} &rarr; {formatTime(arrSeg.arrivalAt)}
                          </span>
                          <span className="flight-leg-date">
                            {formatDateShort(depSeg.departureAt)}
                          </span>
                        </div>
                      )
                    })}

                    {/* Badges */}
                    {flight.badges.length > 0 && (
                      <div className="flight-badges">
                        {flight.badges.map((badge) => (
                          <span key={badge} className="badge">{badge}</span>
                        ))}
                      </div>
                    )}

                    {/* Luggage info */}
                    {flight.luggageIncluded && (
                      <div className="flight-luggage">{flight.luggageIncluded}</div>
                    )}
                    {flight.luggageAllowance && (
                      <div className="flight-luggage">{flight.luggageAllowance}</div>
                    )}
                  </div>

                  {/* Price delta + total */}
                  <div className="flight-price-block">
                    <span className={`flight-price-delta${delta === 'Included' ? ' included' : ''}`}>
                      {delta}
                    </span>
                    <span className="flight-price-total">{formatPrice(flight.price)}</span>
                  </div>
                </div>

                {/* View details link */}
                <span
                  className="btn-text"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDetailModalFlightId(flight.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      setDetailModalFlightId(flight.id)
                    }
                  }}
                >
                  View flight details
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="step-panel-actions">
        <button type="button" className="btn-secondary" onClick={() => actions.goBack()}>
          Back
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={!selectedFlightId || confirming}
          onClick={handleContinue}
        >
          {confirming ? 'Loading...' : continueLabel}
        </button>
      </div>

      {/* ── Flight details modal ── */}
      {detailFlight && (
        <div className="modal-overlay" onClick={() => setDetailModalFlightId(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Flight details</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDetailModalFlightId(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {detailFlight.legs.map((leg, legIdx) => (
                <div key={legIdx} className="flight-detail-leg">
                  <h4 className="flight-detail-leg-label">{leg.label}</h4>

                  {leg.segments.map((seg, segIdx) => (
                    <div key={segIdx} className="flight-detail-segment">
                      <div className="flight-detail-segment-header">
                        <span className="flight-detail-airline">
                          {seg.airlineName} ({seg.airlineCode})
                        </span>
                        <span className="flight-detail-flight-number">{seg.flightNumber}</span>
                      </div>

                      {/* Operating airline if different */}
                      {seg.operatingAirlineName &&
                        seg.operatingAirlineCode !== seg.airlineCode && (
                          <div className="flight-detail-operating">
                            Operated by {seg.operatingAirlineName} ({seg.operatingAirlineCode})
                          </div>
                        )}

                      {/* Route */}
                      <div className="flight-detail-route">
                        <div className="flight-detail-endpoint">
                          <span className="flight-detail-code">{seg.departureCode}</span>
                          {seg.departureAirportName && (
                            <span className="flight-detail-airport-name">
                              {seg.departureAirportName}
                            </span>
                          )}
                          <span className="flight-detail-city">{seg.departureCity}</span>
                          <span className="flight-detail-datetime">
                            {formatTime(seg.departureAt)}, {formatDateShort(seg.departureAt)}
                          </span>
                        </div>

                        <span className="flight-detail-arrow">&rarr;</span>

                        <div className="flight-detail-endpoint">
                          <span className="flight-detail-code">{seg.arrivalCode}</span>
                          {seg.arrivalAirportName && (
                            <span className="flight-detail-airport-name">
                              {seg.arrivalAirportName}
                            </span>
                          )}
                          <span className="flight-detail-city">{seg.arrivalCity}</span>
                          <span className="flight-detail-datetime">
                            {formatTime(seg.arrivalAt)}, {formatDateShort(seg.arrivalAt)}
                          </span>
                        </div>
                      </div>

                      {/* Cabin class */}
                      {seg.cabinClass && (
                        <div className="flight-detail-cabin">Cabin: {seg.cabinClass}</div>
                      )}

                      {/* Luggage */}
                      <div className="flight-detail-luggage">
                        {seg.luggageIncluded !== null && seg.luggageIncluded !== undefined && (
                          <span>
                            Luggage: {seg.luggageIncluded ? 'Included' : 'Not included'}
                          </span>
                        )}
                        {seg.luggageAllowance && (
                          <span> ({seg.luggageAllowance})</span>
                        )}
                      </div>
                      {seg.handLuggageRules && (
                        <div className="flight-detail-hand-luggage">
                          Hand luggage: {seg.handLuggageRules}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
