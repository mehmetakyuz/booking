"use client";

import { useState } from "react";
import { useBooking } from "../BookingContext";
import { formatDelta, formatPrice } from "@/lib/payload";
import { Modal } from "../Modal";
import { IconCheck } from "../icons/Icons";
import type { LeisureOption, LeisureUnit } from "@/lib/types";

function ActivityDetailsModal({ unit, onClose }: { unit: LeisureUnit; onClose: () => void }) {
  return (
    <Modal title={unit.name} onClose={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {unit.image?.url && <img src={unit.image.url} alt={unit.name} className="activity-image" />}
      {unit.description && <div dangerouslySetInnerHTML={{ __html: unit.description }} />}
      {unit.additionalInformation && <div style={{ marginTop: 12 }} dangerouslySetInnerHTML={{ __html: unit.additionalInformation }} />}
      <dl className="activity-meta">
        {unit.duration && <><dt>Duration</dt><dd>{String(unit.duration)}</dd></>}
        {unit.startTime && <><dt>Start</dt><dd>{unit.startTime}</dd></>}
        {unit.groupType && <><dt>Group type</dt><dd>{unit.groupType}</dd></>}
      </dl>
    </Modal>
  );
}

function LeisureGroup({ leisure }: { leisure: LeisureOption }) {
  const { state, toggleActivity } = useBooking();
  const [details, setDetails] = useState<LeisureUnit | null>(null);
  const selectedId = state.payload.products.map(p => p.id).find(id => leisure.units.some(u => u.id === id));
  const basePrice = leisure.units.find(u => u.selected)?.price ?? leisure.units[0]?.price ?? 0;
  const title = leisure.title || leisure.units[0]?.name || "Activity";
  return (
    <div className="leisure-group">
      <div className="leisure-group-header">
        <div>
          <h3 className="leisure-group-title">{title}</h3>
          {leisure.date && <div className="leisure-group-date">{leisure.date}</div>}
          <div className="leisure-group-tag">{leisure.optional ? "Optional" : "Included"}</div>
        </div>
      </div>
      <div className="options-list">
        {leisure.units.map(u => {
          const isActive = selectedId === u.id;
          const delta = u.price != null ? (u.price - (basePrice ?? 0)) : null;
          return (
            <div
              key={u.id}
              className={`option-card option-card--compact ${isActive ? "option-card--active" : ""}`}
              onClick={() => void toggleActivity(leisure.id, u.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {u.image?.url && <img src={u.image.url} alt={u.name} className="option-card-thumb" />}
              <div className="option-card-body">
                <div className="option-card-title">{u.name}</div>
                {u.venue?.name && <div className="option-card-sub">{u.venue.name}</div>}
                <button type="button" className="link-button" onClick={(e) => { e.stopPropagation(); setDetails(u); }}>View details</button>
              </div>
              <div className="option-card-price">
                {leisure.optional ? formatPrice(u.price) : (delta != null && delta !== 0 ? <span className="option-card-delta">{formatDelta(delta)}</span> : formatPrice(u.price))}
              </div>
              {isActive && <div className="option-card-check"><IconCheck /></div>}
            </div>
          );
        })}
        {leisure.optional && (
          <div
            className={`option-card option-card--compact ${!selectedId ? "option-card--active" : ""}`}
            onClick={() => void toggleActivity(leisure.id, null)}
          >
            <div className="option-card-body">
              <div className="option-card-title">No thanks</div>
              <div className="option-card-sub">Skip this activity</div>
            </div>
            <div className="option-card-price">{formatPrice(0)}</div>
            {!selectedId && <div className="option-card-check"><IconCheck /></div>}
          </div>
        )}
      </div>
      {details && <ActivityDetailsModal unit={details} onClose={() => setDetails(null)} />}
    </div>
  );
}

export function StepActivities() {
  const { state, advance, goBack } = useBooking();
  if (state.activitiesLoading || !state.activities) {
    return <div className="step"><div className="loader">Loading activities…</div></div>;
  }
  const leisures = state.activities.leisures;
  if (leisures.length === 0) {
    return (
      <div className="step step-activities">
        <h1 className="step-title">Activities</h1>
        <p>No activities to choose for this package.</p>
        <div className="step-footer">
          <button type="button" className="btn btn-ghost" onClick={goBack}>← Back</button>
          <button type="button" className="btn btn-primary btn-large" onClick={advance}>Continue →</button>
        </div>
      </div>
    );
  }
  const included = leisures.filter(l => !l.optional);
  const optional = leisures.filter(l => l.optional);
  return (
    <div className="step step-activities">
      <h1 className="step-title">Make the most of your trip</h1>
      <p className="step-lede">We've curated a handful of special experiences you can add.</p>

      {included.length > 0 && (
        <div className="leisure-section">
          <h2 className="section-title">Included experiences</h2>
          {included.map(l => <LeisureGroup key={l.id} leisure={l} />)}
        </div>
      )}
      {optional.length > 0 && (
        <div className="leisure-section">
          <h2 className="section-title">Optional extras</h2>
          {optional.map(l => <LeisureGroup key={l.id} leisure={l} />)}
        </div>
      )}

      <div className="step-footer">
        <button type="button" className="btn btn-ghost" onClick={goBack}>← Back</button>
        <button type="button" className="btn btn-primary btn-large" onClick={advance} disabled={!!state.receiptError}>Continue →</button>
      </div>
    </div>
  );
}
