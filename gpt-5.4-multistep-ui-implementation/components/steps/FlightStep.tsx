'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { getBackendDefault, getPreferredSelection } from '@/lib/booking/selection'
import { FlightLeg, FlightOption, FlightSegment } from '@/lib/booking/types'
import { formatDateTimeLabel, formatPrice, formatPriceDelta } from '@/lib/utils/price'
import { getNextStepLabel, OptionCard, PanelLoadingState, StepFooter, StepShell } from '@/components/steps/shared'

function formatSegmentDuration(segment: FlightSegment) {
  const departure = Date.parse(segment.departureAt)
  const arrival = Date.parse(segment.arrivalAt)

  if (Number.isNaN(departure) || Number.isNaN(arrival) || arrival <= departure) {
    return ''
  }

  const totalMinutes = Math.round((arrival - departure) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []

  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)

  return parts.join(' ') || ''
}

function formatLegDuration(leg: FlightLeg) {
  const firstSegment = leg.segments[0]
  const lastSegment = leg.segments[leg.segments.length - 1]

  if (!firstSegment || !lastSegment) {
    return ''
  }

  return formatSegmentDuration({
    ...firstSegment,
    arrivalAt: lastSegment.arrivalAt,
  })
}

function formatStopsLabel(leg: FlightLeg) {
  const stops = Math.max(leg.segments.length - 1, 0)
  if (!stops) return 'Direct'
  return `${stops} stop${stops === 1 ? '' : 's'}`
}

function formatLuggageSummary(flight: FlightOption) {
  if (typeof flight.luggageIncluded === 'boolean') {
    if (flight.luggageIncluded) {
      return flight.luggageAllowance ? `Checked luggage included · ${flight.luggageAllowance}` : 'Checked luggage included'
    }
    return flight.luggageAllowance ? `No checked luggage · ${flight.luggageAllowance}` : 'No checked luggage included'
  }

  return flight.luggageAllowance ?? 'Luggage details available'
}

function formatSegmentLuggage(segment: FlightSegment) {
  const pieces: string[] = []

  if (typeof segment.luggageIncluded === 'boolean') {
    pieces.push(segment.luggageIncluded ? 'Checked luggage included' : 'No checked luggage')
  }

  if (segment.luggageAllowance) {
    pieces.push(segment.luggageAllowance)
  }

  if (segment.handLuggageRules) {
    pieces.push(segment.handLuggageRules)
  }

  return pieces
}

function getFlightTitle(flight: FlightOption) {
  return flight.badges[0] ?? 'Flight option'
}

function getFlightSummaryLegs(flight: FlightOption) {
  return flight.legs.slice(0, 2)
}

function getPrimaryAirlineLogo(flight: FlightOption) {
  return flight.legs[0]?.segments[0]?.airlineLogoUrl ?? ''
}

function getPrimaryAirlineName(flight: FlightOption) {
  return flight.legs[0]?.segments[0]?.airlineName ?? 'Airline'
}

function getFlightPriceChangeMessage(previousTotal: number, currentTotal: number) {
  if (currentTotal === previousTotal) {
    return ''
  }

  const direction = currentTotal > previousTotal ? 'increased' : 'decreased'
  return `The total trip price has ${direction} from ${formatPrice(previousTotal)} to ${formatPrice(currentTotal)} after live flight validation.`
}

