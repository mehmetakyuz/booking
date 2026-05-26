"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useBooking } from "@/lib/booking/context";
import { dateParts, formatDuration } from "@/lib/booking/format";
import { tourTypeLabel } from "@/lib/booking/labels";
import { getLeisureIdForGroup } from "@/lib/booking/products";
import { LeisureGroup, LeisureUnit } from "@/lib/booking/types";
import { Gallery } from "@/components/ui/Gallery";
import { Modal } from "@/components/ui/Modal";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { LoadingBlock } from "@/components/ui/Spinner";
import { StepFooter } from "./StepFooter";

function ActivityCard({
  unit,
  price,
  baseline,
  isBaseline,
  selected,
  currency,
  onSelect,
  onDetails,
}: {
  unit: LeisureUnit;
  price: number | null;
  baseline: number | null;
  isBaseline: boolean;
  selected: boolean;
  currency: string;
  onSelect: () => void;
  onDetails: () => void;
}) {
  const duration = formatDuration(unit.durationMinutes);
  const tour = tourTypeLabel(unit.groupType);
  return (
    <div className={selected ? "option-card option-card--selected" : "option-card"}>
      {unit.image && (
        <button className="option-card__media" onClick={onSelect} aria-label={`Select ${unit.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unit.image} alt={unit.name ?? ""} />
        </button>
      )}
      <div className="option-card__body">
        <button
          onClick={onSelect}
          style={{ background: "none", border: "none", textAlign: "left", padding: 0 }}
        >
          <div className="option-card__title">{unit.name}</div>
        </button>
        {unit.description && <div className="option-card__desc">{unit.description}</div>}
        <div className="option-card__meta">
          {duration && <span className="badge">{duration}</span>}
          {tour && <span className="badge">{tour}</span>}
        </div>
        <div className="option-card__actions">
          <button className="btn btn--tertiary" onClick={onDetails}>
            View details
          </button>
        </div>
      </div>
      <PriceBlock price={price} baseline={baseline} isBaseline={isBaseline} currency={currency} />
    </div>
  );
}

function dayLabel(date: string | null): string {
  const p = dateParts(date);
  return p ? `${p.weekday} ${p.day} ${p.month}` : "";
}

export function ActivitiesStep() {
  const { state, actions } = useBooking();
  const { leisure, leisureLoading, offer } = state;
  const currency = offer.currency;
  const [detail, setDetail] = useState<LeisureUnit | null>(null);

  useEffect(() => {
    if (!leisure && !leisureLoading) actions.loadLeisure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (leisureLoading || !leisure) {
    return (
      <div className="step-panel">
        <LoadingBlock label="Loading available activities…" />
      </div>
    );
  }

  const included = leisure.groups.filter((g) => !g.optional);
  const optional = leisure.groups.filter((g) => g.optional);
  const basePrice = leisure.basePrice;

  const includedSelectedId = (g: LeisureGroup) =>
    getLeisureIdForGroup(state.payload.products, g.id) ??
    (g.units.find((u) => u.selected) ?? g.units[0])?.id;

  return (
    <div className="step-panel">
      <div className="step-header">
        <h1>Make it yours</h1>
        <p>Review what&apos;s included and add optional experiences.</p>
      </div>

      {included.map((g) => {
        const baseUnit = g.units.find((u) => u.selected) ?? g.units[0];
        const activeId = includedSelectedId(g);
        return (
          <div className="step-section" key={g.id}>
            <div className="step-section__title">Included experience · {dayLabel(g.date)}</div>
            <div className="option-list">
              {g.units.map((u) => (
                <ActivityCard
                  key={u.id}
                  unit={u}
                  price={u.price}
                  baseline={baseUnit?.price ?? null}
                  isBaseline={u.selected}
                  selected={u.id === activeId}
                  currency={currency}
                  onSelect={() => actions.setLeisure(g.id, { id: u.id })}
                  onDetails={() => setDetail(u)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {optional.length > 0 && (
        <div className="step-section">
          <div className="step-section__title">Optional experiences</div>
          {optional.map((g) => {
            const selectedId = getLeisureIdForGroup(state.payload.products, g.id);
            return (
              <div key={g.id} style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--grey-dark)",
                    marginBottom: 8,
                  }}
                >
                  {dayLabel(g.date)}
                </div>
                <div className="option-list">
                  {g.units.map((u) => (
                    <ActivityCard
                      key={u.id}
                      unit={u}
                      price={u.price}
                      baseline={basePrice}
                      isBaseline={false}
                      selected={u.id === selectedId}
                      currency={currency}
                      onSelect={() => actions.setLeisure(g.id, { id: u.id })}
                      onDetails={() => setDetail(u)}
                    />
                  ))}
                  <button
                    className={
                      selectedId
                        ? "subcard"
                        : "subcard subcard--selected"
                    }
                    onClick={() => actions.setLeisure(g.id, null)}
                  >
                    <span className="subcard__name">No thanks</span>
                    {!selectedId && <Check size={18} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StepFooter onContinue={actions.next} />

      {detail && (
        <Modal title={detail.name ?? "Activity"} onClose={() => setDetail(null)} bare>
          <Gallery
            images={detail.images.length ? detail.images : detail.image ? [detail.image] : []}
            alt={detail.name ?? ""}
          />
          <div className="modal__body">
            <h2 className="modal__title">{detail.name}</h2>
            <div className="option-card__meta">
              {formatDuration(detail.durationMinutes) && (
                <span className="badge">{formatDuration(detail.durationMinutes)}</span>
              )}
              {tourTypeLabel(detail.groupType) && (
                <span className="badge">{tourTypeLabel(detail.groupType)}</span>
              )}
            </div>
            {detail.description && (
              <p style={{ color: "var(--grey-darkest)", fontSize: 14, marginTop: 12 }}>
                {detail.description}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
