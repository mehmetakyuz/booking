"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "../BookingContext";
import { formatDelta, formatPrice } from "@/lib/payload";
import type { CalendarDateEntry } from "@/lib/types";
import { IconCalendar, IconChevronLeft, IconChevronRight, IconPeople } from "../icons/Icons";

// ------- Occupancy --------
function OccupancyDropdown() {
  const { state, setOccupancy } = useBooking();
  const [open, setOpen] = useState(false);
  const [adults, setAdults] = useState(() => state.payload.people.filter(p => p.age == null).length || 2);
  const [childAges, setChildAges] = useState<number[]>(() =>
    state.payload.people.filter(p => p.age != null).map(p => p.age as number)
  );
  const rules = state.offer!.occupancyRules;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const totalPeople = adults + childAges.length;
  const apply = async () => {
    await setOccupancy(adults, childAges);
    setOpen(false);
  };

  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="dropdown-trigger" onClick={() => setOpen(o => !o)}>
        <IconPeople /> <span>{adults} {adults === 1 ? "adult" : "adults"}{childAges.length ? `, ${childAges.length} ${childAges.length === 1 ? "child" : "children"}` : ""}</span>
        <span className="dropdown-caret">▾</span>
      </button>
      {open && (
        <div className="dropdown-panel">
          <div className="stepper-row">
            <div>
              <div className="stepper-label">Adults</div>
              <div className="stepper-sub">Age {rules.maxChildAge + 1 || 18}+</div>
            </div>
            <div className="stepper">
              <button type="button" disabled={adults <= (rules.minAdults || 1)} onClick={() => setAdults(a => Math.max(rules.minAdults || 1, a - 1))}>−</button>
              <span>{adults}</span>
              <button type="button" disabled={adults >= rules.maxAdults} onClick={() => setAdults(a => Math.min(rules.maxAdults, a + 1))}>+</button>
            </div>
          </div>
          <div className="stepper-row">
            <div>
              <div className="stepper-label">Children</div>
              <div className="stepper-sub">Age {rules.minChildAge}-{rules.maxChildAge}</div>
            </div>
            <div className="stepper">
              <button type="button" disabled={childAges.length <= rules.minChildren} onClick={() => setChildAges(c => c.slice(0, -1))}>−</button>
              <span>{childAges.length}</span>
              <button
                type="button"
                disabled={childAges.length >= rules.maxChildren || totalPeople >= (rules.maxAdults + rules.maxChildren)}
                onClick={() => setChildAges(c => [...c, rules.minChildAge])}
              >+</button>
            </div>
          </div>
          {childAges.map((age, i) => (
            <div className="stepper-row" key={i}>
              <div className="stepper-label">Child {i + 1} age</div>
              <select value={age} onChange={e => setChildAges(c => c.map((a, j) => j === i ? Number(e.target.value) : a))}>
                {Array.from({ length: rules.maxChildAge - rules.minChildAge + 1 }, (_, k) => rules.minChildAge + k).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          ))}
          <button type="button" className="btn btn-primary btn-block" onClick={apply}>Apply</button>
        </div>
      )}
    </div>
  );
}

