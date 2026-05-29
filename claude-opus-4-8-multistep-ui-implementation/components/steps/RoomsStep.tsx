"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import {
  Accommodation,
  AccommodationBoard,
  AccommodationUnit,
} from "@/lib/booking/types";
import { findProductByPrefix } from "@/lib/booking/products";
import { facilityIcon } from "@/lib/booking/icons";
import OptionCard, { PriceTag } from "../OptionCard";
import Modal from "../Modal";
import Gallery from "../Gallery";
import StepNav from "./StepNav";

function deriveSelection(
  accommodations: Accommodation[],
  productId?: string,
): { hotel?: Accommodation; unit?: AccommodationUnit; board?: AccommodationBoard } {
  if (productId) {
    for (const hotel of accommodations) {
      for (const unit of hotel.units) {
        const board = unit.boards.find((b) => b.id === productId);
        if (board) return { hotel, unit, board };
        if (unit.id === productId) return { hotel, unit };
      }
    }
  }
  const hotel = accommodations.find((a) => a.selected) ?? accommodations[0];
  const unit = hotel?.units.find((u) => u.selected) ?? hotel?.units[0];
  const board = unit?.boards.find((b) => b.selected) ?? unit?.boards[0];
  return { hotel, unit, board };
}

export default function RoomsStep() {
  const { state, selectHotel, selectRoom, selectBoard } = useBooking();
  const { accommodations, accommodationsLoading } = state;
  const currency = state.offerMeta?.currency ?? "GBP";
  const [detailsHotel, setDetailsHotel] = useState<Accommodation | null>(null);

  if (accommodationsLoading || !accommodations) {
    return (
      <div className="step-panel">
        <h1 className="step-title">Choose your stay</h1>
        <div className="panel-loading">
          <span className="spinner" />
          <p>Finding hotels for your dates…</p>
        </div>
      </div>
    );
  }

  if (!accommodations.length) {
    return (
      <div className="step-panel">
        <h1 className="step-title">Choose your stay</h1>
        <p className="muted">No hotels available for this selection.</p>
        <StepNav stepId="rooms" canContinue={true} />
      </div>
    );
  }

  const productId = findProductByPrefix(state.payload.products, "A:")?.id;
  const { hotel: activeHotel, unit: activeUnit, board: activeBoard } =
    deriveSelection(accommodations, productId);

  const baselineHotel = accommodations.find((a) => a.selected) ?? accommodations[0];

  return (
    <div className="step-panel">
      <h1 className="step-title">Choose your stay</h1>

      <div className="option-list">
        {accommodations.map((hotel) => {
          const isActive = hotel.id === activeHotel?.id;
          return (
            <OptionCard
              key={hotel.id}
              selected={isActive}
              onClick={() => selectHotel(hotel.id)}
              media={
                hotel.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hotel.image} alt={hotel.name} />
                ) : null
              }
              price={
                <PriceTag
                  isBaseline={hotel.selected}
                  delta={hotel.price - baselineHotel.price}
                  total={hotel.price}
                  currency={currency}
                />
              }
            >
              <div className="card-heading">
                <h3>{hotel.name}</h3>
                {hotel.starRating ? (
                  <span className="stars">
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <Star key={i} size={13} fill="currentColor" />
                    ))}
                  </span>
                ) : null}
              </div>
              {hotel.subTitle ? <p className="card-sub">{hotel.subTitle}</p> : null}
              {hotel.city ? (
                <p className="card-meta">
                  {[hotel.city, hotel.country].filter(Boolean).join(", ")}
                </p>
              ) : null}
              <button
                className="link-action"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailsHotel(hotel);
                }}
              >
                View hotel details
              </button>
            </OptionCard>
          );
        })}
      </div>

      {activeHotel && activeHotel.units.length > 1 ? (
        <div className="subsection">
          <h2 className="subsection-title">Choose your room</h2>
          <div className="option-list">
            {activeHotel.units.map((unit) => {
              const baselineUnit =
                activeHotel.units.find((u) => u.selected) ?? activeHotel.units[0];
              return (
                <OptionCard
                  key={unit.id}
                  selected={unit.id === activeUnit?.id}
                  onClick={() => selectRoom(activeHotel.id, unit.id)}
                  media={
                    unit.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={unit.image} alt={unit.name} />
                    ) : null
                  }
                  price={
                    <PriceTag
                      isBaseline={unit.selected}
                      delta={unit.price - baselineUnit.price}
                      total={unit.price}
                      currency={currency}
                    />
                  }
                >
                  <div className="card-heading">
                    <h3>{unit.name}</h3>
                  </div>
                  {unit.description ? (
                    <p className="card-sub clamp-2">{unit.description}</p>
                  ) : null}
                </OptionCard>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeUnit && activeUnit.boards.length > 1 ? (
        <div className="subsection">
          <h2 className="subsection-title">Choose your meal plan</h2>
          <div className="board-list">
            {activeUnit.boards.map((board) => {
              const baselineBoard =
                activeUnit.boards.find((b) => b.selected) ?? activeUnit.boards[0];
              const isActive = board.id === activeBoard?.id;
              return (
                <button
                  key={board.id}
                  className={`board-chip${isActive ? " is-selected" : ""}`}
                  onClick={() => selectBoard(board.id)}
                >
                  <span className="board-chip-name">{board.name}</span>
                  <PriceTag
                    isBaseline={board.selected}
                    delta={board.price - baselineBoard.price}
                    total={board.price}
                    currency={currency}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <StepNav stepId="rooms" canContinue={state.stayValid} />

      <Modal
        open={!!detailsHotel}
        onClose={() => setDetailsHotel(null)}
        title={detailsHotel?.name}
        wide
      >
        {detailsHotel ? (
          <div className="hotel-details">
            <Gallery
              images={
                detailsHotel.imagePreviews.length
                  ? detailsHotel.imagePreviews
                  : detailsHotel.image
                    ? [detailsHotel.image]
                    : []
              }
              alt={detailsHotel.name}
            />
            {detailsHotel.address ? (
              <p className="card-meta">{detailsHotel.address}</p>
            ) : null}
            {detailsHotel.description ? (
              <p className="hotel-description">{detailsHotel.description}</p>
            ) : null}
            {detailsHotel.facilities.length ? (
              <div className="facility-chips">
                {detailsHotel.facilities.map((f, i) => {
                  const Icon = facilityIcon(f.icon);
                  return (
                    <span className="facility-chip" key={i}>
                      <Icon size={15} />
                      {f.name}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
