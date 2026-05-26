import { formatDelta, formatMoney } from "@/lib/booking/format";

// Shared price block. The baseline (backend-selected default) shows "Included";
// every other option shows a signed delta vs baseline, with the resulting total
// as a smaller secondary line.
export function PriceBlock({
  price,
  baseline,
  isBaseline,
  currency,
}: {
  price: number | null;
  baseline: number | null;
  isBaseline: boolean;
  currency: string;
}) {
  return (
    <div className="option-card__price">
      {isBaseline ? (
        <span className="price-included">Included</span>
      ) : (
        <span className="price-delta">{formatDelta(price, baseline, currency)}</span>
      )}
      {price != null && <span className="price-total">{formatMoney(price, currency)}</span>}
    </div>
  );
}