// ------- Airport --------
function AirportDropdown() {
  const { state, setAirport } = useBooking();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const cal = state.calendar;
  if (!cal || cal.airports.length === 0) return null;
  const selected = state.payload.departureAirports?.[0];
  const selectedAirport = cal.airports.find(a => a.iataCode === selected) || cal.airports.find(a => a.selected) || cal.airports[0];
  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="dropdown-trigger" onClick={() => setOpen(o => !o)}>
        <span>Flying from: <strong>{selectedAirport.name} ({selectedAirport.iataCode})</strong></span>
        <span className="dropdown-caret">▾</span>
      </button>
      {open && (
        <div className="dropdown-panel dropdown-panel-list">
          {cal.airports.map(a => (
            <button
              key={a.iataCode}
              type="button"
              className={`dropdown-item ${a.iataCode === selectedAirport.iataCode ? "active" : ""}`}
              onClick={() => { void setAirport(a.iataCode); setOpen(false); }}
            >
              <span>{a.name} ({a.iataCode})</span>
              {a.price != null && <span className="dropdown-item-price">{formatPrice(a.price)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------- Packages --------
function PackageCards() {
  const { state, setPackageGroup } = useBooking();
  if (!state.calendar || state.calendar.packageGroups.length < 1) return null;
  const groups = state.calendar.packageGroups;
  const selected = state.payload.packageGroup;
  return (
    <div className="package-cards">
      <div className="section-title">Package</div>
      <div className="package-card-list">
        {groups.map(g => (
          <button
            type="button"
            key={g.id}
            className={`package-card ${selected === g.id ? "active" : ""}`}
            onClick={() => void setPackageGroup(g.id)}
          >
            <div className="package-card-name">{g.name}</div>
            {g.description && <div className="package-card-desc">{g.description}</div>}
            {g.price != null && <div className="package-card-price">{formatPrice(g.price)}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------- Nights chips --------
function NightsChips() {
  const { state, setNights } = useBooking();
  if (!state.calendar || state.calendar.nights.length === 0) return null;
  const current = state.payload.nights;
  return (
    <div className="nights-chips">
      <div className="section-title">How many nights?</div>
      <div className="chip-row">
        {state.calendar.nights.map((n, i) => {
          const key = n.nights == null ? "all" : String(n.nights);
          const isActive = (current == null && n.nights == null) || (current === n.nights);
          const label = n.nights == null ? "All nights" : `${n.nights} nights`;
          return (
            <button
              key={key + i}
              type="button"
              className={`chip ${isActive ? "active" : ""}`}
              onClick={() => void setNights(n.nights)}
            >{label}</button>
          );
        })}
      </div>
    </div>
  );
}

// ------- Calendar grid --------
function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function CalendarGrid() {
  const { state, selectDate } = useBooking();
  const cal = state.calendar;
  const [monthOffset, setMonthOffset] = useState(0);
  const isFlexible = state.payload.nights == null;

  const dateMap = useMemo(() => {
    const m = new Map<string, CalendarDateEntry>();
    cal?.dates.forEach(d => m.set(d.date, d));
    return m;
  }, [cal]);

  const today = useMemo(() => new Date(), []);
  const currentMonth = useMemo(() => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1));
    return d;
  }, [today, monthOffset]);

  if (!cal) return <div className="calendar-placeholder">Loading calendar…</div>;

  const year = currentMonth.getUTCFullYear();
  const month = currentMonth.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Monday-first offset
  const leading = (first.getUTCDay() + 6) % 7;

  const cells: (CalendarDateEntry | null | { empty: true })[] = [];
  for (let i = 0; i < leading; i++) cells.push({ empty: true });
  for (let day = 1; day <= days; day++) {
    const d = ymd(new Date(Date.UTC(year, month, day)));
    cells.push(dateMap.get(d) ?? null);
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });

  const selected = state.payload.selectedDate;
  const selectedNights = state.payload.nights;

  // flexible: also show end date highlight based on CalendarDateEntry.nights
  const selectedEntry = selected ? dateMap.get(selected) : null;

  const firstAvail = cal.dates[0]?.date;
  const lastAvail = cal.dates[cal.dates.length - 1]?.date;

  const headerMonth = currentMonth.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  const onPick = (entry: CalendarDateEntry) => {
    if (isFlexible) {
      // pick lowest-priced nights option for that day
      const opts = entry.nights || [];
      const best = opts.reduce<{nights:number,price:number|null}|null>((acc, cur) => {
        if (acc == null || (cur.price ?? Infinity) < (acc.price ?? Infinity)) return cur;
        return acc;
      }, null);
      const nights = best?.nights ?? (opts[0]?.nights ?? 3);
      void selectDate(entry.date, nights);
    } else {
      void selectDate(entry.date, selectedNights!);
    }
  };

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button type="button" className="icon-btn" onClick={() => setMonthOffset(o => Math.max(0, o - 1))} aria-label="Previous month" disabled={monthOffset === 0}>
          <IconChevronLeft />
        </button>
        <div className="calendar-month">{headerMonth}</div>
        <button type="button" className="icon-btn" onClick={() => setMonthOffset(o => o + 1)} aria-label="Next month">
          <IconChevronRight />
        </button>
      </div>
      <div className="calendar-weekdays">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((c, i) => {
          if (c && "empty" in c) return <div key={i} className="calendar-cell empty" />;
          if (!c) return <div key={i} className="calendar-cell unavailable" />;
          const isSelected = selected === c.date;
          return (
            <button
              type="button"
              key={i}
              className={`calendar-cell available ${isSelected ? "selected" : ""}`}
              onClick={() => onPick(c)}
              title={`${c.date}${c.price != null ? " · " + formatPrice(c.price) : ""}`}
            >
              <span className="calendar-day">{Number(c.date.slice(-2))}</span>
              {c.price != null && <span className="calendar-price">{formatPrice(c.price)}</span>}
            </button>
          );
        })}
      </div>
      {selectedEntry && isFlexible && selectedEntry.nights && selectedEntry.nights.length > 1 && (
        <div className="calendar-flex-nights">
          <div className="section-subtitle">Choose length of stay</div>
          <div className="chip-row">
            {selectedEntry.nights.map(opt => {
              const active = selectedNights === opt.nights;
              const basePrice = selectedEntry.nights?.[0]?.price ?? selectedEntry.price ?? 0;
              const delta = opt.price != null && basePrice != null ? opt.price - basePrice : null;
              return (
                <button
                  type="button"
                  key={opt.nights}
                  className={`chip ${active ? "active" : ""}`}
                  onClick={() => void selectDate(selectedEntry.date, opt.nights)}
                >
                  {opt.nights} nights
                  {delta != null && delta !== 0 && <span className="chip-delta">{formatDelta(delta)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="calendar-disclaimer">
        Prices are per person, based on {state.payload.people.length} {state.payload.people.length === 1 ? "person" : "people"} sharing.
        {firstAvail && lastAvail && <> Availability from {firstAvail} to {lastAvail}.</>}
      </div>
      {selected && (
        <button type="button" className="link-button" onClick={() => void selectDate("", state.payload.nights ?? 0)} style={{ visibility: "hidden" }}>Clear selection</button>
      )}
    </div>
  );
}

export function StepDates() {
  const { state, advance } = useBooking();
  const receiptOk = !!state.receipt && state.receipt.errors.length === 0 && !!state.payload.selectedDate;
  return (
    <div className="step step-dates">
      <h1 className="step-title">When would you like to go?</h1>
      <p className="step-lede">Choose who's travelling and pick dates that suit you.</p>
      <div className="step-controls">
        <OccupancyDropdown />
        {state.calendar && state.calendar.airports.length > 0 && <AirportDropdown />}
      </div>
      <PackageCards />
      <NightsChips />
      {state.calendarLoading && <div className="loading-banner">Loading availability…</div>}
      <CalendarGrid />
      <div className="step-footer">
        <button
          type="button"
          className="btn btn-primary btn-large"
          disabled={!receiptOk || state.receiptLoading}
          onClick={advance}
        >
          {state.receiptLoading ? "Pricing…" : "Continue"} <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
