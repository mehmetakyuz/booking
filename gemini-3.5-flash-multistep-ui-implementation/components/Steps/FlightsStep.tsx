'use client';

import React, { useState } from 'react';
import { useBooking } from '@/lib/state';
import { formatMoney } from '@/lib/utils';
import Modal from '../Modal';
import { FlightOption, FlightLeg, FlightLegSegment } from '@/lib/types';

// Helper to format date in a readable form
function formatTimeAndAirport(timeStr: string, airportCode: string) {
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return `${timeStr} (${airportCode})`;
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes} (${airportCode})`;
}

function formatDateString(timeStr: string) {
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return timeStr;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function FlightsStep() {
  const { state, actions } = useBooking();
  const { flights, flightsLoading, flightsStage, flightsError, flightsPreTotal, payload, receipt, steps } = state;

  const [detailFlight, setDetailFlight] = useState<FlightOption | null>(null);

  const currency = state.offer?.currency || 'GBP';

  const activeFlightId = payload.products?.find(p => p.id.startsWith('F:'))?.id || '';

  const handleSelectFlight = async (flightId: string) => {
    await actions.setFlightSelection(flightId);
  };

  const getDeltaPriceDisplay = (flightPrice: number, isBaseline: boolean) => {
    if (isBaseline) {
      return <span className="price-delta included">Included</span>;
    }
    const delta = flightPrice;
    if (delta === 0) return <span className="price-delta">+£0</span>;
    
    return (
      <span className="price-delta">
        {delta > 0 ? '+' : ''}
        {formatMoney(delta, currency)}
      </span>
    );
  };

  const nextStepDef = steps.find(s => s.id === state.currentStep + 1);

  // Render Loader / Search Status
  if (flightsStage === 'searching' || flightsStage === 'validating') {
    return (
      <div className="content-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loader-spinner" style={{ margin: '0 auto 20px auto', width: '48px', height: '48px' }}></div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
          {flightsStage === 'searching' ? 'Searching Flights...' : 'Validating Flight Prices...'}
        </h2>
        <p style={{ color: '#575757', fontSize: '14px' }}>
          We are scanning airline options and fares for your chosen stay dates. Please wait.
        </p>
      </div>
    );
  }

  // Render No Results / Fail state
  if (flightsStage === 'failed' || flightsStage === 'empty') {
    return (
      <div className="content-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', color: '#8b8b8b', marginBottom: '16px' }}>✈️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#d90032' }}>
          No Flights Available
        </h2>
        <p style={{ color: '#575757', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
          We couldn&apos;t find flight options for your selected stay configuration or airports.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => actions.goToStep(1)}>
          Return to Dates
        </button>
      </div>
    );
  }

  const baselineFlight = flights?.find(f => f.selected) || flights?.[0];

  // Compare pricing changes
  let priceDeltaNotice = null;
  if (receipt && flightsPreTotal !== null) {
    const diff = receipt.totalPrice - flightsPreTotal;
    if (diff !== 0) {
      priceDeltaNotice = (
        <div className={`alert-banner ${diff < 0 ? 'positive' : ''}`} style={{ marginBottom: '16px' }}>
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Your package price has {diff > 0 ? 'increased' : 'decreased'} by {formatMoney(Math.abs(diff), currency)} (flight fare adjustments).
          </span>
        </div>
      );
    }
  }

  const renderLegSummary = (leg: FlightLeg) => {
    const startSegment = leg.segments[0];
    const endSegment = leg.segments[leg.segments.length - 1];
    const stopCount = leg.segments.length - 1;

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>
            {formatTimeAndAirport(startSegment.departureTime, startSegment.departureAirport.code)} →{' '}
            {formatTimeAndAirport(endSegment.arrivalTime, endSegment.arrivalAirport.code)}
          </div>
          <div style={{ fontSize: '12px', color: '#8b8b8b' }}>
            {startSegment.airline} · {stopCount === 0 ? 'Direct' : `${stopCount} Stop${stopCount > 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px', color: '#575757' }}>
          <span>Duration: {leg.duration}</span>
        </div>
      </div>
    );
  };

  const renderSegmentDetails = (segment: FlightLegSegment, idx: number, totalSegments: number, segmentsList: FlightLegSegment[]) => {
    // Layover calculation
    let layoverRow = null;
    if (idx < totalSegments - 1) {
      const nextSegment = segmentsList[idx + 1];
      const arrTime = new Date(segment.arrivalTime).getTime();
      const depTime = new Date(nextSegment.departureTime).getTime();
      const layoverMin = Math.round((depTime - arrTime) / (1000 * 60));
      const hours = Math.floor(layoverMin / 60);
      const mins = layoverMin % 60;
      const layoverStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      layoverRow = (
        <div
          key={`layover-${idx}`}
          style={{
            margin: '8px 0 8px 24px',
            padding: '6px 12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#575757',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>Connection layover: <strong>{layoverStr}</strong> at {segment.arrivalAirport.city} ({segment.arrivalAirport.code})</span>
        </div>
      );
    }

    return (
      <React.Fragment key={idx}>
        <div style={{ display: 'flex', gap: '12px', position: 'relative', paddingLeft: '8px' }}>
          <div style={{ position: 'absolute', left: '0', top: '8px', bottom: '-8px', width: '2px', backgroundColor: '#0098a8' }}></div>
          <div style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
              <span>{segment.airline} {segment.flightCode} · {segment.cabinClass}</span>
              <span>{segment.duration}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '6px 0', fontSize: '12px', color: '#575757' }}>
              <div>
                <strong>DEP:</strong> {formatTimeAndAirport(segment.departureTime, segment.departureAirport.code)}
                <div style={{ fontSize: '11px', color: '#8b8b8b' }}>{formatDateString(segment.departureTime)}</div>
                <div style={{ fontSize: '11px' }}>{segment.departureAirport.name || segment.departureAirport.city}</div>
              </div>
              
              <div>
                <strong>ARR:</strong> {formatTimeAndAirport(segment.arrivalTime, segment.arrivalAirport.code)}
                <div style={{ fontSize: '11px', color: '#8b8b8b' }}>{formatDateString(segment.arrivalTime)}</div>
                <div style={{ fontSize: '11px' }}>{segment.arrivalAirport.name || segment.arrivalAirport.city}</div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#8b8b8b', display: 'flex', gap: '10px' }}>
              {segment.luggageChecked && <span>Luggage: {segment.luggageChecked}</span>}
              {segment.luggageHand && <span>Hand: {segment.luggageHand}</span>}
              {segment.operatingAirline && segment.operatingAirline !== segment.airline && (
                <span>Operated by: {segment.operatingAirline}</span>
              )}
            </div>
          </div>
        </div>
        {layoverRow}
      </React.Fragment>
    );
  };

  return (
    <div className="content-card" style={{ padding: '24px' }}>
      {flightsLoading && (
        <div className="loader-overlay">
          <div className="loader-spinner"></div>
        </div>
      )}

      <div className="step-header">
        <h1 className="step-title">Flights</h1>
        <p className="step-subtitle">Compare and select your flights for this package.</p>
      </div>

      {priceDeltaNotice}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="option-cards-list">
          {flights?.map((flight) => {
            const isSelected = activeFlightId === flight.id;
            const isBaseline = baselineFlight?.id === flight.id;
            const totalEst = receipt ? receipt.totalPrice + (isBaseline ? 0 : flight.price) : 0;

            return (
              <div
                key={flight.id}
                className={`option-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectFlight(flight.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Airline branding block */}
                <div
                  className="option-card-media"
                  style={{
                    backgroundColor: '#17171a',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}
                >
                  ✈️
                </div>

                <div className="option-card-content">
                  <div className="option-card-header">
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ borderBottom: '1px solid #f5f5f5', paddingBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0098a8' }}>
                          Outbound
                        </span>
                        {renderLegSummary(flight.outbound)}
                      </div>
                      
                      {flight.inbound && (
                        <div style={{ marginTop: '6px', paddingTop: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0098a8' }}>
                            Inbound
                          </span>
                          {renderLegSummary(flight.inbound)}
                        </div>
                      )}
                    </div>

                    <div className="option-card-price-block">
                      {getDeltaPriceDisplay(flight.price, isBaseline)}
                      {receipt && (
                        <div className="price-total-hint">
                          Total: {formatMoney(totalEst, currency)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="option-card-footer" style={{ marginTop: '12px' }}>
                    <span
                      className="summary-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailFlight(flight);
                      }}
                      style={{ fontSize: '12px' }}
                    >
                      View flight details
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation CTAs */}
        <div className="nav-buttons">
          <button type="button" className="btn btn-secondary" onClick={actions.prevStep}>
            ← Back
          </button>
          <button type="button" className="btn btn-primary" onClick={actions.nextStep}>
            {nextStepDef ? `Step 5. ${nextStepDef.label}` : 'Continue'} →
          </button>
        </div>
      </div>

      {/* Flight Details Modal */}
      {detailFlight && (
        <Modal
          isOpen={!!detailFlight}
          onClose={() => setDetailFlight(null)}
          title="Flight Itinerary Details"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Outbound Leg */}
            <div>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: '#0098a8',
                  borderBottom: '1px solid #dfdfdf',
                  paddingBottom: '4px',
                  marginBottom: '10px'
                }}
              >
                Outbound flight ({detailFlight.outbound.duration})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {detailFlight.outbound.segments.map((segment, idx) =>
                  renderSegmentDetails(segment, idx, detailFlight.outbound.segments.length, detailFlight.outbound.segments)
                )}
              </div>
            </div>

            {/* Inbound Leg */}
            {detailFlight.inbound && (
              <div>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: '#0098a8',
                    borderBottom: '1px solid #dfdfdf',
                    paddingBottom: '4px',
                    marginBottom: '10px'
                  }}
                >
                  Inbound flight ({detailFlight.inbound.duration})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {detailFlight.inbound.segments.map((segment, idx) =>
                    renderSegmentDetails(segment, idx, detailFlight.inbound.segments.length, detailFlight.inbound.segments)
                  )}
                </div>
              </div>
            )}
            
            <div style={{ borderTop: '2px solid #17171a', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>Flight price adjustment</span>
              <span className="price-delta" style={{ fontSize: '20px' }}>
                {detailFlight.price === 0 ? 'Included' : `${detailFlight.price > 0 ? '+' : ''}${formatMoney(detailFlight.price, currency)}`}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
