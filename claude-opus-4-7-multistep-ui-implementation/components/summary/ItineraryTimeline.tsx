import { dateParts, formatTime } from "@/lib/booking/format";
import { ItineraryComponent, ItineraryEvent } from "@/lib/booking/types";
import { ItineraryIcon } from "@/components/ui/Icon";

function eventDateLabel(date: string | null): string {
  const p = dateParts(date);
  if (!p) return "";
  return `${p.weekday} ${p.day} ${p.month}`;
}

function subFor(c: ItineraryComponent, eventDate: string | null): string | null {
  if (c.type === "accommodation") {
    const ci = dateParts(c.checkinDate ?? null);
    const co = dateParts(c.checkoutDate ?? null);
    const room = [c.unitName, c.boardName].filter(Boolean).join(" · ");
    if (ci && co) {
      const stay = `${ci.day} ${ci.month} → ${co.day} ${co.month}`;
      return room ? `${room} · ${stay}` : stay;
    }
    return room || c.sublabel;
  }
  if (c.type === "flight") {
    // Avoid repeating the route (already in the label); show departure time.
    const dep = c.segments?.[0]?.departTime;
    return dep ? `Departs ${formatTime(dep)}` : c.sublabel;
  }
  if (c.type === "car") {
    if (c.pickupName && c.dropoffName) {
      return c.pickupName === c.dropoffName
        ? `Pick-up & drop-off · ${c.pickupName}`
        : `${c.pickupName} → ${c.dropoffName}`;
    }
    return c.sublabel;
  }
  return c.sublabel;
}

export function ItineraryTimeline({
  events,
  limit,
}: {
  events: ItineraryEvent[];
  limit?: number;
}) {
  const rows: { c: ItineraryComponent; date: string | null }[] = [];
  for (const ev of events) {
    for (const c of ev.components) {
      rows.push({ c, date: ev.date });
    }
  }
  const shown = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="timeline">
      {shown.map(({ c, date }, i) => {
        const sub = subFor(c, date);
        return (
          <div className="timeline__event" key={i}>
            <span className="timeline__dot">
              <ItineraryIcon type={c.type} size={13} />
            </span>
            {date && <div className="timeline__date">{eventDateLabel(date)}</div>}
            <div className="timeline__label">{c.label}</div>
            {sub && <div className="timeline__sub">{sub}</div>}
          </div>
        );
      })}
    </div>
  );
}
