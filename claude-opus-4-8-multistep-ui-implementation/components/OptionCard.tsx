"use client";

import { formatDelta, formatMoney } from "@/lib/booking/format";

// Price block shared across product cards: "Included" / "+£0" / "-£40" on top,
// resulting total beneath.
export function PriceTag({
  isBaseline,
  delta,
  total,
  currency,
}: {
  isBaseline: boolean;
  delta: number;
  total: number;
  currency: string;
}) {
  return (
    <div className="price-tag">
      <span
        className={`price-delta${
          isBaseline ? " price-delta--included" : delta < 0 ? " price-delta--down" : ""
        }`}
      >
        {isBaseline ? "Included" : formatDelta(delta, currency)}
      </span>
      <span className="price-total">{formatMoney(total, currency)} total</span>
    </div>
  );
}

export default function OptionCard({
  media,
  selected,
  onClick,
  children,
  price,
}: {
  media?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  price?: React.ReactNode;
}) {
  return (
    <div
      className={`option-card${selected ? " is-selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {media ? <div className="option-card-media">{media}</div> : null}
      <div className="option-card-body">
        <div className="option-card-content">{children}</div>
        {price ? <div className="option-card-price">{price}</div> : null}
      </div>
    </div>
  );
}
