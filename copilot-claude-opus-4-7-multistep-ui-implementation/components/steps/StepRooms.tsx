"use client";

import { useMemo, useState } from "react";
import { useBooking } from "../BookingContext";
import { formatDelta, formatPrice } from "@/lib/payload";
import { FacilityIcon, IconCheck } from "../icons/Icons";
import { Modal } from "../Modal";
import type { AccommodationOption, AccommodationUnit } from "@/lib/types";

function HotelDetailsModal({ hotel, onClose }: { hotel: AccommodationOption; onClose: () => void }) {
  const images = (hotel.imagePreviews && hotel.imagePreviews.length ? hotel.imagePreviews : hotel.image ? [{ url: hotel.image.url, title: null }] : []);
  const [idx, setIdx] = useState(0);
  const img = images[idx];
  return (
    <Modal title={hotel.name} onClose={onClose}>
      {img && (
        <div className="hotel-gallery">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.title || hotel.name} />
          {images.length > 1 && (
            <div className="hotel-gallery-nav">
              <button type="button" onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}>‹</button>
              <span>{idx + 1}/{images.length}</span>
              <button type="button" onClick={() => setIdx(i => (i + 1) % images.length)}>›</button>
            </div>
          )}
        </div>
      )}
      {hotel.venue?.formattedAddress && <div className="hotel-address">{hotel.venue.formattedAddress}</div>}
      {hotel.description && <div className="hotel-description" dangerouslySetInnerHTML={{ __html: hotel.description }} />}
      {hotel.facilities && hotel.facilities.length > 0 && (
        <div className="facilities">
          <div className="section-subtitle">Facilities</div>
          <div className="facility-grid">
            {hotel.facilities.map((f, i) => (
              <div className="facility-chip" key={i}>
                <FacilityIcon token={f.icon} /> <span>{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function StepRooms() {
  const { state, setAccommodationSelection, advance, goBack } = useBooking();
  const res = state.accommodations;
  const [detailsHotel, setDetailsHotel] = useState<AccommodationOption | null>(null);

  const selectedUnitId = state.payload.products.find(p => p.id.startsWith("A:"))?.id;
  const selectedBoardId = state.payload.products.filter(p => p.id.startsWith("A:")).slice(1)[0]?.id;

  const { currentHotel, currentUnit } = useMemo(() => {
    if (!res) return { currentHotel: null, currentUnit: null };
    for (const h of res.accommodations) {
      for (const u of h.units) if (u.id === selectedUnitId) return { currentHotel: h, currentUnit: u };
    }
    const h = res.accommodations[0];
    return { currentHotel: h, currentUnit: h?.units[0] };
  }, [res, selectedUnitId]);

  if (state.accommodationsLoading || !res) {
    return <div className="step"><div className="loader">Loading hotels…</div></div>;
  }

  const basePrice = res.basePrice ?? 0;

  return (
    <div className="step step-rooms">
      <h1 className="step-title">Choose your hotel</h1>
      <p className="step-lede">Every hotel in our collection is hand-picked. Upgrade for a different view or style.</p>

      <div className="options-list">
        {res.accommodations.map(h => {
          const isActive = currentHotel?.id === h.id;
          const delta = h.price != null && basePrice != null ? h.price - basePrice : null;
          return (
            <div
              key={h.id}
              className={`option-card ${isActive ? "option-card--active" : ""}`}
              onClick={() => {
                const firstUnit = h.units.find(u => u.selected) || h.units[0];
                if (!firstUnit) return;
                const firstBoard = firstUnit.boards.find(b => b.selected) || firstUnit.boards[0];
                void setAccommodationSelection(h.id, firstUnit.id, firstBoard?.id);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {h.image?.url && <img src={h.image.url} alt={h.name} className="option-card-image" />}
              <div className="option-card-body">
                <div className="option-card-header">
                  <div className="option-card-title">{h.name}</div>
                  {h.starRating && <div className="option-card-stars">{h.starRating}</div>}
                </div>
                {h.venue?.city && <div className="option-card-sub">{h.venue.city}</div>}
                {h.subTitle && <div className="option-card-desc">{h.subTitle}</div>}
                <div className="option-card-footer">
                  <button type="button" className="link-button" onClick={(e) => { e.stopPropagation(); setDetailsHotel(h); }}>View details</button>
                  <div className="option-card-price">
                    {delta == null ? formatPrice(h.price) : <span className="option-card-delta">{formatDelta(delta)}</span>}
                  </div>
                </div>
              </div>
              {isActive && <div className="option-card-check"><IconCheck /></div>}
            </div>
          );
        })}
      </div>

      {currentHotel && currentHotel.units.length > 1 && (
        <div className="subsection">
          <h2 className="section-title">Room type</h2>
          <div className="options-list">
            {currentHotel.units.map((u: AccommodationUnit) => {
              const isActive = currentUnit?.id === u.id;
              const delta = u.price != null && currentHotel.price != null ? u.price - currentHotel.price : null;
              return (
                <div
                  key={u.id}
                  className={`option-card option-card--compact ${isActive ? "option-card--active" : ""}`}
                  onClick={() => {
                    const firstBoard = u.boards.find(b => b.selected) || u.boards[0];
                    void setAccommodationSelection(currentHotel.id, u.id, firstBoard?.id);
                  }}
                >
                  <div className="option-card-body">
                    <div className="option-card-title">{u.name}</div>
                    {u.subTitle && <div className="option-card-sub">{u.subTitle}</div>}
                  </div>
                  <div className="option-card-price">
                    {delta == null ? formatPrice(u.price) : <span className="option-card-delta">{formatDelta(delta)}</span>}
                  </div>
                  {isActive && <div className="option-card-check"><IconCheck /></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {currentUnit && currentUnit.boards.length > 1 && (
        <div className="subsection">
          <h2 className="section-title">Meal plan</h2>
          <div className="options-list">
            {currentUnit.boards.map(b => {
              const isActive = selectedBoardId === b.id || (b.selected && !selectedBoardId);
              const delta = b.price != null && currentUnit.price != null ? b.price - currentUnit.price : null;
              return (
                <div
                  key={b.id}
                  className={`option-card option-card--compact ${isActive ? "option-card--active" : ""}`}
                  onClick={() => void setAccommodationSelection(currentHotel!.id, currentUnit.id, b.id)}
                >
                  <div className="option-card-body">
                    <div className="option-card-title">{b.name}</div>
                    {b.description && <div className="option-card-sub">{b.description}</div>}
                  </div>
                  <div className="option-card-price">
                    {delta == null ? formatPrice(b.price) : <span className="option-card-delta">{formatDelta(delta)}</span>}
                  </div>
                  {isActive && <div className="option-card-check"><IconCheck /></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="step-footer">
        <button type="button" className="btn btn-ghost" onClick={goBack}>← Back</button>
        <button type="button" className="btn btn-primary btn-large" onClick={advance} disabled={!!state.receiptError}>
          Continue <span aria-hidden>→</span>
        </button>
      </div>

      {detailsHotel && <HotelDetailsModal hotel={detailsHotel} onClose={() => setDetailsHotel(null)} />}
    </div>
  );
}
