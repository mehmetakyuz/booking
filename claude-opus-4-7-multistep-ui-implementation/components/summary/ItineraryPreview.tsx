import { ItineraryIcon, typeFromTypename } from '@/components/ui/ItineraryIcon'
import type { ItineraryEvent } from '@/lib/booking/types'

function pickComponentLabel(c: ItineraryEvent['components'][number]): string {
  const cc = c as any
  if (cc.type === 'accommodation' || String(cc.__typename).includes('Accommodation'))
    return cc.accommodation?.name ?? cc.label ?? 'Stay'
  if (cc.type === 'flight' || String(cc.__typename).includes('Flight'))
    return cc.leg?.label ?? cc.label ?? 'Flight'
  if (cc.type === 'car' || String(cc.__typename).includes('Car'))
    return cc.car?.model ?? cc.label ?? 'Car hire'
  return cc.label ?? cc.sublabel ?? 'Activity'
}

export function ItineraryPreview({ events, limit }: { events: ItineraryEvent[]; limit?: number }) {
  const list = limit ? events.slice(0, limit) : events
  return (
    <ol className="itinerary-timeline itinerary-timeline--preview">
      {list.map((ev, i) => (
        <li key={i} className="itinerary-preview-row">
          <span className="itinerary-timeline-dot" aria-hidden />
          <span className="itinerary-preview-date">{ev.date}</span>
          <span className="itinerary-preview-label">{ev.label}</span>
          <span className="itinerary-preview-icons">
            {ev.components.map((c, j) => {
              const t = (c as any).type ?? typeFromTypename(c.__typename)
              return (
                <span key={j} className="itinerary-preview-icon" aria-label={pickComponentLabel(c)}>
                  <ItineraryIcon type={t} />
                </span>
              )
            })}
          </span>
        </li>
      ))}
    </ol>
  )
}
