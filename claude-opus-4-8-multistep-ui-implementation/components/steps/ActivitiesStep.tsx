"use client";

import { useState } from "react";
import { Clock, Users } from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import { LeisureGroup, LeisureUnit } from "@/lib/booking/types";
import { formatDuration, tourTypeLabel } from "@/lib/booking/labels";
import OptionCard, { PriceTag } from "../OptionCard";
import Modal from "../Modal";
import Gallery from "../Gallery";
import StepNav from "./StepNav";

function dayLabel(date?: string): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function activeUnitId(group: LeisureGroup, productIds: Set<string>): string | null {
  const match = group.units.find((u) => productIds.has(u.id));
  return match?.id ?? null;
}

export default function ActivitiesStep() {
  const { state, selectActivityUnit, removeActivity } = useBooking();
  const { activities, activitiesLoading } = state;
  const currency = state.offerMeta?.currency ?? "GBP";
  const [details, setDetails] = useState<LeisureUnit | null>(null);

  if (activitiesLoading || !activities) {
    return (
      <div className="step-panel">
        <h1 className="step-title">Make it unforgettable</h1>
        <div className="panel-loading">
          <span className="spinner" />
          <p>Loading activities…</p>
        </div>
      </div>
    );
  }

  const productIds = new Set((state.payload.products ?? []).map((p) => p.id));
  const baseline = activities.baselinePrice;
  const included = activities.groups.filter((g) => !g.optional);
  const optional = activities.groups.filter((g) => g.optional);

  const renderUnitCard = (
    group: LeisureGroup,
    unit: LeisureUnit,
    opts: { isBaseline: boolean; baselinePrice: number; selected: boolean },
  ) => {
    const duration = formatDuration(unit.duration);
    const tour = tourTypeLabel(unit.groupType);
    return (
      <OptionCard
        key={unit.id}
        selected={opts.selected}
        onClick={() => selectActivityUnit(group.id, unit.id)}
        media={
          unit.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={unit.image} alt={unit.name} />
          ) : null
        }
        price={
          <PriceTag
            isBaseline={opts.isBaseline}
            delta={unit.price - opts.baselinePrice}
            total={unit.price}
            currency={currency}
          />
        }
      >
        <div className="card-heading">
          <h3>{unit.name}</h3>
        </div>
        <div className="card-badges">
          {duration ? (
            <span className="badge">
              <Clock size={12} /> {duration}
            </span>
          ) : null}
          {tour ? (
            <span className="badge">
              <Users size={12} /> {tour}
            </span>
          ) : null}
        </div>
        {unit.description ? <p className="card-sub clamp-2">{unit.description}</p> : null}
        <button
          className="link-action"
          onClick={(e) => {
            e.stopPropagation();
            setDetails(unit);
          }}
        >
          View details
        </button>
      </OptionCard>
    );
  };

  return (
    <div className="step-panel">
      <h1 className="step-title">Make it unforgettable</h1>

      {included.map((group) => {
        const baselineUnit = group.units.find((u) => u.selected) ?? group.units[0];
        const activeId = activeUnitId(group, productIds) ?? baselineUnit?.id ?? null;
        return (
          <div className="subsection" key={group.id}>
            <h2 className="subsection-title">{baselineUnit?.name ?? "Included activity"}</h2>
            {group.units.length > 1 ? (
              <p className="subsection-hint">Choose your preferred option</p>
            ) : null}
            <div className="option-list">
              {group.units.map((unit) =>
                renderUnitCard(group, unit, {
                  isBaseline: unit.selected,
                  baselinePrice: baselineUnit?.price ?? unit.price,
                  selected: unit.id === activeId,
                }),
              )}
            </div>
          </div>
        );
      })}

      {optional.map((group) => {
        const activeId = activeUnitId(group, productIds);
        return (
          <div className="subsection" key={group.id}>
            <h2 className="subsection-title">
              Optional excursion — {dayLabel(group.date)}
            </h2>
            <div className="option-list">
              {group.units.map((unit) =>
                renderUnitCard(group, unit, {
                  isBaseline: false,
                  baselinePrice: baseline,
                  selected: unit.id === activeId,
                }),
              )}
              <button
                className={`no-thanks${activeId === null ? " is-selected" : ""}`}
                onClick={() => removeActivity(group.id)}
              >
                No thanks
              </button>
            </div>
          </div>
        );
      })}

      <StepNav stepId="activities" canContinue={state.stayValid} />

      <Modal open={!!details} onClose={() => setDetails(null)} title={details?.name} wide>
        {details ? (
          <div className="activity-details">
            <Gallery
              images={details.images.length ? details.images : details.image ? [details.image] : []}
              alt={details.name}
            />
            <div className="card-badges">
              {formatDuration(details.duration) ? (
                <span className="badge">
                  <Clock size={12} /> {formatDuration(details.duration)}
                </span>
              ) : null}
              {tourTypeLabel(details.groupType) ? (
                <span className="badge">
                  <Users size={12} /> {tourTypeLabel(details.groupType)}
                </span>
              ) : null}
            </div>
            {details.description ? <p>{details.description}</p> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
