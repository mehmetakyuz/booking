"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useBooking } from "@/lib/booking/context";
import { childAges as readChildAges, countAdults } from "@/lib/booking/steps";
import { Dropdown } from "@/components/ui/Dropdown";

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      <button
        className="stepper__btn"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label="Decrease"
      >
        <Minus size={16} />
      </button>
      <span className="stepper__value">{value}</span>
      <button
        className="stepper__btn"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export function OccupancyField() {
  const { state, actions } = useBooking();
  const rules = state.offer.occupancyRules;
  const editable = rules.maxAdults > rules.minAdults || rules.maxChildren > 0;

  const [open, setOpen] = useState(false);
  const [adults, setAdults] = useState(() => countAdults(state.payload.people));
  const [ages, setAges] = useState<number[]>(() => readChildAges(state.payload.people));

  // Resync local draft whenever the committed party changes.
  useEffect(() => {
    if (!open) {
      setAdults(countAdults(state.payload.people));
      setAges(readChildAges(state.payload.people));
    }
  }, [state.payload.people, open]);

  const summary = () => {
    const parts = [`${adults} ${adults === 1 ? "adult" : "adults"}`];
    if (ages.length) parts.push(`${ages.length} ${ages.length === 1 ? "child" : "children"}`);
    return parts.join(", ");
  };

  const setChildCount = (n: number) => {
    setAges((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(rules.minChildAge);
      next.length = n;
      return next;
    });
  };

  const apply = () => {
    actions.setOccupancy(adults, ages);
    setOpen(false);
  };

  if (!editable) {
    return (
      <button className="dropdown__trigger" disabled style={{ cursor: "default" }}>
        <span>{summary()}</span>
      </button>
    );
  }

  return (
    <Dropdown label={summary()} open={open} onOpenChange={setOpen}>
      <div className="occupancy-panel">
        <div className="occupancy-row">
          <div>
            <div className="occupancy-row__label">Adults</div>
            <div className="occupancy-row__sub">Age 18+</div>
          </div>
          <Stepper
            value={adults}
            min={Math.max(1, rules.minAdults)}
            max={rules.maxAdults}
            onChange={setAdults}
          />
        </div>

        {rules.maxChildren > 0 && (
          <div className="occupancy-row">
            <div>
              <div className="occupancy-row__label">Children</div>
              <div className="occupancy-row__sub">
                Age {rules.minChildAge}–{rules.maxChildAge}
              </div>
            </div>
            <Stepper
              value={ages.length}
              min={rules.minChildren}
              max={rules.maxChildren}
              onChange={setChildCount}
            />
          </div>
        )}

        {ages.length > 0 && (
          <div className="child-age-grid">
            {ages.map((age, i) => (
              <select
                key={i}
                value={age}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAges((prev) => prev.map((a, j) => (j === i ? v : a)));
                }}
              >
                {Array.from(
                  { length: rules.maxChildAge - rules.minChildAge + 1 },
                  (_, k) => rules.minChildAge + k,
                ).map((a) => (
                  <option key={a} value={a}>
                    Child {i + 1}: {a} yrs
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}

        <div className="occupancy-panel__footer">
          <button className="btn btn--primary btn--block" onClick={apply}>
            Apply
          </button>
        </div>
      </div>
    </Dropdown>
  );
}
