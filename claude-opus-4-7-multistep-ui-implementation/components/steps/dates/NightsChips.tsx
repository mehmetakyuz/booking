"use client";

import { useBooking } from "@/lib/booking/context";

export function NightsChips() {
  const { state, actions } = useBooking();
  const options = state.calendar?.nightOptions ?? [];
  const current = state.nightsFilter;

  if (!options.length) return null;

  return (
    <div className="chip-row">
      {options.map((o) => {
        const isAll = o.nights == null;
        const selected = current === o.nights;
        return (
          <button
            key={isAll ? "all" : o.nights}
            className={selected ? "chip chip--selected" : "chip"}
            onClick={() => actions.setNightsFilter(o.nights)}
          >
            {isAll ? "All nights" : `${o.nights} nights`}
          </button>
        );
      })}
    </div>
  );
}
