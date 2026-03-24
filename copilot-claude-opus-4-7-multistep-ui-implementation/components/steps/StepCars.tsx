"use client";

import { useBooking } from "../BookingContext";
import { formatDelta, formatPrice } from "@/lib/payload";
import { IconCar, IconCheck } from "../icons/Icons";

export function StepCars() {
  const { state, selectCar, toggleCarExtra, startCars, advance, goBack, goToStepById } = useBooking();

  if (state.carsLoading) {
    return (
      <div className="step step-cars">
        <h1 className="step-title">Finding cars…</h1>
        <div className="loader"><div className="loader-spinner" /><p>Searching providers…</p></div>
      </div>
    );
  }
  if (state.carsStatus === "empty") {
    return (
      <div className="step step-cars">
        <h1 className="step-title">No cars available</h1>
        <div className="step-footer">
          <button type="button" className="btn btn-ghost" onClick={() => goToStepById("dates")}>← Back to dates</button>
          <button type="button" className="btn btn-primary" onClick={() => void startCars()}>Try again</button>
        </div>
      </div>
    );
  }
  if (state.carsStatus === "failed") {
    return (
      <div className="step step-cars">
        <h1 className="step-title">Car search failed</h1>
        <button type="button" className="btn btn-primary" onClick={() => void startCars()}>Retry</button>
      </div>
    );
  }

  const cars = state.cars || [];
  const selectedId = state.payload.products.find(p => p.id.startsWith("C:"))?.id;
  const basePrice = cars[0]?.price ?? 0;
  const selectedCarProduct = state.payload.products.find(p => p.id.startsWith("C:"));
  const extraIds = new Set((selectedCarProduct?.options || []).map(o => o.id));

  return (
    <div className="step step-cars">
      <h1 className="step-title">Add a hire car</h1>
      <div className="options-list">
        {cars.map(c => {
          const isActive = selectedId === c.id;
          const delta = c.price != null ? c.price - (basePrice ?? 0) : null;
          return (
            <div
              key={c.id}
              className={`option-card option-card--car ${isActive ? "option-card--active" : ""}`}
              onClick={() => void selectCar(c.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.vehicle?.photo?.url && <img src={c.vehicle.photo.url} alt={c.vehicle.modelName || "Car"} className="option-card-thumb" />}
              <div className="option-card-body">
                <div className="flight-icon-row"><IconCar /> <span>{c.vehicle?.modelName || "Car"}</span></div>
                <div className="option-card-sub">
                  {c.vehicle?.maxSeats} seats · {c.vehicle?.transmission} · {c.vehicle?.doors} doors
                </div>
                <div className="option-card-sub">Pick up: {c.pickupLocation?.name || c.pickupLocation?.airport?.name}</div>
              </div>
              <div className="option-card-price">
                {delta != null && delta !== 0 ? <span className="option-card-delta">{formatDelta(delta)}</span> : formatPrice(c.price)}
              </div>
              {isActive && <div className="option-card-check"><IconCheck /></div>}
            </div>
          );
        })}
      </div>

      {selectedId && state.carExtras && state.carExtras.length > 0 && (
        <div className="subsection">
          <h2 className="section-title">Extras</h2>
          <div className="options-list">
            {state.carExtras.map(ex => {
              const on = extraIds.has(ex.id);
              return (
                <div
                  key={ex.id}
                  className={`option-card option-card--compact ${on ? "option-card--active" : ""}`}
                  onClick={() => void toggleCarExtra(ex.id)}
                >
                  <div className="option-card-body">
                    <div className="option-card-title">{ex.name}</div>
                    {ex.extraType && <div className="option-card-sub">{ex.extraType}</div>}
                  </div>
                  <div className="option-card-price">{formatPrice(ex.price)}</div>
                  {on && <div className="option-card-check"><IconCheck /></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="step-footer">
        <button type="button" className="btn btn-ghost" onClick={goBack}>← Back</button>
        <button type="button" className="btn btn-primary btn-large" onClick={advance} disabled={!!state.receiptError}>Continue →</button>
      </div>
    </div>
  );
}
