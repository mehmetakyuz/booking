"use client";

import { Check, FileText, Snowflake, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";
import { carExtraTypeLabel, transmissionLabel } from "@/lib/booking/labels";
import { findProductByPrefix } from "@/lib/booking/products";
import { CarExtraOption } from "@/lib/booking/types";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { Spinner } from "@/components/ui/Spinner";
import { StepFooter } from "./StepFooter";

function ExtraCard({
  extra,
  selected,
  currency,
  onToggle,
}: {
  extra: CarExtraOption;
  selected: boolean;
  currency: string;
  onToggle: () => void;
}) {
  const typeLabel = carExtraTypeLabel(extra.extraType);
  return (
    <button
      className={selected ? "subcard subcard--selected" : "subcard"}
      onClick={onToggle}
    >
      <span>
        <span className="subcard__name">
          {extra.name}
          {selected && <Check size={16} style={{ marginLeft: 8, verticalAlign: "middle" }} />}
        </span>
        <span className="subcard__desc">
          {typeLabel && <>{typeLabel} · </>}
          {extra.prePayable ? "Pay now" : "Pay at desk"}
          {extra.policyDocUrl && (
            <>
              {" · "}
              <a href={extra.policyDocUrl} target="_blank" rel="noreferrer">
                <FileText size={12} style={{ verticalAlign: "middle" }} /> Policy
              </a>
            </>
          )}
          {extra.keyFactsUrl && (
            <>
              {" · "}
              <a href={extra.keyFactsUrl} target="_blank" rel="noreferrer">
                Key facts
              </a>
            </>
          )}
        </span>
      </span>
      <span className="option-card__price">
        <span className="price-delta">
          {extra.price != null ? `+${formatMoney(extra.price, currency)}` : ""}
        </span>
      </span>
    </button>
  );
}

export function CarsStep() {
  const { state, actions } = useBooking();
  const { cars, carStage, carExtras, carExtrasLoading, offer } = state;
  const selectedCarId = findProductByPrefix(state.payload.products, "C:")?.id;
  const loadedExtrasFor = useRef<string | null>(null);

  useEffect(() => {
    if (carStage === "idle") actions.loadCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load extras whenever the selected car changes.
  useEffect(() => {
    if (selectedCarId && loadedExtrasFor.current !== selectedCarId) {
      loadedExtrasFor.current = selectedCarId;
      actions.loadCarExtras(selectedCarId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCarId]);

  if (carStage === "searching" || carStage === "idle") {
    return (
      <div className="step-panel">
        <div className="stage-loader">
          <Spinner />
          <div className="stage-loader__steps">
            <span className="stage-loader__step--active">Searching for car hire…</span>
          </div>
        </div>
      </div>
    );
  }

  if (carStage === "error" || !cars || !cars.length) {
    return (
      <div className="step-panel">
        <div className="empty-state">
          <h3>No car hire available</h3>
          <p>We couldn&apos;t find car hire for your stay. Please choose different dates.</p>
          <button className="btn btn--primary" onClick={actions.resetToDates}>
            Change dates
          </button>
        </div>
      </div>
    );
  }

  const baseline = (cars.find((c) => c.selected) ?? cars[0])?.price ?? null;
  const selectedCar = state.payload.products.find((p) => p.id === selectedCarId);
  const selectedExtraIds = new Set((selectedCar?.options ?? []).map((o) => o.id));

  return (
    <div className="step-panel">
      <div className="step-header">
        <h1>Add a hire car</h1>
        <p>Choose your vehicle and any extras.</p>
      </div>

      <div className="option-list">
        {cars.map((c) => {
          const isSel = c.id === selectedCarId;
          return (
            <button
              key={c.id}
              className={isSel ? "option-card option-card--selected" : "option-card"}
              onClick={() => actions.setCar({ id: c.id })}
            >
              {c.image && (
                <span className="option-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image} alt={c.modelName ?? "Car"} />
                </span>
              )}
              <span className="option-card__body">
                <span className="option-card__title">{c.modelName}</span>
                <span className="option-card__meta">
                  {transmissionLabel(c.transmission) && (
                    <span className="badge">{transmissionLabel(c.transmission)}</span>
                  )}
                  {c.seats != null && (
                    <span className="badge">
                      <Users size={12} /> {c.seats}
                    </span>
                  )}
                  {c.airConditioning && (
                    <span className="badge">
                      <Snowflake size={12} /> A/C
                    </span>
                  )}
                </span>
                {c.pickupName && (
                  <span className="option-card__sub">Pick-up: {c.pickupName}</span>
                )}
              </span>
              <PriceBlock
                price={c.price}
                baseline={baseline}
                isBaseline={c.selected}
                currency={offer.currency}
              />
            </button>
          );
        })}
      </div>

      {selectedCarId && (
        <div className="step-section" style={{ marginTop: 24 }}>
          <div className="step-section__title">Car extras</div>
          {carExtrasLoading ? (
            <Spinner small />
          ) : carExtras && carExtras.length ? (
            <div className="subcard-row">
              {carExtras.map((e) => (
                <ExtraCard
                  key={e.id}
                  extra={e}
                  selected={selectedExtraIds.has(e.id)}
                  currency={offer.currency}
                  onToggle={() =>
                    actions.setCarExtra(selectedCarId, e, !selectedExtraIds.has(e.id))
                  }
                />
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--grey-dark)", fontSize: 14 }}>
              No extras available for this vehicle.
            </p>
          )}
        </div>
      )}

      <StepFooter onContinue={actions.next} />
    </div>
  );
}
