'use client'

import React from 'react'
import type { ItineraryComponent, ItineraryEvent } from '@/lib/types'
import { ComponentTypeIcon } from './icons'
import { cabinClassLabel, formatDateLong, formatTime } from '@/lib/format'

// Vertical timeline: a thin connecting line with circular dot markers, content
// to the right of the rail. Shared by the compact preview and the full modal.
export function ItineraryTimeline({ events, compact }: { events: ItineraryEvent[]; compact?: boolean }) {
  if (!events.length) return null
  return (
    <ol className={`itinerary-timeline${compact ? ' is-compact' : ''}`}>
      {events.map((event, i) => (
        <li key={i} className="timeline-event">
          <span className="timeline-dot" aria-hidden />
          <div className="timeline-content">
            <div className="timeline-event-head">
              {event.date ? <span className="timeline-date">{formatDateLong(event.date)}</span> : null}
              {event.label ? <span className="timeline-event-label">{event.label}</span> : null}
            </div>
            {compact ? (
              <CompactComponents components={event.components} />
            ) : (
              <FullComponents components={event.components} />
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function componentTitle(c: ItineraryComponent): string {
  switch (c.type) {
    case 'accommodation':
      return c.accommodationName || c.label || 'Accommodation'
    case 'flight':
      return c.legLabel || c.label || 'Flight'
    case 'car':
      return c.carModel || c.label || 'Car hire'
    case 'activity':
      // The API's leisure label is a generic "Activity"; the specific
      // activity name arrives in the sublabel.
      return c.sublabel || c.label || 'Activity'
    default:
      return c.label || c.sublabel || 'Trip item'
  }
}

function CompactComponents({ components }: { components: ItineraryComponent[] }) {
  return (
    <ul className="timeline-compact-list">
      {components.map((c, i) => (
        <li key={i} className="timeline-compact-row">
          <span className="timeline-type-badge">
            <ComponentTypeIcon type={c.type} size={14} />
          </span>
          <span className="timeline-compact-label">{componentTitle(c)}</span>
        </li>
      ))}
    </ul>
  )
}

function FullComponents({ components }: { components: ItineraryComponent[] }) {
  return (
    <div className="timeline-card-list">
      {components.map((c, i) => (
        <div key={i} className="timeline-card">
          <span className="timeline-type-badge">
            <ComponentTypeIcon type={c.type} size={15} />
          </span>
          <div className="timeline-card-body">
            <p className="timeline-card-title">{componentTitle(c)}</p>
            {c.type === 'accommodation' ? (
              <>
                {c.unitName || c.boardName ? (
                  <p className="timeline-card-sub">{[c.unitName, c.boardName].filter(Boolean).join(' · ')}</p>
                ) : null}
                {c.checkinDate && c.checkoutDate ? (
                  <p className="timeline-card-meta">
                    Check-in {formatDateLong(c.checkinDate)} · Check-out {formatDateLong(c.checkoutDate)}
                  </p>
                ) : null}
              </>
            ) : null}
            {c.type === 'flight' && c.segments?.length ? (
              <div className="timeline-flight-segments">
                {c.segments.map((s, j) => (
                  <p key={j} className="timeline-card-meta">
                    {s.airline ? `${s.airline} · ` : ''}
                    {formatTime(s.departureTime)}–{formatTime(s.arrivalTime)}
                    {s.cabinClass ? ` · ${cabinClassLabel(s.cabinClass)}` : ''}
                  </p>
                ))}
              </div>
            ) : null}
            {c.type === 'car' ? (
              <>
                {c.pickupLocation ? <p className="timeline-card-meta">Pick-up: {c.pickupLocation}</p> : null}
                {c.dropoffLocation && c.dropoffLocation !== c.pickupLocation ? (
                  <p className="timeline-card-meta">Drop-off: {c.dropoffLocation}</p>
                ) : null}
              </>
            ) : null}
            {(c.type === 'activity' || c.type === 'transfer' || c.type === 'other') &&
            c.sublabel &&
            c.sublabel !== componentTitle(c) ? (
              <p className="timeline-card-sub">{c.sublabel}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
