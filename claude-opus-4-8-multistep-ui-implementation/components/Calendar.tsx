"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import { CalendarDate } from "@/lib/booking/types";
import { formatDelta, formatMoney } from "@/lib/booking/format";
import { addDays } from "@/lib/booking/dates";

function ym(date: string): string {
  return date.slice(0, 7);
}

function monthLabel(ymStr: string): string {
  const d = new Date(ymStr + "-01T00:00:00");
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default function Calendar() {
  const { state, selectDate, clearFlexSelection } = useBooking();
  const { calendar, calendarLoading, nightsFilter, flexStartDate, payload } = state;
  const currency = payload.offerMeta?.currency ?? "GBP";
  const selectedDate = payload.selectedDate;

  const dates = calendar?.dates ?? [];
  const byDate = useMemo(() => {
    const m = new Map<string, CalendarDate>();
    for (const d of dates) m.set(d.date, d);
    return m;
  }, [dates]);

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const d of dates) set.add(ym(d.date));
    return Array.from(set).sort();
  }, [dates]);

  const [monthIdx, setMonthIdx] = useState(0);
  // Clamp month index to available months.
  const activeMonthIdx = Math.min(monthIdx, Math.max(0, months.length - 1));
  const activeMonth = months[activeMonthIdx];

  // Flexible checkout mode: derive valid checkout dates from the start date.
  const flexInfo = useMemo(() => {
    if (nightsFilter != null || !flexStartDate) return null;
    const start = byDate.get(flexStartDate);
    if (!start) return null;
    const map = new Map<string, number>(); // checkoutDate -> deltaPrice
    for (const n of start.nights) {
      map.set(addDays(flexStartDate, n.nights), n.price - start.price);
    }
    return map;
  }, [nightsFilter, flexStartDate, byDate]);

  if (!activeMonth) {
    return (
      <div className="calendar">
        {calendarLoading ? (
          <div className="calendar-loading">
            <span className="spinner" />
          </div>
        ) : (
          <p className="muted">No dates available for this selection.</p>
        )}
      </div>
    );
  }

  // Build the day grid for the active month.
  const [y, mo] = activeMonth.split("-").map(Number);
  const firstOfMonth = new Date(y, mo - 1, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, mo, 0).getDate();

  const cells: ({ date: string; day: number } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${activeMonth}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d });
  }

  const flexMode = nightsFilter == null && !!flexStartDate;

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          className="calendar-chevron"
          onClick={() => setMonthIdx((i) => Math.max(0, activeMonthIdx - 1))}
          disabled={activeMonthIdx === 0}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="calendar-month">{monthLabel(activeMonth)}</span>
        <button
          className="calendar-chevron"
          onClick={() =>
            setMonthIdx((i) => Math.min(months.length - 1, activeMonthIdx + 1))
          }
          disabled={activeMonthIdx >= months.length - 1}
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div
        className="calendar-grid"
        onClick={(e) => {
          // Clicking neutral whitespace dismisses flexible checkout mode.
          if (flexMode && e.target === e.currentTarget) clearFlexSelection();
        }}
      >
        {cells.map((cell, i) => {
          if (!cell) return <span key={i} className="calendar-cell calendar-cell--empty" />;
          const data = byDate.get(cell.date);
          const available = !!data && data.quantity > 0;

          let cls = "calendar-cell";
          let price: number | null = data?.price ?? null;
          let deltaLabel: string | null = null;
          let title: string | undefined;
          let clickable = available;

          if (flexMode) {
            if (cell.date === flexStartDate) {
              cls += " is-start";
              title = "Check-in";
              clickable = true;
            } else if (flexInfo?.has(cell.date)) {
              cls += " is-checkout";
              const delta = flexInfo.get(cell.date)!;
              deltaLabel = formatDelta(delta, currency);
              title = "Check-out";
              clickable = true;
              price = null;
            } else {
              cls += " is-muted";
              clickable = false;
              price = null;
            }
          } else {
            if (!available) cls += " is-unavailable";
            if (cell.date === selectedDate) cls += " is-selected";
          }

          return (
            <button
              key={i}
              className={cls}
              disabled={!clickable}
              title={title}
              onClick={() => clickable && selectDate(cell.date)}
            >
              <span className="calendar-day">{cell.day}</span>
              {deltaLabel ? (
                <span className="calendar-price">{deltaLabel}</span>
              ) : price != null ? (
                <span className="calendar-price">
                  {formatMoney(price, currency)}
                </span>
              ) : null}
            </button>
          );
        })}

        {calendarLoading ? (
          <div className="calendar-overlay">
            <span className="spinner" />
          </div>
        ) : null}
      </div>

      {flexMode ? (
        <button className="calendar-clear" onClick={() => clearFlexSelection()}>
          Clear selection
        </button>
      ) : null}
    </div>
  );
}
