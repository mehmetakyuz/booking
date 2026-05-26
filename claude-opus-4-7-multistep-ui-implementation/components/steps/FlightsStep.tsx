"use client";

import { useEffect, useState } from "react";
import { useBooking } from "@/lib/booking/context";
import { formatTime, minutesBetween, formatDuration } from "@/lib/booking/format";
import { cabinClassLabel } from "@/lib/booking/labels";
import { findProductByPrefix } from "@/lib/booking/products";
import { Flight, FlightLeg } from "@/lib/booking/types";
import { Modal } from "@/components/ui/Modal";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { StepFooter } from "./StepFooter";

function LegSummary({ leg, label }: { leg: FlightLeg | null; label: string }) {
  if (!leg || !leg.segments.length) return null;
  const first = leg.segments[0];
  const last = leg.segments[leg.segments.length - 1];
  const stops = leg.segments.length - 1;
  return (
    <div className="leg-summary">
      <span className="leg-summary__label">{label}</span>
      <span className="leg-summary__time">{formatTime(first.departTime)}</span>
      <span>{first.departAirport}</span>
      <span className="leg-summary__path" />
      <span style={{ fontSize: 12, color: "var(--grey-dark)" }}>
        {stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}`}
      </span>
      <span className="leg-summary__path" />
      <span className="leg-summary__time">{formatTime(last.arriveTime)}</span>
      <span>{last.arriveAirport}</span>
    </div>
  );
}

function FlightDetails({ flight, onClose }: { flight: Flight; onClose: () => void }) {
  const legs: { leg: FlightLeg | null; label: string }[] = [
    { leg: flight.outbound, label: "Outbound" },
    { leg: flight.inbound, label: "Return" },
  ];
  return (
    <Modal title="Flight details" onClose={onClose}>
      {legs.map(({ leg, label }) =>
        leg ? (
          <div key={label} style={{ marginBottom: 20 }}>
            <div className="step-section__title">{label}</div>
            {leg.segments.map((s, i) => {
              const dur = minutesBetween(s.departTime, s.arriveTime);
              return (
                <div className="segment" key={i}>
                  <div className="segment__times">
                    <div>{formatTime(s.departTime)} {s.departAirport}</div>
                    <div style={{ color: "var(--grey-dark)" }}>
                      {dur ? formatDuration(dur) : ""}
                    </div>
                    <div>{formatTime(s.arriveTime)} {s.arriveAirport}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {s.airlineName} {s.flightNumber}
                    </div>
                    {s.operatingAirlineName &&
                      s.operatingAirlineName !== s.airlineName && (
                        <div style={{ fontSize: 13, color: "var(--grey-dark)" }}>
                          Operated by {s.operatingAirlineName}
                        </div>
                      )}
                    {cabinClassLabel(s.cabinClass) && (
                      <div style={{ fontSize: 13, color: "var(--grey-darkest)" }}>
                        {cabinClassLabel(s.cabinClass)}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: "var(--grey-darkest)" }}>
                      {s.luggageIncluded
                        ? `Luggage included${s.luggageAllowance ? ` · ${s.luggageAllowance}` : ""}`
                        : "Hand luggage only"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null,
      )}
    </Modal>
  );
}

export function FlightsStep() {
  const { state, actions } = useBooking();
  const { flights, flightStage, flightPriceNotice, offer } = state;
  const [detail, setDetail] = useState<Flight | null>(null);

  useEffect(() => {
    if (flightStage === "idle") actions.loadFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (flightStage === "searching" || flightStage === "validating" || flightStage === "idle") {
    return (
      <div className="step-panel">
        <div className="stage-loader">
          <div className="spinner" />
          <div className="stage-loader__steps">
            <span
              className={
                flightStage === "validating"
                  ? "stage-loader__step--done"
                  : "stage-loader__step--active"
              }
            >
              Searching live flight availability…
            </span>
            <span
              className={
                flightStage === "validating" ? "stage-loader__step--active" : ""
              }
            >
              Confirming prices…
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (flightStage === "error" || !flights || !flights.length) {
    return (
      <div className="step-panel">
        <div className="empty-state">
          <h3>No flights available for these dates</h3>
          <p>
            We couldn&apos;t find flights for your selected stay. Please choose
            different travel dates to continue.
          </p>
          <button className="btn btn--primary" onClick={actions.resetToDates}>
            Change dates
          </button>
        </div>
      </div>
    );
  }

  const selectedId = findProductByPrefix(state.payload.products, "F:")?.id;
  const baseline = (flights.find((f) => f.selected) ?? flights[0])?.price ?? null;

  return (
    <div className="step-panel">
      <div className="step-header">
        <h1>Choose your flights</h1>
        <p>Prices confirmed live with the airline.</p>
      </div>

      {flightPriceNotice && (
        <div className="notice notice--warn">{flightPriceNotice}</div>
      )}

      <div className="option-list">
        {flights.map((f) => {
          const isSel = f.id === selectedId;
          return (
            <div
              key={f.id}
              className={isSel ? "option-card option-card--selected" : "option-card"}
            >
              <button
                className="flight-card__brand"
                onClick={() => actions.setFlight({ id: f.id })}
                aria-label="Select flight"
              >
                {f.airlineLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.airlineLogo} alt={f.airlineName ?? "Airline"} />
                ) : (
                  <span style={{ fontWeight: 600 }}>{f.airlineName}</span>
                )}
              </button>
              <div className="option-card__body">
                <LegSummary leg={f.outbound} label="Out" />
                {f.inbound && <LegSummary leg={f.inbound} label="Return" />}
                <div className="option-card__meta">
                  {cabinClassLabel(f.cabinClass) && (
                    <span className="badge">{cabinClassLabel(f.cabinClass)}</span>
                  )}
                  <span className="badge">
                    {f.luggageIncluded ? "Luggage included" : "Hand luggage"}
                  </span>
                </div>
                <div className="option-card__actions">
                  <button className="btn btn--tertiary" onClick={() => setDetail(f)}>
                    View flight details
                  </button>
                </div>
              </div>
              <PriceBlock
                price={f.price}
                baseline={baseline}
                isBaseline={f.selected}
                currency={offer.currency}
              />
            </div>
          );
        })}
      </div>

      <StepFooter onContinue={actions.next} />

      {detail && <FlightDetails flight={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
