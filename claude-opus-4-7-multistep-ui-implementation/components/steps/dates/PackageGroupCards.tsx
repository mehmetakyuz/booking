"use client";

import { useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";

export function PackageGroupCards() {
  const { state, actions } = useBooking();
  const groups = state.calendar?.packageGroups ?? [];
  // "" is the valid "All packages" selection.
  const selected = state.payload.packageGroup;

  if (groups.length <= 1) return null;

  return (
    <div className="package-cards">
      {groups.map((g) => (
        <button
          key={g.id || "all"}
          className={
            g.id === selected
              ? "package-card package-card--selected"
              : "package-card"
          }
          onClick={() => actions.setPackageGroup(g.id)}
        >
          <span className="package-card__name">{g.name}</span>
          {g.description && <span className="package-card__desc">{g.description}</span>}
          {g.price != null && (
            <span className="package-card__price">
              from {formatMoney(g.price, state.offer.currency)} pp
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
