import { ItineraryIcon, typeFromTypename } from '@/components/ui/ItineraryIcon'
import type { ItineraryEvent } from '@/lib/booking/types'

export function ItineraryFull({ events }: { events: ItineraryEvent[] }) {
  if (!events.length) return <p>No itinerary details yet.</p>
  return (
    <ol className="modal-itinerary itinerary-timeline">
      {events.map((ev, i) => (
        <li key={i} className="itinerary-event">
          <span className="itinerary-timeline-dot" aria-hidden />
          <div className="itinerary-event-date">
            <strong>{ev.date}</strong>
            <span>{ev.label}</span>
            {ev.sublabel ? <span className="itinerary-event-sublabel">{ev.sublabel}</span> : null}
          </div>
          <div className="itinerary-event-components">
            {ev.components.map((c, j) => {
              const t = (c as any).type ?? typeFromTypename(c.__typename)
              const key = j
              if (t === 'accommodation') {
                const a = c as any
                return (
                  <div className="itinerary-component" key={key}>
                    <span className="itinerary-component-icon">
                      <ItineraryIcon type="accommodation" />
                    </span>
                    <div className="itinerary-component-detail">
                      <span className="itinerary-component-label">
                        {a.accommodation?.name ?? a.label}
                      </span>
                      <span className="itinerary-component-sublabel">
                        {a.unit?.name}
                        {a.board?.name ? ` · ${a.board.name}` : ''}
                      </span>
                      {a.checkinDate && a.checkoutDate ? (
                        <span className="itinerary-component-dates">
                          Check-in: {a.checkinDate} · Check-out: {a.checkoutDate}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              }
              if (t === 'flight') {
                const f = c as any
                const segs = f.leg?.segments ?? []
                const first = segs[0]
                const last = segs[segs.length - 1]
                const dep = first?.departure?.airport?.iataCode
                const arr = last?.arrival?.airport?.iataCode
                const airline = first?.airline?.name
                const title = f.leg?.label ?? f.label ?? 'Flight'
                return (
                  <div className="itinerary-component" key={key}>
                    <span className="itinerary-component-icon">
                      <ItineraryIcon type="flight" />
                    </span>
                    <div className="itinerary-component-detail">
                      <span className="itinerary-component-label">{title}</span>
                      {dep && arr ? (
                        <span className="itinerary-component-sublabel">
                          {dep} → {arr}
                          {airline ? ` · ${airline}` : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              }
              if (t === 'car') {
                const car = c as any
                return (
                  <div className="itinerary-component" key={key}>
                    <span className="itinerary-component-icon">
                      <ItineraryIcon type="car" />
                    </span>
                    <div className="itinerary-component-detail">
                      <span className="itinerary-component-label">
                        {car.car?.model ?? car.label ?? 'Car hire'}
                      </span>
                      <span className="itinerary-component-sublabel">
                        {car.pickupLocation?.name ?? ''}
                        {car.dropoffLocation?.name && car.dropoffLocation.name !== car.pickupLocation?.name
                          ? ` → ${car.dropoffLocation.name}`
                          : ''}
                      </span>
                    </div>
                  </div>
                )
              }
              const g = c as any
              return (
                <div className="itinerary-component" key={key}>
                  <span className="itinerary-component-icon">
                    <ItineraryIcon type={t} />
                  </span>
                  <div className="itinerary-component-detail">
                    <span className="itinerary-component-label">{g.label ?? 'Activity'}</span>
                    {g.sublabel ? (
                      <span className="itinerary-component-sublabel">{g.sublabel}</span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </li>
      ))}
    </ol>
  )
}
