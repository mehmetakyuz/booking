'use client'

import React, { useEffect, useState } from 'react'
import { Plane } from 'lucide-react'
import { useBookingActions, useBookingState } from '@/lib/store'
import { PanelLoader } from '../Loading'
import { Modal } from '../Modal'
import { PriceBlock } from '../PriceBlock'
import { StepFooter } from '../StepFooter'
import { cabinClassLabel, formatDateLong, formatMoney, formatTime } from '@/lib/format'
import { getSelectedProductId } from '@/lib/payload'
import type { Flight, FlightLeg } from '@/lib/types'

export function FlightsStep() {
  const state = useBookingState()
  const actions = useBookingActions()
  const { flights, flightsStatus, flightsPriceChange, payload, offerMeta } = state
  const currency = offerMeta?.currency ?? 'GBP'
  const [detailsFlight, setDetailsFlight] = useState<Flight | null>(null)

  useEffect(() => {
    actions.ensureFlights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (flightsStatus === 'idle' || flightsStatus === 'searching' || flightsStatus === 'validating' || flightsStatus === 'pricing') {
    const label =
      flightsStatus === 'validating'
        ? 'Confirming flight prices…'
        : flightsStatus === 'pricing'
          ? 'Updating your trip price…'
          : 'Searching for flights…'
    return (
      <div className="step-panel">
        <h1 className="step-heading">Choose your flights</h1>
        <PanelLoader label={label} />
      </div>
    )
  }

  if (flightsStatus === 'noresults' || !flights?.length) {
    return (
      <div className="step-panel">
        <h1 className="step-heading">Choose your flights</h1>
        <div className="no-results">
          <h2>No flights are available for these dates</h2>
          <p>We couldn’t find flights for your selected dates and departure airport. Please choose a different stay.</p>
          <button type="button" className="btn btn-primary" onClick={() => actions.resetToDates()}>
            Choose new dates
          </button>
        </div>
      </div>
    )
  }

  const baseline = flights.find((f) => f.selected) ?? null
  const payloadFlightId = getSelectedProductId(payload.products, 'F:')
  const activeId = payloadFlightId ?? baseline?.id ?? null

  return (
    <div className="step-panel">
      <h1 className="step-heading">Choose your flights</h1>

      {flightsPriceChange != null ? (
        <div className="price-change-notice">
          {flightsPriceChange > 0
            ? `Flight prices have been confirmed and your total has increased by ${formatMoney(flightsPriceChange, currency)}.`
            : `Flight prices have been confirmed and your total has decreased by ${formatMoney(Math.abs(flightsPriceChange), currency)}.`}
        </div>
      ) : null}

      <div className="option-list">
        {flights.map((flight) => {
          const isActive = flight.id === activeId
          const isBaseline = baseline != null && flight.id === baseline.id
          const delta = baseline?.price != null && flight.price != null ? flight.price - baseline.price : null
          const logo = flight.outboundLeg?.segments[0]?.airline?.logoUrl ?? null
          const airlineName = flight.outboundLeg?.segments[0]?.airline?.name ?? null
          return (
            <div
              key={flight.id}
              className={`option-card flight-card${isActive ? ' is-selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!isActive) actions.selectFlight(flight.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isActive) actions.selectFlight(flight.id)
              }}
            >
              <div className="flight-brand">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={airlineName ?? 'Airline'} className="flight-logo" />
                ) : (
                  <Plane size={28} />
                )}
                {airlineName ? <span className="flight-airline">{airlineName}</span> : null}
              </div>
              <div className="option-content">
                {flight.outboundLeg ? <LegSummary leg={flight.outboundLeg} direction="Outbound" /> : null}
                {flight.inboundLeg ? <LegSummary leg={flight.inboundLeg} direction="Return" /> : null}
                <button
                  type="button"
                  className="text-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDetailsFlight(flight)
                  }}
                >
                  View flight details
                </button>
              </div>
              <PriceBlock isBaseline={isBaseline} delta={delta} total={flight.price} currency={currency} />
            </div>
          )
        })}
      </div>

      {detailsFlight ? (
        <Modal title="Flight details" onClose={() => setDetailsFlight(null)} wide>
          {detailsFlight.outboundLeg ? <LegDetails leg={detailsFlight.outboundLeg} direction="Outbound" /> : null}
          {detailsFlight.inboundLeg ? <LegDetails leg={detailsFlight.inboundLeg} direction="Return" /> : null}
        </Modal>
      ) : null}

      <StepFooter continueDisabled={state.receiptLoading} />
    </div>
  )
}

function LegSummary({ leg, direction }: { leg: FlightLeg; direction: string }) {
  const first = leg.segments[0]
  const last = leg.segments[leg.segments.length - 1]
  const stops = leg.segments.length - 1
  return (
    <p className="flight-leg-summary">
      <span className="flight-leg-direction">{direction}</span>
      <span>
        {first?.departure?.airport?.iataCode} {formatTime(first?.departure?.datetime)} →{' '}
        {last?.arrival?.airport?.iataCode} {formatTime(last?.arrival?.datetime)}
      </span>
      <span className="flight-leg-stops">{stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}</span>
    </p>
  )
}

function segmentDuration(dep: string | null, arr: string | null): string | null {
  if (!dep || !arr) return null
  const d = new Date(dep).getTime()
  const a = new Date(arr).getTime()
  if (Number.isNaN(d) || Number.isNaN(a) || a <= d) return null
  const mins = Math.round((a - d) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return [h ? `${h}h` : null, m ? `${m}m` : null].filter(Boolean).join(' ')
}

function LegDetails({ leg, direction }: { leg: FlightLeg; direction: string }) {
  return (
    <section className="flight-leg-details">
      <h4 className="modal-subheading">
        {direction}
        {leg.label ? ` — ${leg.label}` : ''}
      </h4>
      {leg.segments.map((s, i) => (
        <div key={i} className="flight-segment">
          <p className="flight-segment-route">
            {s.departure?.airport?.name} ({s.departure?.airport?.iataCode}) →{' '}
            {s.arrival?.airport?.name} ({s.arrival?.airport?.iataCode})
          </p>
          <p className="flight-segment-meta">
            {s.departure?.datetime ? `${formatDateLong(s.departure.datetime.slice(0, 10))}, ${formatTime(s.departure.datetime)}` : ''}
            {' – '}
            {s.arrival?.datetime ? formatTime(s.arrival.datetime) : ''}
            {segmentDuration(s.departure?.datetime ?? null, s.arrival?.datetime ?? null)
              ? ` · ${segmentDuration(s.departure?.datetime ?? null, s.arrival?.datetime ?? null)}`
              : ''}
          </p>
          <p className="flight-segment-meta">
            {[
              s.airline?.name,
              s.flightnumber,
              s.operatingAirline?.name && s.operatingAirline.name !== s.airline?.name
                ? `Operated by ${s.operatingAirline.name}`
                : null,
              cabinClassLabel(s.cabinClass),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {s.luggageAllowance ? <p className="flight-segment-meta">Luggage: {s.luggageAllowance}</p> : null}
          {s.handLuggageRules ? <p className="flight-segment-meta">{s.handLuggageRules}</p> : null}
        </div>
      ))}
      {leg.luggageAllowance && !leg.segments.some((s) => s.luggageAllowance) ? (
        <p className="flight-segment-meta">Luggage: {leg.luggageAllowance}</p>
      ) : null}
      {leg.handLuggageRules && !leg.segments.some((s) => s.handLuggageRules) ? (
        <p className="flight-segment-meta">{leg.handLuggageRules}</p>
      ) : null}
    </section>
  )
}
