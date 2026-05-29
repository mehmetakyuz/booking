"use client";

import { ItineraryComponent, ItineraryEvent } from "@/lib/booking/types";
import { itineraryIcon } from "@/lib/booking/icons";

function formatDate(date?: string): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Pick a specific, customer-facing title for a component (never generic).
function componentTitle(c: ItineraryComponent): string {
  if (c.type === "accommodation") {
    return c.accommodationName || c.label || "Accommodation";
  }
  if (c.type === "flight") {
    return c.legLabel || c.label || "Flight";
  }
  if (c.type === "car") {
    return c.carModel || c.label || "Car hire";
  }
  // Leisure components carry a generic "Activity" label and the specific name
  // in the sublabel — always prefer the specific name.
  return c.sublabel || c.label || "Activity";
}

function componentDetail(c: ItineraryComponent): string | null {
  if (c.type === "accommodation") {
    const bits = [c.unitName, c.boardName].filter(Boolean);
    if (c.checkinDate && c.checkoutDate) {
      bits.push(`${formatDate(c.checkinDate)} → ${formatDate(c.checkoutDate)}`);
    }
    return bits.length ? bits.join(" · ") : null;
  }
  if (c.type === "flight") {
    // Avoid repeating the route already in the title/sublabel.
    const seg = c.segments?.[0];
    if (seg?.airline) return seg.airline;
    return c.sublabel ?? null;
  }
  if (c.type === "car") {
    const bits = [c.pickupLocation].filter(Boolean);
    return bits.length ? bits.join(" · ") : null;
  }
  // Activity: the specific name is already the title; avoid repeating it.
  return null;
}

function TimelineRow({ c }: { c: ItineraryComponent }) {
  const Icon = itineraryIcon(c.type);
  const detail = componentDetail(c);
  return (
    <div className="timeline-row">
      <div className="timeline-rail">
        <span className="timeline-dot">
          <Icon size={14} />
        </span>
      </div>
      <div className="timeline-content">
        <div className="timeline-title">{componentTitle(c)}</div>
        {detail ? <div className="timeline-detail">{detail}</div> : null}
      </div>
    </div>
  );
}

// Full day-grouped timeline shown inline in the summary panel.
export function ItineraryFull({ events }: { events: ItineraryEvent[] }) {
  if (!events.length) return <p className="muted">No itinerary available yet.</p>;
  return (
    <div className="timeline timeline--full">
      {events.map((e, i) => (
        <div className="timeline-day" key={i}>
          {e.date || e.label ? (
            <div className="timeline-day-head">
              {e.date ? <span className="timeline-day-date">{formatDate(e.date)}</span> : null}
              {e.label ? <span className="timeline-day-label">{e.label}</span> : null}
            </div>
          ) : null}
          {e.components.map((c, j) => (
            <TimelineRow key={j} c={c} />
          ))}
        </div>
      ))}
    </div>
  );
}
