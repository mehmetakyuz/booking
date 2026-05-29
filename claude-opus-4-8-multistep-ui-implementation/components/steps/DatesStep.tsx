"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";
import Calendar from "../Calendar";
import Dropdown from "../Dropdown";
import StepNav from "./StepNav";

function countParty(state: ReturnType<typeof useBooking>["state"]) {
  const people = state.payload.people;
  const adults = people.filter((p) => !p.birthDate).length;
  const children = people.length - adults;
  return { adults, children };
}

function OccupancyField() {
  const { state, setOccupancy } = useBooking();
  const rules = state.offerMeta?.occupancyRules;
  const { adults, children } = countParty(state);

  const [open, setOpen] = useState(false);
  const [localAdults, setLocalAdults] = useState(adults);
  const [localAges, setLocalAges] = useState<number[]>(() =>
    state.payload.people.filter((p) => p.birthDate).map(() => rules?.minChildAge ?? 2),
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const summary = [
    `${adults} ${adults === 1 ? "adult" : "adults"}`,
    children > 0 ? `${children} ${children === 1 ? "child" : "children"}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const maxAdults = rules?.maxAdults ?? 6;
  const minAdults = 1;
  const maxChildren = rules?.maxChildren ?? 4;
  const minChildAge = rules?.minChildAge ?? 0;
  const maxChildAge = rules?.maxChildAge ?? 17;

  const apply = async () => {
    setOpen(false);
    await setOccupancy(localAdults, localAges);
  };

  return (
    <div className="occupancy" ref={ref}>
      <span className="field-label">Travellers</span>
      <button
        className="occupancy-trigger"
        onClick={() => {
          setLocalAdults(adults);
          setLocalAges(
            state.payload.people.filter((p) => p.birthDate).map(() => minChildAge || 2),
          );
          setOpen((o) => !o);
        }}
      >
        <span>{summary}</span>
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div className="occupancy-panel">
          <div className="occupancy-row">
            <span>Adults</span>
            <div className="stepper">
              <button
                onClick={() => setLocalAdults((a) => Math.max(minAdults, a - 1))}
                disabled={localAdults <= minAdults}
                aria-label="Fewer adults"
              >
                <Minus size={14} />
              </button>
              <span className="stepper-value">{localAdults}</span>
              <button
                onClick={() => setLocalAdults((a) => Math.min(maxAdults, a + 1))}
                disabled={localAdults >= maxAdults}
                aria-label="More adults"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="occupancy-row">
            <span>Children</span>
            <div className="stepper">
              <button
                onClick={() => setLocalAges((ages) => ages.slice(0, -1))}
                disabled={localAges.length <= 0}
                aria-label="Fewer children"
              >
                <Minus size={14} />
              </button>
              <span className="stepper-value">{localAges.length}</span>
              <button
                onClick={() =>
                  setLocalAges((ages) =>
                    ages.length < maxChildren ? [...ages, minChildAge || 2] : ages,
                  )
                }
                disabled={localAges.length >= maxChildren}
                aria-label="More children"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {localAges.map((age, i) => (
            <div className="occupancy-row occupancy-row--age" key={i}>
              <span>Child {i + 1} age</span>
              <select
                value={age}
                onChange={(e) =>
                  setLocalAges((ages) =>
                    ages.map((a, j) => (j === i ? Number(e.target.value) : a)),
                  )
                }
              >
                {Array.from(
                  { length: maxChildAge - minChildAge + 1 },
                  (_, k) => minChildAge + k,
                ).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <button className="btn btn--primary occupancy-apply" onClick={apply}>
            Apply
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function DatesStep() {
  const {
    state,
    setAirport,
    setPackageGroup,
    setNightsFilter,
  } = useBooking();
  const { calendar, payload, stayValid, calendarLoading } = state;
  const currency = state.offerMeta?.currency ?? "GBP";
  const disabled = calendarLoading;

  const airportOptions =
    calendar?.airports.map((a) => ({
      value: a.iataCode,
      label: `${a.name} (${a.iataCode})`,
      hint: `from ${formatMoney(a.price, currency)}`,
    })) ?? [];

  const selectedAirport = payload.departureAirports?.[0] ?? null;

  const nightsOptions = calendar?.nightsOptions ?? [];

  return (
    <div className="step-panel">
      <h1 className="step-title">When would you like to go?</h1>

      <div className={`dates-filters${disabled ? " is-disabled" : ""}`}>
        <OccupancyField />

        {airportOptions.length ? (
          <div className="filter-block">
            <span className="field-label">Departure airport</span>
            <Dropdown
              value={selectedAirport}
              options={airportOptions}
              onChange={(v) => setAirport(v)}
              placeholder="Choose airport"
              disabled={disabled}
            />
          </div>
        ) : null}
      </div>

      {calendar?.packageGroups.length ? (
        <div className="filter-block">
          <span className="field-label">Package</span>
          <div className="package-cards">
            {calendar.packageGroups.map((g) => {
              // Empty-string id = the valid "All packages" option.
              const isSelected = (payload.packageGroup ?? "") === g.id;
              return (
                <button
                  key={g.id || "__all"}
                  className={`package-card${isSelected ? " is-selected" : ""}`}
                  onClick={() => setPackageGroup(g.id)}
                  disabled={disabled}
                >
                  <span className="package-card-name">{g.name}</span>
                  {g.description ? (
                    <span className="package-card-desc">{g.description}</span>
                  ) : null}
                  <span className="package-card-price">
                    from {formatMoney(g.price, currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {nightsOptions.length ? (
        <div className="filter-block">
          <span className="field-label">Length of stay</span>
          <div className="nights-chips">
            {nightsOptions.map((n) => {
              const isSelected = state.nightsFilter === n.nights;
              return (
                <button
                  key={n.nights ?? "all"}
                  className={`chip${isSelected ? " is-selected" : ""}`}
                  onClick={() => setNightsFilter(n.nights)}
                  disabled={disabled}
                >
                  {n.nights == null ? "All nights" : `${n.nights} nights`}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="filter-block">
        <Calendar />
        <p className="calendar-disclaimer">
          Prices are estimated and calculated per person based on your selected
          traveller count (minimum of 2 adults). Included flight prices may still
          change during booking.
        </p>
      </div>

      <StepNav stepId="dates" canContinue={stayValid} />
    </div>
  );
}
