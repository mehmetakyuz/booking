"use client";

import { useState } from "react";
import { Info, Plane } from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import { Flight, FlightLeg } from "@/lib/booking/types";
import { findProductByPrefix } from "@/lib/booking/products";
import { cabinClassLabel } from "@/lib/booking/labels";
import { PriceTag } from "../OptionCard";
import Modal from "../Modal";
import StepNav from "./StepNav";

function time(dt?: string): string {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dateShort(dt?: string): string {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function LegSummary({ leg }: { leg?: FlightLeg }) {
  if (!leg) return null;
  const first = leg.segments[0];
  const last = leg.segments[leg.segments.length - 1];
  return (
    <div className="flight-leg">
      <div className="flight-leg-label">{leg.label}</div>
      <div className="flight-leg-times">
        <span className="flight-time">
          {time(first?.departureTime)} {first?.departureAirport}
        </span>
        <span className="flight-arrow">→</span>
        <span className="flight-time">
          {time(last?.arrivalTime)} {last?.arrivalAirport}
        </span>
        <span className="flight-stops">
          {leg.segments.length === 1
            ? "Direct"
            : `${leg.segments.length - 1} stop${leg.segments.length > 2 ? "s" : ""}`}
        </span>
      </div>
    </div>
  );
}

function FlightDetails({ flight }: { flight: Flight }) {
  const renderLeg = (leg?: FlightLeg) => {
    if (!leg) return null;
    return (
      <div className="flight-detail-leg">
        <h3>{leg.label}</h3>
        {leg.segments.map((s, i) => (
          <div className="segment" key={i}>
            <div className="segment-airline">
              {s.airlineLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.airlineLogo} alt={s.airline ?? ""} className="airline-logo-sm" />
              ) : null}
              <span>
                {s.airline}
                {s.flightNumber ? ` · ${s.flightNumber}` : ""}
              </span>
            </div>
            <div className="segment-route">
              <div>
                <strong>{time(s.departureTime)}</strong> {s.departureAirport}
                <span className="muted"> · {dateShort(s.departureTime)}</span>
              </div>
              <div className="segment-line" />
              <div>
                <strong>{time(s.arrivalTime)}</strong> {s.arrivalAirport}
                <span className="muted"> · {dateShort(s.arrivalTime)}</span>
              </div>
            </div>
            <div className="segment-meta">
              {cabinClassLabel(s.cabinClass) ? (
                <span>{cabinClassLabel(s.cabinClass)}</span>
              ) : null}
              <span>
                {s.luggageIncluded
                  ? `Luggage: ${s.luggageAllowance ?? "included"}`
                  : "Hand luggage only"}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="flight-details">
      {renderLeg(flight.outboundLeg)}
      {renderLeg(flight.inboundLeg)}
    </div>
  );
}

export default function FlightsStep() {
  const { state, selectFlight, resetToDates } = useBooking();
  const { flights, flightsStatus, flightPriceNotice } = state;
  const currency = state.offerMeta?.currency ?? "GBP";
  const [details, setDetails] = useState<Flight | null>(null);

  if (flightsStatus === "loading" || flightsStatus === "idle") {
    return (
      <div className="step-panel">
        <h1 className="step-title">Choose your flights</h1>
        <div className="panel-loading">
          <span className="spinner" />
          <p>Searching live flights and validating prices…</p>
        </div>
      </div>
    );
  }

  if (flightsStatus === "error" || !flights || !flights.length) {
    return (
      <div className="step-panel">
        <h1 className="step-title">Choose your flights</h1>
        <div className="no-results">
          <p>We couldn&rsquo;t find available flights for this stay.</p>
          <button className="btn btn--primary" onClick={resetToDates}>
            Choose different dates
          </button>
        </div>
      </div>
    );
  }

  const baseline = flights.find((f) => f.selected) ?? flights[0];
  const activeId = findProductByPrefix(state.payload.products, "F:")?.id ?? baseline.id;

  return (
    <div className="step-panel">
      <h1 className="step-title">Choose your flights</h1>

      {flightPriceNotice ? (
        <div className="notice">
          <Info size={16} /> {flightPriceNotice}
        </div>
      ) : null}

      <div className="option-list">
        {flights.map((flight) => {
          const logo = flight.outboundLeg?.segments[0]?.airlineLogo;
          const airline = flight.outboundLeg?.segments[0]?.airline;
          return (
            <div
              key={flight.id}
              className={`flight-card${flight.id === activeId ? " is-selected" : ""}`}
              onClick={() => selectFlight(flight.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectFlight(flight.id);
                }
              }}
            >
              <div className="flight-brand">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={airline ?? "Airline"} className="airline-logo" />
                ) : (
                  <Plane size={28} />
                )}
                <span className="flight-airline">{airline}</span>
              </div>
              <div className="flight-body">
                <LegSummary leg={flight.outboundLeg} />
                <LegSummary leg={flight.inboundLeg} />
                <button
                  className="link-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetails(flight);
                  }}
                >
                  View flight details
                </button>
              </div>
              <div className="flight-price">
                <PriceTag
                  isBaseline={flight.selected}
                  delta={flight.price - baseline.price}
                  total={flight.price}
                  currency={currency}
                />
              </div>
            </div>
          );
        })}
      </div>

      <StepNav stepId="flights" canContinue={state.stayValid} />

      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        title="Flight details"
        wide
      >
        {details ? <FlightDetails flight={details} /> : null}
      </Modal>
    </div>
  );
}
