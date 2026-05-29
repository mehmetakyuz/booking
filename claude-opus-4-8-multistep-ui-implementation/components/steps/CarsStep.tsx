"use client";

import { Car as CarIcon, FileText, Users, Briefcase, Cog } from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import { findProductByPrefix } from "@/lib/booking/products";
import { formatMoney } from "@/lib/booking/format";
import { carExtraPayment, carExtraTypeLabel, transmissionLabel } from "@/lib/booking/labels";
import OptionCard, { PriceTag } from "../OptionCard";
import StepNav from "./StepNav";

export default function CarsStep() {
  const { state, selectCar, toggleCarExtra, resetToDates } = useBooking();
  const { cars, carsStatus, carExtras, carExtrasLoading } = state;
  const currency = state.offerMeta?.currency ?? "GBP";

  if (carsStatus === "loading" || carsStatus === "idle") {
    return (
      <div className="step-panel">
        <h1 className="step-title">Add car hire</h1>
        <div className="panel-loading">
          <span className="spinner" />
          <p>Searching available cars…</p>
        </div>
      </div>
    );
  }

  if (carsStatus === "error" || !cars || !cars.length) {
    return (
      <div className="step-panel">
        <h1 className="step-title">Add car hire</h1>
        <div className="no-results">
          <p>We couldn&rsquo;t find available cars for this stay.</p>
          <button className="btn btn--primary" onClick={resetToDates}>
            Choose different dates
          </button>
        </div>
      </div>
    );
  }

  const baseline = cars.find((c) => c.selected) ?? cars[0];
  const activeCar = findProductByPrefix(state.payload.products, "C:");
  const activeId = activeCar?.id ?? baseline.id;
  const activeOptions = new Set((activeCar?.options ?? []).map((o) => o.id));

  return (
    <div className="step-panel">
      <h1 className="step-title">Add car hire</h1>

      <div className="option-list">
        {cars.map((car) => {
          const v = car.vehicle;
          return (
            <OptionCard
              key={car.id}
              selected={car.id === activeId}
              onClick={() => selectCar(car.id)}
              media={
                v?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.photo} alt={v.modelName ?? "Car"} />
                ) : (
                  <CarIcon size={36} />
                )
              }
              price={
                <PriceTag
                  isBaseline={car.selected}
                  delta={car.price - baseline.price}
                  total={car.price}
                  currency={currency}
                />
              }
            >
              <div className="card-heading">
                <h3>{v?.modelName ?? "Car hire"}</h3>
              </div>
              <div className="card-badges">
                {v?.maxSeats ? (
                  <span className="badge">
                    <Users size={12} /> {v.maxSeats} seats
                  </span>
                ) : null}
                {v?.maxBigSuitcases ? (
                  <span className="badge">
                    <Briefcase size={12} /> {v.maxBigSuitcases} bags
                  </span>
                ) : null}
                {transmissionLabel(v?.transmission) ? (
                  <span className="badge">
                    <Cog size={12} /> {transmissionLabel(v?.transmission)}
                  </span>
                ) : null}
              </div>
              {car.pickupLocation ? (
                <p className="card-meta">Pick-up: {car.pickupLocation}</p>
              ) : null}
            </OptionCard>
          );
        })}
      </div>

      <div className="subsection">
        <h2 className="subsection-title">Extras</h2>
        {carExtrasLoading ? (
          <div className="panel-loading panel-loading--inline">
            <span className="spinner" />
            <p>Loading extras…</p>
          </div>
        ) : carExtras && carExtras.length ? (
          <div className="option-list">
            {carExtras.map((extra) => {
              const selected = activeOptions.has(extra.id);
              return (
                <OptionCard
                  key={extra.id}
                  selected={selected}
                  onClick={() => toggleCarExtra(extra.id)}
                  price={
                    <div className="price-tag">
                      <span className="price-delta">
                        {formatMoney(extra.price, extra.currency ?? currency)}
                      </span>
                      <span className="price-total">{carExtraPayment(extra.prePayable)}</span>
                    </div>
                  }
                >
                  <div className="card-heading">
                    <h3>{extra.name}</h3>
                  </div>
                  <div className="card-badges">
                    {carExtraTypeLabel(extra.extraType) ? (
                      <span className="badge">{carExtraTypeLabel(extra.extraType)}</span>
                    ) : null}
                  </div>
                  <div className="extra-docs">
                    {extra.keyFactsUrl ? (
                      <a href={extra.keyFactsUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        <FileText size={12} /> Key facts
                      </a>
                    ) : null}
                    {extra.policyDocUrl ? (
                      <a href={extra.policyDocUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        <FileText size={12} /> Policy
                      </a>
                    ) : null}
                  </div>
                </OptionCard>
              );
            })}
          </div>
        ) : (
          <p className="muted">No extras available for this car.</p>
        )}
      </div>

      <StepNav stepId="cars" canContinue={state.stayValid} />
    </div>
  );
}
