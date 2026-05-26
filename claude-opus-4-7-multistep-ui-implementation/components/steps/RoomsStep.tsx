"use client";

import { useEffect, useState } from "react";
import { useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";
import { findProductByPrefix } from "@/lib/booking/products";
import { Accommodation, AccommodationUnit, Board } from "@/lib/booking/types";
import { FacilityIcon } from "@/components/ui/Icon";
import { Gallery } from "@/components/ui/Gallery";
import { Modal } from "@/components/ui/Modal";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { LoadingBlock } from "@/components/ui/Spinner";
import { StepFooter } from "./StepFooter";

function baselinePrice<T extends { price: number | null; selected: boolean }>(
  items: T[],
): number | null {
  const sel = items.find((i) => i.selected) ?? items[0];
  return sel?.price ?? null;
}

interface Selection {
  hotel: Accommodation | null;
  unit: AccommodationUnit | null;
  board: Board | null;
}

function resolveSelection(list: Accommodation[], aid: string | undefined): Selection {
  if (aid) {
    for (const hotel of list) {
      for (const unit of hotel.units) {
        const board = unit.boards.find((b) => b.id === aid);
        if (board) return { hotel, unit, board };
        if (unit.id === aid)
          return { hotel, unit, board: unit.boards.find((b) => b.selected) ?? null };
      }
    }
  }
  // Backend-selected default fallback.
  const hotel = list.find((h) => h.selected) ?? list[0] ?? null;
  const unit = hotel ? hotel.units.find((u) => u.selected) ?? hotel.units[0] ?? null : null;
  const board = unit ? unit.boards.find((b) => b.selected) ?? unit.boards[0] ?? null : null;
  return { hotel, unit, board };
}

export function RoomsStep() {
  const { state, actions } = useBooking();
  const { accommodations, accommodationsLoading, offer } = state;
  const currency = offer.currency;
  const [detailHotel, setDetailHotel] = useState<Accommodation | null>(null);

  useEffect(() => {
    if (!accommodations && !accommodationsLoading) actions.loadAccommodations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (accommodationsLoading || !accommodations) {
    return (
      <div className="step-panel">
        <LoadingBlock label="Finding the best places to stay…" />
      </div>
    );
  }

  const aid = findProductByPrefix(state.payload.products, "A:")?.id;
  const { hotel, unit, board } = resolveSelection(accommodations, aid);

  const hotelBaseline = baselinePrice(accommodations);

  const selectHotel = (h: Accommodation) => {
    const u = h.units.find((x) => x.selected) ?? h.units[0];
    const b = u?.boards.find((x) => x.selected) ?? u?.boards[0];
    const id = b?.id ?? u?.id;
    if (id) actions.setAccommodationProduct({ id });
  };

  const selectUnit = (u: AccommodationUnit) => {
    const b = u.boards.find((x) => x.selected) ?? u.boards[0];
    const id = b?.id ?? u.id;
    actions.setAccommodationProduct({ id });
  };

  const selectBoard = (b: Board) => actions.setAccommodationProduct({ id: b.id });

  return (
    <div className="step-panel">
      <div className="step-header">
        <h1>Where would you like to stay?</h1>
        <p>Choose your hotel, room and board.</p>
      </div>

      <div className="step-section">
        <div className="step-section__title">Hotel</div>
        <div className="option-list">
          {accommodations.map((h) => {
            const isSel = hotel?.id === h.id;
            return (
              <div
                key={h.id}
                className={isSel ? "option-card option-card--selected" : "option-card"}
              >
                {h.image && (
                  <button
                    className="option-card__media"
                    onClick={() => selectHotel(h)}
                    aria-label={`Select ${h.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.image} alt={h.name} />
                  </button>
                )}
                <div className="option-card__body">
                  <button
                    onClick={() => selectHotel(h)}
                    style={{ background: "none", border: "none", textAlign: "left", padding: 0 }}
                  >
                    <div className="option-card__title">{h.name}</div>
                    {h.subTitle && <div className="option-card__sub">{h.subTitle}</div>}
                  </button>
                  {h.location && <div className="option-card__sub">{h.location}</div>}
                  <div className="option-card__actions">
                    <button
                      className="btn btn--tertiary"
                      onClick={() => setDetailHotel(h)}
                    >
                      View hotel details
                    </button>
                  </div>
                </div>
                <PriceBlock
                  price={h.price}
                  baseline={hotelBaseline}
                  isBaseline={h.selected}
                  currency={currency}
                />
              </div>
            );
          })}
        </div>
      </div>

      {hotel && hotel.units.length > 0 && (
        <div className="step-section">
          <div className="step-section__title">Room</div>
          <div className="option-list">
            {hotel.units.map((u) => {
              const isSel = unit?.id === u.id;
              const unitBaseline = baselinePrice(hotel.units);
              return (
                <button
                  key={u.id}
                  className={isSel ? "option-card option-card--selected" : "option-card"}
                  onClick={() => selectUnit(u)}
                >
                  {u.image && (
                    <span className="option-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u.image} alt={u.name} />
                    </span>
                  )}
                  <span className="option-card__body">
                    <span className="option-card__title">{u.name}</span>
                    {u.description && (
                      <span className="option-card__desc">{u.description}</span>
                    )}
                  </span>
                  <PriceBlock
                    price={u.price}
                    baseline={unitBaseline}
                    isBaseline={u.selected}
                    currency={currency}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {unit && unit.boards.length > 0 && (
        <div className="step-section">
          <div className="step-section__title">Board / meal plan</div>
          <div className="subcard-row">
            {unit.boards.map((b) => {
              const isSel = board?.id === b.id;
              const boardBaseline = baselinePrice(unit.boards);
              return (
                <button
                  key={b.id}
                  className={isSel ? "subcard subcard--selected" : "subcard"}
                  onClick={() => selectBoard(b)}
                >
                  <span>
                    <span className="subcard__name">{b.name}</span>
                    {b.description && <span className="subcard__desc">{b.description}</span>}
                  </span>
                  <PriceBlock
                    price={b.price}
                    baseline={boardBaseline}
                    isBaseline={b.selected}
                    currency={currency}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <StepFooter onContinue={actions.next} />

      {detailHotel && (
        <Modal title={detailHotel.name} onClose={() => setDetailHotel(null)} bare>
          <Gallery
            images={
              detailHotel.images.length
                ? detailHotel.images
                : detailHotel.image
                  ? [detailHotel.image]
                  : []
            }
            alt={detailHotel.name}
          />
          <div className="modal__body">
            <h2 className="modal__title">{detailHotel.name}</h2>
            {detailHotel.location && (
              <p style={{ color: "var(--grey-darkest)", fontSize: 14 }}>
                {detailHotel.location}
              </p>
            )}
            {detailHotel.description && (
              <p style={{ color: "var(--grey-darkest)", fontSize: 14 }}>
                {detailHotel.description}
              </p>
            )}
            {detailHotel.facilities.length > 0 && (
              <>
                <div className="step-section__title" style={{ marginTop: 16 }}>
                  Facilities
                </div>
                <div className="facility-grid">
                  {detailHotel.facilities.map((f, i) => (
                    <span className="facility-chip" key={i}>
                      <FacilityIcon token={f.icon} /> {f.name}
                    </span>
                  ))}
                </div>
              </>
            )}
            {detailHotel.price != null && (
              <p style={{ marginTop: 16, fontWeight: 700 }}>
                Total from {formatMoney(detailHotel.price, currency)}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
