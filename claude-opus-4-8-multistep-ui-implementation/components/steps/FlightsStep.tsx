"use client";

import { useState } from "react";
import {
  Briefcase,
  Clock,
  Info,
  Luggage,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
} from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import { Flight, FlightLeg, FlightSegment } from "@/lib/booking/types";
import { findProductByPrefix } from "@/lib/booking/products";
import { cabinClassLabel, durationBetween } from "@/lib/booking/labels";
import { PriceTag } from "../OptionCard";
import Modal from "../Modal";
import StepNav from "./StepNav";

function time(dt?: string): string {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dateFull(dt?: string): string {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Days the arrival falls after departure (for overnight flights), used to
// render a "+1" badge next to the arrival time.
function dayOffset(dep?: string, arr?: string): number {
  if (!dep || !arr) return 0;
  const a = new Date(dep);
  const b = new Date(arr);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.max(0, Math.round((db - da) / 86400000));
}

function airportLine(iata?: string, city?: string): string {
  if (iata && city) return `${city} (${iata})`;
  return iata ?? city ?? "";
}

function segmentLuggage(seg: FlightSegment, leg?: FlightLeg): string {
  const included = seg.luggageIncluded ?? leg?.luggageIncluded;
  const allowance = seg.luggageAllowance ?? leg?.luggageAllowance;
  if (included) return allowance ? `Checked bag · ${allowance}` : "Checked bag included";
  return "Hand luggage only";
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

function Segment({ seg, leg }: { seg: FlightSegment; leg?: FlightLeg }) {
  const cabin = cabinClassLabel(seg.cabinClass);
  const duration = durationBetween(seg.departureTime, seg.arrivalTime);
  const flightCode =
    seg.airlineIata && seg.flightNumber
      ? `${seg.airlineIata} ${seg.flightNumber}`
      : seg.flightNumber ?? null;
  const arrOffset = dayOffset(seg.departureTime, seg.arrivalTime);

  return (
    <div className="fd-segment">
      <div className="fd-segment-head">
        {seg.airlineLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={seg.airlineLogo} alt={seg.airline ?? ""} className="airline-logo-sm" />
        ) : (
          <Plane size={20} className="fd-segment-head-icon" />
        )}
        <div className="fd-segment-head-text">
          <span className="fd-airline">{seg.airline ?? "Flight"}</span>
          <span className="fd-segment-sub">
            {flightCode ? <span className="fd-flight-code">{flightCode}</span> : null}
            {cabin ? <span>{cabin}</span> : null}
          </span>
        </div>
      </div>

      <div className="fd-timeline">
        <div className="fd-stop">
          <PlaneTakeoff size={16} className="fd-stop-icon" />
          <div className="fd-stop-body">
            <span className="fd-stop-time">{time(seg.departureTime)}</span>
            <span className="fd-stop-airport">
              {airportLine(seg.departureAirport, seg.departureCity)}
            </span>
            <span className="fd-stop-date">{dateFull(seg.departureTime)}</span>
          </div>
        </div>

        <div className="fd-leg-duration">
          <span className="fd-leg-line" />
          {duration ? (
            <span className="fd-duration-chip">
              <Clock size={12} /> {duration}
            </span>
          ) : null}
        </div>

        <div className="fd-stop">
          <PlaneLanding size={16} className="fd-stop-icon" />
          <div className="fd-stop-body">
            <span className="fd-stop-time">
              {time(seg.arrivalTime)}
              {arrOffset > 0 ? <sup className="fd-day-offset">+{arrOffset}</sup> : null}
            </span>
            <span className="fd-stop-airport">
              {airportLine(seg.arrivalAirport, seg.arrivalCity)}
            </span>
            <span className="fd-stop-date">{dateFull(seg.arrivalTime)}</span>
          </div>
        </div>
      </div>

      <div className="fd-segment-meta">
        <span className="fd-meta-item">
          <Luggage size={14} /> {segmentLuggage(seg, leg)}
        </span>
        {seg.operatingAirline && seg.operatingAirline !== seg.airline ? (
          <span className="fd-meta-item muted">Operated by {seg.operatingAirline}</span>
        ) : null}
      </div>
    </div>
  );
}

function Leg({ leg, kind }: { leg?: FlightLeg; kind: "outbound" | "inbound" }) {
  if (!leg || !leg.segments.length) return null;
  const first = leg.segments[0];
  const last = leg.segments[leg.segments.length - 1];
  const stops = leg.segments.length - 1;
  const totalDuration = durationBetween(first.departureTime, last.arrivalTime);

  return (
    <div className="fd-leg">
      <div className="fd-leg-header">
        <span className="fd-leg-kind">
          {kind === "outbound" ? (
            <PlaneTakeoff size={16} />
          ) : (
            <PlaneLanding size={16} />
          )}
          {leg.label ?? (kind === "outbound" ? "Outbound" : "Return")}
        </span>
        <span className="fd-leg-route">
          {airportLine(first.departureAirport, first.departureCity)}
          <span className="fd-arrow">→</span>
          {airportLine(last.arrivalAirport, last.arrivalCity)}
        </span>
        <span className="fd-leg-facts">
          {totalDuration ? (
            <span className="fd-leg-fact">
              <Clock size={13} /> {totalDuration}
            </span>
          ) : null}
          <span className="fd-leg-fact">
            {stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}`}
          </span>
        </span>
      </div>

      <div className="fd-segments">
        {leg.segments.map((s, i) => {
          const prev = leg.segments[i - 1];
          const layover = prev
            ? durationBetween(prev.arrivalTime, s.departureTime)
            : null;
          return (
            <div key={i}>
              {prev ? (
                <div className="fd-layover">
                  <Clock size={13} />
                  <span>
                    {layover ? `${layover} connection` : "Connection"} in{" "}
                    {airportLine(s.departureAirport, s.departureCity)}
                  </span>
                </div>
              ) : null}
              <Segment seg={s} leg={leg} />
            </div>
          );
        })}
      </div>

      {leg.handLuggageRules ? (
        <div className="fd-leg-note">
          <Briefcase size={14} /> {leg.handLuggageRules}
        </div>
      ) : null}
    </div>
  );
}

function FlightDetails({ flight }: { flight: Flight }) {
  return (
    <div className="flight-details">
      <Leg leg={flight.outboundLeg} kind="outbound" />
      <Leg leg={flight.inboundLeg} kind="inbound" />
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
