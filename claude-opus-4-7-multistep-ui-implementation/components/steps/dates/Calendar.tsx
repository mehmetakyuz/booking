"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";
import { CalendarDay } from "@/lib/booking/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function Calendar() {
  const { state, actions } = useBooking();
  const { calendar, nightsFilter, payload, calendarLoading } = state;
  const flexible = nightsFilter == null;
  const [flexStart, setFlexStart] = useState<string | null>(null);

  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDay>();
    calendar?.days.forEach((d) => m.set(d.date, d));
    return m;
  }, [calendar]);

  const initialMonth = useMemo(() => {
    const ref = payload.selectedDate ?? calendar?.minDate;
    return ref ? parseISO(ref) : new Date();
  }, [calendar?.minDate, payload.selectedDate]);

  const [view, setView] = useState<Date>(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );

  // Flexible mode: valid checkout dates derived from the start day's nights[].
  const startDay = flexStart ? dayMap.get(flexStart) : undefined;
  const checkoutMap = useMemo(() => {
    const m = new Map<string, { nights: number; delta: number | null }>();
    if (flexible && startDay) {
      const startPrice = startDay.price ?? 0;
      for (const opt of startDay.nights) {
        const date = addDays(startDay.date, opt.nights);
        m.set(date, {
          nights: opt.nights,
          delta: opt.price != null ? opt.price - startPrice : null,
        });
      }
    }
    return m;
  }, [flexible, startDay]);

  if (!calendar) return null;

  const minDate = calendar.minDate ? parseISO(calendar.minDate) : null;
  const maxDate = calendar.maxDate ? parseISO(calendar.maxDate) : null;

  const canPrev =
    !minDate || monthKey(view) !== monthKey(new Date(minDate.getFullYear(), minDate.getMonth(), 1));
  const canNext =
    !maxDate || monthKey(view) !== monthKey(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1));

  const firstOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // Mon-first
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

  const onDayClick = (iso: string, day: CalendarDay) => {
    if (!flexible) {
      // Fixed-night flow: a click immediately implies checkout + reprice.
      actions.selectDate(iso, nightsFilter as number);
      return;
    }
    // Flexible flow.
    if (!flexStart) {
      setFlexStart(iso);
      return;
    }
    const co = checkoutMap.get(iso);
    if (co) {
      actions.selectDate(flexStart, co.nights);
      setFlexStart(null);
    } else {
      // Clicking another non-checkout day restarts start selection.
      setFlexStart(iso);
    }
  };

  const clearFlex = () => {
    setFlexStart(null);
    actions.clearDate();
  };

  const isDayAvailable = (day: CalendarDay | undefined): boolean => {
    if (!day) return false;
    if (day.quantity <= 0) return false;
    if (flexible) return day.price != null;
    return day.nights.some((n) => n.nights === nightsFilter && n.price != null);
  };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push(<div className="day-cell day-cell--empty" key={`b${i}`} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(new Date(view.getFullYear(), view.getMonth(), d));
    const day = dayMap.get(iso);
    const available = isDayAvailable(day);

    const isSelected = payload.selectedDate === iso;
    const isFlexStart = flexStart === iso;
    const checkout = checkoutMap.get(iso);

    let cls = "day-cell";
    let clickable = false;
    let priceLabel: string | null = null;
    let deltaLabel: string | null = null;
    let tip: string | null = null;

    if (flexStart) {
      // Checkout-selection mode.
      if (isFlexStart) {
        cls += " day-cell--selected";
        tip = "Check-in";
        clickable = true;
      } else if (checkout) {
        cls += " day-cell--available day-cell--in-range";
        clickable = true;
        tip = "Check-out";
        if (checkout.delta != null) {
          deltaLabel =
            (checkout.delta >= 0 ? "+" : "−") +
            formatMoney(Math.abs(checkout.delta), state.offer.currency);
        }
      } else {
        cls += " day-cell--unavailable";
      }
    } else if (available) {
      clickable = true;
      cls += isSelected ? " day-cell--selected" : " day-cell--available";
      if (day?.price != null)
        priceLabel = formatMoney(day.price, state.offer.currency);
      if (flexible) tip = "Check-in";
    } else {
      cls += " day-cell--unavailable";
      if (day?.price != null)
        priceLabel = formatMoney(day.price, state.offer.currency);
    }

    cells.push(
      <button
        type="button"
        key={iso}
        className={cls}
        disabled={!clickable}
        onClick={() => day && onDayClick(iso, day)}
      >
        {tip && <span className="day-cell__tip">{tip}</span>}
        <span>{d}</span>
        {deltaLabel ? (
          <span className="day-cell__delta">{deltaLabel}</span>
        ) : priceLabel ? (
          <span className="day-cell__price">{priceLabel}</span>
        ) : null}
      </button>,
    );
  }

  return (
    <div>
      <div
        className={calendarLoading ? "calendar relative is-loading-dim" : "calendar relative"}
        onClick={(e) => {
          // Click on neutral whitespace dismisses flexible checkout mode.
          if (flexStart && e.target === e.currentTarget) setFlexStart(null);
        }}
      >
        {calendarLoading && (
          <div className="loading-overlay">
            <div className="spinner" />
          </div>
        )}
        <div className="calendar__header">
          <button
            className="calendar__nav"
            disabled={!canPrev}
            aria-label="Previous month"
            onClick={() =>
              setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={20} />
          </button>
          <div className="calendar__month">
            {MONTHS[view.getMonth()]} {view.getFullYear()}
          </div>
          <button
            className="calendar__nav"
            disabled={!canNext}
            aria-label="Next month"
            onClick={() =>
              setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="calendar__weekdays">
          {WEEKDAYS.map((w) => (
            <div className="calendar__weekday" key={w}>
              {w}
            </div>
          ))}
        </div>
        <div className="calendar__grid">{cells}</div>
      </div>

      {flexible && (flexStart || payload.selectedDate) && (
        <div className="calendar-clear">
          <button className="btn btn--tertiary" onClick={clearFlex}>
            Clear selection
          </button>
        </div>
      )}

      <p className="calendar-disclaimer">
        Prices are estimated and calculated per person based on your selected
        traveller count (minimum 2 adults). Included-flight prices may still
        change during booking.
      </p>
    </div>
  );
}