export function FlightStep() {
  const {
    state: { currentStepIndex, flights, flightSearch, payload, steps },
    actions,
  } = useBooking()

  const currentFlightId =
    payload.products.find((product) => product.id.startsWith('F:'))?.id ??
    getBackendDefault(flights)?.id ??
    ''
  const [selectedFlightId, setSelectedFlightId] = useState(currentFlightId)
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({})
  const [detailsFlightId, setDetailsFlightId] = useState('')
  const [selectionBusy, setSelectionBusy] = useState(false)

  useEffect(() => {
    void actions.ensureFlightsLoaded()
  }, [actions])

  useEffect(() => {
    setSelectedFlightId(currentFlightId)
  }, [currentFlightId])

  useEffect(() => {
    const flightProduct = payload.products.find((product) => product.id.startsWith('F:') && product.id === selectedFlightId)
    setSelectedValues(Object.fromEntries((flightProduct?.options ?? []).map((option) => [option.id, option.value])))
  }, [payload.products, selectedFlightId])

  const selectedFlight = getPreferredSelection(flights, [selectedFlightId])
  const availableOptions = [...(selectedFlight?.options ?? []), ...(selectedFlight?.luggageOption ? [selectedFlight.luggageOption] : [])]
  const baseFlightPrice = getBackendDefault(flights)?.price ?? 0
  const defaultFlightId = getBackendDefault(flights)?.id ?? ''
  const detailsFlight = flights.find((flight) => flight.id === detailsFlightId) ?? null

  const selectedFlightBadgeLine = useMemo(() => {
    if (!selectedFlight?.badges.length) return ''
    return selectedFlight.badges.join(' · ')
  }, [selectedFlight])

  function getFlightSelectedValues(flightId: string) {
    const flightProduct = payload.products.find((product) => product.id === flightId)
    return Object.fromEntries((flightProduct?.options ?? []).map((option) => [option.id, option.value]))
  }

  async function handleSelectFlight(flight: FlightOption) {
    const nextSelectedValues = getFlightSelectedValues(flight.id)
    setSelectedFlightId(flight.id)
    setSelectedValues(nextSelectedValues)
    setSelectionBusy(true)
    try {
      await actions.previewFlight({
        flightId: flight.id,
        selectedValues: nextSelectedValues,
        availableOptions: [...flight.options, ...(flight.luggageOption ? [flight.luggageOption] : [])],
      })
    } finally {
      setSelectionBusy(false)
    }
  }

  return (
    <StepShell
      eyebrow={`Step ${currentStepIndex + 1}`}
      title="Flights"
      description="Choose the flights that suit your trip best."
    >
      {selectionBusy ? <div className="helper-text">Updating flights and pricing…</div> : null}

      {flightSearch.status === 'searching' || flightSearch.status === 'validating' ? (
        <PanelLoadingState
          detail={flightSearch.status === 'searching' ? 'Searching the available flight options.' : 'Validating live prices.'}
          title={flightSearch.status === 'searching' ? 'Searching for available flights…' : 'Validating prices…'}
        />
      ) : null}

      {flightSearch.status === 'error' ? (
        <div className="error-banner">
          <p>{flightSearch.error}</p>
          <button className="button button-secondary" onClick={actions.resetToCalendar} type="button">
            Choose different dates
          </button>
        </div>
      ) : null}

      {flightSearch.status === 'success' ? (
        <>
          {flightSearch.priceChange ? (
            <div className="info-banner">
              <p>{getFlightPriceChangeMessage(flightSearch.priceChange.previousTotal, flightSearch.priceChange.currentTotal)}</p>
            </div>
          ) : null}
          <div className="flight-list">
            {flights.map((flight) => {
              const isBaseline = flight.id === defaultFlightId
              const summaryLegs = getFlightSummaryLegs(flight)
              const airlineLogo = getPrimaryAirlineLogo(flight)
              const airlineName = getPrimaryAirlineName(flight)

              return (
                <OptionCard as="div" className="flight-card" key={flight.id} selected={selectedFlightId === flight.id} onClick={() => void handleSelectFlight(flight)}>
                  <div className="flight-card-brand">
                    {airlineLogo ? (
                      <img alt={airlineName} className="flight-card-logo" src={airlineLogo} />
                    ) : (
                      <div className="flight-card-logo-fallback" aria-hidden="true">
                        ✈
                      </div>
                    )}
                    <span className="flight-card-brand-name">{airlineName}</span>
                  </div>
                  <div className="option-card-copy flight-card-copy">
                    <div className="option-card-top">
                      <div>
                        <strong>{getFlightTitle(flight)}</strong>
                        {flight.badges.length > 1 ? <p className="muted">{flight.badges.slice(1).join(' · ')}</p> : null}
                      </div>
                      <div className="option-price-block">
                        <span className={`option-price-delta${isBaseline ? ' is-included' : ''}`}>
                          {isBaseline ? 'Included' : formatPriceDelta(flight.price, baseFlightPrice)}
                        </span>
                        <span className="option-price-note">{formatPrice(flight.price)} total</span>
                      </div>
                    </div>

                    <div className="flight-leg-list">
                      {summaryLegs.map((leg) => {
                        const firstSegment = leg.segments[0]
                        const lastSegment = leg.segments[leg.segments.length - 1]
                        if (!firstSegment || !lastSegment) return null

                        return (
                          <div className="flight-leg-summary" key={`${flight.id}-${leg.label || firstSegment.flightNumber || leg.segments.length}`}>
                            <div className="flight-leg-summary-top">
                              <strong>{leg.label || 'Flight leg'}</strong>
                              <span>{formatStopsLabel(leg)}</span>
                            </div>
                            <div className="flight-leg-summary-route">
                              <span>{firstSegment.departureCode}</span>
                              <span className="flight-leg-line" aria-hidden="true" />
                              <span>{lastSegment.arrivalCode}</span>
                            </div>
                            <div className="flight-leg-summary-meta">
                              <span>
                                {formatDateTimeLabel(firstSegment.departureAt)} → {formatDateTimeLabel(lastSegment.arrivalAt)}
                              </span>
                              {formatLegDuration(leg) ? <span>{formatLegDuration(leg)}</span> : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="flight-card-meta">
                      {formatLuggageSummary(flight) ? <span>{formatLuggageSummary(flight)}</span> : null}
                      {selectedFlightBadgeLine && selectedFlightId === flight.id ? <span>{selectedFlightBadgeLine}</span> : null}
                    </div>

                    <div className="activity-actions">
                      <button
                        className="link-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setDetailsFlightId(flight.id)
                        }}
                        type="button"
                      >
                        View flight details
                      </button>
                    </div>
                  </div>
                </OptionCard>
              )
            })}
          </div>

          {availableOptions.length ? (
            <div className="field-grid">
              {availableOptions.map((option) => (
                <label className="field" key={option.id}>
                  <span>{option.name}</span>
                  {option.kind === 'toggle' ? (
                    <input
                      checked={selectedValues[option.id] === 'true' || option.mandatory}
                      disabled={option.mandatory}
                      onChange={(event) =>
                        setSelectedValues((value) => ({ ...value, [option.id]: event.target.checked ? 'true' : '' }))
                      }
                      type="checkbox"
                    />
                  ) : option.kind === 'choice' ? (
                    <select
                      value={selectedValues[option.id] ?? option.choices?.[0]?.id ?? ''}
                      onChange={(event) => setSelectedValues((value) => ({ ...value, [option.id]: event.target.value }))}
                    >
                      {(option.choices ?? []).map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={selectedValues[option.id] ?? String(option.rangeMin ?? 1)}
                      onChange={(event) => setSelectedValues((value) => ({ ...value, [option.id]: event.target.value }))}
                    >
                      {Array.from(
                        { length: (option.rangeMax ?? option.rangeMin ?? 1) - (option.rangeMin ?? 1) + 1 },
                        (_, index) => (option.rangeMin ?? 1) + index,
                      ).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <StepFooter
        canContinue={Boolean(selectedFlight)}
        continueLabel={getNextStepLabel(steps, currentStepIndex)}
        onBack={actions.goBack}
        onContinue={() => {
          if (!selectedFlight) return
          void actions.confirmFlight({
            flightId: selectedFlight.id,
            selectedValues,
            availableOptions,
          })
        }}
      />

      {detailsFlight ? (
        <div aria-modal="true" className="hero-modal-backdrop" onClick={() => setDetailsFlightId('')} role="dialog">
          <div className="hero-modal accommodation-modal flight-modal" onClick={(event) => event.stopPropagation()}>
            <div className="hero-modal-header">
              <h2>{getFlightTitle(detailsFlight)}</h2>
              <button aria-label="Close modal" className="modal-close-button" onClick={() => setDetailsFlightId('')} type="button">
                ×
              </button>
            </div>
            <div className="accommodation-modal-copy flight-modal-copy">
              <p className="muted">{detailsFlight.badges.join(' · ')}</p>
              <div className="flight-modal-overview">
                <span>{formatLuggageSummary(detailsFlight)}</span>
                {detailsFlight.luggageOption ? <span>{detailsFlight.luggageOption.name}</span> : null}
              </div>

              <div className="flight-modal-legs">
                {detailsFlight.legs.map((leg, legIndex) => (
                  <section className="flight-modal-leg" key={`${detailsFlight.id}-${leg.label || legIndex}`}>
                    <div className="flight-modal-leg-header">
                      <div>
                        <h3>{leg.label || `Leg ${legIndex + 1}`}</h3>
                        <p className="muted">
                          {formatStopsLabel(leg)}
                          {formatLegDuration(leg) ? ` · ${formatLegDuration(leg)}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flight-segment-list">
                      {leg.segments.map((segment, segmentIndex) => (
                        <article className="flight-segment-card" key={`${detailsFlight.id}-${legIndex}-${segment.flightNumber || segmentIndex}`}>
                          <div className="flight-segment-top">
                            <div>
                              <strong>
                                {[segment.airlineName, segment.flightNumber].filter(Boolean).join(' ')}
                              </strong>
                              <p className="muted">
                                {segment.operatingAirlineName && segment.operatingAirlineName !== segment.airlineName
                                  ? `Operated by ${segment.operatingAirlineName}`
                                  : segment.cabinClass ?? ''}
                              </p>
                            </div>
                            {formatSegmentDuration(segment) ? <span className="flight-segment-duration">{formatSegmentDuration(segment)}</span> : null}
                          </div>

                          <div className="flight-segment-route">
                            <div>
                              <strong>{segment.departureCode}</strong>
                              <p>{formatDateTimeLabel(segment.departureAt)}</p>
                              <p className="muted">{segment.departureAirportName ?? segment.departureCity}</p>
                            </div>
                            <div className="flight-segment-arrow" aria-hidden="true">
                              →
                            </div>
                            <div>
                              <strong>{segment.arrivalCode}</strong>
                              <p>{formatDateTimeLabel(segment.arrivalAt)}</p>
                              <p className="muted">{segment.arrivalAirportName ?? segment.arrivalCity}</p>
                            </div>
                          </div>

                          <div className="flight-segment-meta">
                            {formatSegmentLuggage(segment).map((item) => (
                              <span key={`${segment.flightNumber}-${item}`}>{item}</span>
                            ))}
                            {segment.cabinClass ? <span>{segment.cabinClass}</span> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </StepShell>
  )
}
