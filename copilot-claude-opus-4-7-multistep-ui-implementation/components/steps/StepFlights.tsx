"use client";

import { useState } from "react";
import { useBooking } from "../BookingContext";
import { formatDelta, formatPrice } from "@/lib/payload";
import { Modal } from "../Modal";
import { IconCheck, IconFlight } from "../icons/Icons";
import type { FlightOption, ItineraryFlightLeg } from "@/lib/types";

function formatTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function formatDay(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function LegSummary({ leg, label }: { leg: ItineraryFlightLeg; label: string }) {
  const segs = leg.segments || [];
  if (!segs.length) return null;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const stops = segs.length - 1;
  return (
    <div className="flight-leg">
      <div className="flight-leg-label">{label}</div>
      <div className="flight-leg-row">
        <div className="flight-endpoint">
          <div className="flight-time">{formatTime(first.departure?.datetime)}</div>
          <div className="flight-airport">{first.departure?.airport.iataCode}</div>
          <div className="flight-date">{formatDay(first.departure?.datetime)}</div>
        </div>
        <div className="flight-middle">
          <div className="flight-stops">{stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}`}</div>
          <div className="flight-dashed" />
          {first.airline?.name && <div className="flight-airline">{first.airline.name}</div>}
        </div>
        <div className="flight-endpoint">
          <div className="flight-time">{formatTime(last.arrival?.datetime)}</div>
          <div className="flight-airport">{last.arrival?.airport.iataCode}</div>
          <div className="flight-date">{formatDay(last.arrival?.datetime)}</div>
        </div>
      </div>
    </div>
  );
}

function FlightDetailsModal({ flight, onClose }: { flight: FlightOption; onClose: () => void }) {
  return (
    <Modal title="Flight details" onClose={onClose}>
      {flight.outboundLeg && <LegSummary leg={flight.outboundLeg} label="Outbound" />}
      {flight.inboundLeg && <LegSummary leg={flight.inboundLeg} label="Return" />}
      <div className="flight-details-meta">
        <div>Cabin: {flight.cabinClass || "Economy"}</div>
        <div>Luggage: {flight.luggageIncluded ? (flight.luggageAllowance || "Included") : "Not included"}</div>
      </div>
    </Modal>
  );
}

export function StepFlights() {
  const { state, selectFlight, startFlights, advance, goBack, goToStepById } = useBooking();
  const [details, setDetails] = useState<FlightOption | null>(null);

  if (state.flightsLoading) {
    return (
      <div className="step step-flights">
        <h1 className="step-title">Finding your flights…</h1>
        <div className="loader">
          <div className="loader-spinner" />
          <p>{state.flightsStatus === "validating" ? "Confirming live prices…" : "Searching airlines…"}</p>
        </div>
      </div>
    );
  }

  if (state.flightsStatus === "empty" || (state.flights && state.flights.length === 0)) {
    return (
      <div className="step step-flights">
        <h1 className="step-title">No flights available</h1>
        <p>We couldn't find flights for these dates. Try a different date or airport.</p>
        <div className="step-footer">
          <button type="button" className="btn btn-ghost" onClick={() => goToStepById("dates")}>← Back to dates</button>
          <button type="button" className="btn btn-primary" onClick={() => void startFlights()}>Search again</button>
        </div>
      </div>
    );
  }

  if (state.flightsStatus === "failed") {
    return (
      <div className="step step-flights">
        <h1 className="step-title">Flight search failed</h1>
        <button type="button" className="btn btn-primary" onClick={() => void startFlights()}>Try again</button>
      </div>
    );
  }

  const flights = state.flights || [];
  const selectedId = state.payload.products.find(p => p.id.startsWith("F:"))?.id;
  const basePrice = flights[0]?.price ?? 0;

  return (
    <div className="step step-flights">
      <h1 className="step-title">Choose your flights</h1>
      {state.flightsNotice && (
        <div className={`price-notice price-notice--${state.flightsNotice.kind}`}>
          {state.flightsNotice.kind === "increase" ? "Your total went up by" : "Your total went down by"} {formatDelta(Math.abs(state.flightsNotice.delta))} after live flight pricing.
        </div>
      )}
      <div className="options-list">
        {flights.map(f => {
          const isActive = selectedId === f.id;
          const delta = f.price != null ? (f.price - (basePrice ?? 0)) : null;
          return (
            <div
              key={f.id}
              className={`option-card option-card--flight ${isActive ? "option-card--active" : ""}`}
              onClick={() => void selectFlight(f.id)}
            >
              <div className="option-card-body">
                <div className="flight-icon-row">
                  <IconFlight /> <span>{f.outboundLeg?.segments?.[0]?.airline?.name || "Flight"}</span>
                </div>
                {f.outboundLeg && <LegSummary leg={f.outboundLeg} label="Outbound" />}
                {f.inboundLeg && <LegSummary leg={f.inboundLeg} label="Return" />}
                <button type="button" className="link-button" onClick={(e) => { e.stopPropagation(); setDetails(f); }}>View details</button>
              </div>
              <div className="option-card-price">
                {delta != null && delta !== 0 ? <span className="option-card-delta">{formatDelta(delta)}</span> : formatPrice(f.price)}
              </div>
              {isActive && <div className="option-card-check"><IconCheck /></div>}
            </div>
          );
        })}
      </div>
      <div className="step-footer">
        <button type="button" className="btn btn-ghost" onClick={goBack}>← Back</button>
        <button type="button" className="btn btn-primary btn-large" onClick={advance} disabled={!!state.receiptError || !selectedId}>Continue →</button>
      </div>
      {details && <FlightDetailsModal flight={details} onClose={() => setDetails(null)} />}
    </div>
  );
}
