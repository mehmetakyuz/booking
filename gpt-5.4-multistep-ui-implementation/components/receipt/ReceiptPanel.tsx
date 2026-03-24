'use client'

import { useEffect, useMemo, useState } from 'react'
import { CarFront, Hotel, Plane, Sparkles } from 'lucide-react'
import { useBooking } from '@/lib/booking/context'
import { formatPrice } from '@/lib/utils/price'

function formatTripDay(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric' }).format(date)
}

function formatTripMonthYear(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date)
}

function formatTripWeekday(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date)
}

function formatTimelineDate(value?: string | null) {
  if (!value) return 'Day to be confirmed'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'long',
  }).format(date)
}

function formatShortTripDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'short',
  }).format(date)
}

function getItineraryType(component: {
  type?: string
  accommodationName?: string | null
  flightSegments?: unknown[]
  carModel?: string | null
  pickupLocationName?: string | null
}) {
  if (component.flightSegments?.length) return 'flight'
  if (component.accommodationName) return 'accommodation'
  if (component.carModel || component.pickupLocationName) return 'car'
  if (component.type?.includes('Accommodation')) return 'accommodation'
  if (component.type?.includes('Flight')) return 'flight'
  if (component.type?.includes('Car')) return 'car'
  return 'activity'
}

function isGenericActivityLabel(value?: string | null) {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized === 'activity' || normalized === 'included activity' || normalized === 'optional activity'
}

function getItineraryItemTitle(input: {
  type: 'accommodation' | 'flight' | 'car' | 'activity'
  componentLabel?: string | null
  componentSublabel?: string | null
  eventLabel?: string | null
  eventSublabel?: string | null
}) {
  if (input.type === 'activity') {
    if (!isGenericActivityLabel(input.componentLabel) && input.componentLabel) return input.componentLabel
    if (input.componentSublabel) return input.componentSublabel
    if (!isGenericActivityLabel(input.eventLabel) && input.eventLabel) return input.eventLabel
    if (input.eventSublabel) return input.eventSublabel
  }

  return input.componentLabel || input.eventLabel || input.componentSublabel || input.eventSublabel || 'Itinerary item'
}

function getItineraryPreviewTitle(event: {
  label: string
  sublabel: string
  components: Array<{
    type: string
    label: string
    sublabel: string
    accommodationName?: string | null
    flightSegments?: unknown[]
    carModel?: string | null
    pickupLocationName?: string | null
  }>
}) {
  const primaryComponent = event.components[0]
  if (!primaryComponent) {
    return getItineraryItemTitle({
      type: 'activity',
      eventLabel: event.label,
      eventSublabel: event.sublabel,
    })
  }

  const type = getItineraryType(primaryComponent) as 'accommodation' | 'flight' | 'car' | 'activity'
  return getItineraryItemTitle({
    type,
    componentLabel: primaryComponent.label,
    componentSublabel: primaryComponent.sublabel,
    eventLabel: event.label,
    eventSublabel: event.sublabel,
  })
}

function ItineraryIcon({ type }: { type: 'accommodation' | 'flight' | 'car' | 'activity' }) {
  if (type === 'flight') {
    return <Plane aria-hidden="true" className="itinerary-icon-svg" strokeWidth={1.8} />
  }

  if (type === 'accommodation') {
    return <Hotel aria-hidden="true" className="itinerary-icon-svg" strokeWidth={1.8} />
  }

  if (type === 'car') {
    return <CarFront aria-hidden="true" className="itinerary-icon-svg" strokeWidth={1.8} />
  }

  return <Sparkles aria-hidden="true" className="itinerary-icon-svg" strokeWidth={1.8} />
}

export function ReceiptPanel({ mobile = false }: { mobile?: boolean }) {
  const {
    state: { accommodations, offer, payload, receipt, receiptLoading },
  } = useBooking()
  const [openPanel, setOpenPanel] = useState<'included' | 'excluded' | 'info' | 'itinerary' | null>(null)

  const selectedAccommodationDetails = useMemo(() => {
    const unitProduct = payload.products.find((product) => product.group === 0)
    if (!unitProduct) {
      return null
    }

    for (const accommodation of accommodations) {
      const unit = accommodation.units.find((item) => item.id === unitProduct.id)
      if (!unit) {
        continue
      }

      const boardProduct = payload.products.find((product) => unit.boards.some((board) => board.id === product.id))
      const board = unit.boards.find((item) => item.id === boardProduct?.id) ?? null

      return {
        hotelName: accommodation.name,
        roomName: unit.name,
        boardName: board?.name ?? null,
      }
    }

    return null
  }, [accommodations, payload.products])

  const modalTitle = useMemo(() => {
    if (openPanel === 'included') return "What's included"
    if (openPanel === 'excluded') return "What's excluded"
    if (openPanel === 'info') return 'Trip information'
    if (openPanel === 'itinerary') return 'Full itinerary'
    return ''
  }, [openPanel])

  const itineraryDays = useMemo(() => {
    if (!receipt) return []

    const grouped = new Map<
      string,
      {
        rawDate: string
        items: Array<{ type: 'accommodation' | 'flight' | 'car' | 'activity'; title: string; subtitle?: string; meta: string[] }>
      }
    >()

    for (const event of receipt.itinerary) {
      const key = event.date || event.label
      if (!grouped.has(key)) {
        grouped.set(key, {
          rawDate: event.date,
          items: [],
        })
      }

      const day = grouped.get(key)!
      if (event.components.length) {
        for (const component of event.components) {
          const type = getItineraryType(component) as 'accommodation' | 'flight' | 'car' | 'activity'
          const meta: string[] = []
          let subtitle = component.sublabel || event.sublabel || undefined

          if (component.unitName) meta.push(component.unitName)
          if (component.boardName) meta.push(component.boardName)
          if (component.checkinDate) meta.push(`Check-in: ${formatShortTripDate(component.checkinDate)}`)
          if (component.checkoutDate) meta.push(`Check-out: ${formatShortTripDate(component.checkoutDate)}`)
          if (component.stayNights != null) meta.push(`${component.stayNights} nights`)
          if (component.flightSegments?.length) {
            component.flightSegments.forEach((segment) => {
              const carrier = [segment.airlineName, segment.flightNumber].filter(Boolean).join(' ')
              const route = [segment.departureAirportCode, segment.arrivalAirportCode].filter(Boolean).join(' → ')
              if (carrier || route) {
                meta.push([carrier, route].filter(Boolean).join(' · '))
              }
            })
            if (subtitle && subtitle.trim() === event.label.trim()) {
              subtitle = undefined
            }
          }
          if (component.carModel) meta.push(component.carModel)
          if (component.pickupLocationName) meta.push(`Pickup: ${component.pickupLocationName}`)
          if (component.dropoffLocationName) meta.push(`Drop-off: ${component.dropoffLocationName}`)

          day.items.push({
            type,
            title: getItineraryItemTitle({
              type,
              componentLabel: component.label,
              componentSublabel: component.sublabel,
              eventLabel: event.label,
              eventSublabel: event.sublabel,
            }),
            subtitle,
            meta,
          })
        }
      } else {
        day.items.push({
          type: 'activity',
          title: event.label,
          subtitle: event.sublabel || undefined,
          meta: [],
        })
      }
    }

    return Array.from(grouped.values())
  }, [receipt])

  useEffect(() => {
    if (!openPanel) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPanel(null)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPanel])

  return (
    <>
      <div className={`receipt-panel${mobile ? ' is-mobile' : ''}${receiptLoading ? ' is-loading' : ''}`}>
        <section className="summary-panel">
          <img alt={offer.shortTitle} className="summary-panel-image" src={offer.imageUrl} />
          <div className="summary-panel-body">
            <p className="summary-panel-kicker">{offer.location}</p>
            <h2 className="summary-panel-title">{offer.shortTitle}</h2>
            <p className="summary-panel-subtitle">{offer.title}</p>
            <div className="summary-panel-links">
              <button className="link-button" onClick={() => setOpenPanel('included')} type="button">
                What's included
              </button>
              <button className="link-button" onClick={() => setOpenPanel('excluded')} type="button">
                What's excluded
              </button>
              <button className="link-button" onClick={() => setOpenPanel('info')} type="button">
                Trip information
              </button>
            </div>
          </div>

          {!receipt ? (
            <div className="receipt-empty">
              <strong>Your receipt will appear here.</strong>
              <p>Select dates and package details to start pricing the booking.</p>
            </div>
          ) : (
            <div className="summary-panel-content">
              {receipt.errors.length ? (
                <div className="error-banner">
                  {receipt.errors.map((error) => (
                    <p key={`${error.code}-${error.message}`}>{error.message}</p>
                  ))}
                </div>
              ) : null}

              <section className="receipt-summary-flow">
                {(receipt.startDate || receipt.endDate) ? (
                  <div className="trip-date-summary">
                    <div className="trip-date-block">
                      <strong>{formatTripDay(receipt.startDate)}</strong>
                      <span>{formatTripMonthYear(receipt.startDate)}</span>
                      <span>{formatTripWeekday(receipt.startDate)}</span>
                    </div>
                    <div className="trip-date-arrow" aria-hidden="true">
                      →
                    </div>
                    <div className="trip-date-block">
                      <strong>{formatTripDay(receipt.endDate)}</strong>
                      <span>{formatTripMonthYear(receipt.endDate)}</span>
                      <span>{formatTripWeekday(receipt.endDate)}</span>
                    </div>
                  </div>
                ) : null}
                <div className="receipt-line-list">
                  {receipt.lines.map((line) => (
                    <div className={`receipt-line${line.format === 'SIBLING' ? ' is-sibling' : ''}`} key={`${line.label}-${line.amount ?? line.text ?? 'text'}`}>
                      <span>{line.label}</span>
                      <span>{typeof line.amount === 'number' ? formatPrice(line.amount) : line.text ?? ''}</span>
                    </div>
                  ))}
                </div>

                {receipt.discount > 0 ? <p className="success-text">Saving {formatPrice(receipt.discount)}</p> : null}

                <div className="receipt-total-row">
                  <div>
                    <p className="receipt-label">Total</p>
                    <strong>{receipt.title}</strong>
                  </div>
                  <div className="receipt-total-values">
                    <strong>{formatPrice(receipt.totalPrice)}</strong>
                  </div>
                </div>
              </section>

              <section className="receipt-card">
                <p className="receipt-label">Itinerary</p>
                <div className="timeline">
                  {receipt.itinerary.map((event) => (
                    <div className="timeline-item" key={`${event.label}-${event.date}`}>
                      <div className={`timeline-dot timeline-dot-${getItineraryType(event.components[0] ?? {})}`}>
                        <ItineraryIcon
                          type={getItineraryType(event.components[0] ?? {}) as 'accommodation' | 'flight' | 'car' | 'activity'}
                        />
                      </div>
                      <div>
                        <strong>{getItineraryPreviewTitle(event)}</strong>
                        <p>{event.sublabel}</p>
                        <span>{event.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="button button-secondary receipt-itinerary-button" onClick={() => setOpenPanel('itinerary')} type="button">
                  View full itinerary
                </button>
              </section>

              {receipt.excluded.length ? (
                <section className="receipt-card">
                  <p className="receipt-label">What's excluded</p>
                  <ul className="receipt-list">
                    {receipt.excluded.map((item) => (
                      <li key={item.title}>
                        <span>{item.title}</span>
                        {typeof item.price === 'number' ? <span>{formatPrice(item.price)}</span> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {receipt.cancellationDescription ? (
                <section className="receipt-card">
                  <p className="receipt-label">Cancellation policy</p>
                  <p>{receipt.cancellationDescription}</p>
                </section>
              ) : null}

            </div>
          )}
        </section>
        {receiptLoading ? (
          <div className="receipt-loading-overlay" aria-live="polite" aria-busy="true">
            <div className="receipt-loading-spinner" />
            <span>Refreshing live pricing…</span>
          </div>
        ) : null}
      </div>

      {openPanel ? (
        <div aria-modal="true" className="hero-modal-backdrop" onClick={() => setOpenPanel(null)} role="dialog">
          <div className="hero-modal" onClick={(event) => event.stopPropagation()}>
            <div className="hero-modal-header">
              <h2>{modalTitle}</h2>
              <button aria-label="Close modal" className="modal-close-button" onClick={() => setOpenPanel(null)} type="button">
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {openPanel === 'included' ? (
              <ul className="hero-modal-list">
                {offer.includedList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            {openPanel === 'excluded' ? (
              <ul className="hero-modal-list">
                {offer.excludedList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            {openPanel === 'info' ? (
              <div className="hero-modal-info">
                {offer.informationList.map((item) => (
                  <section className="hero-info-item" key={item.id}>
                    {item.label ? <h3 dangerouslySetInnerHTML={{ __html: item.label }} /> : null}
                    <div dangerouslySetInnerHTML={{ __html: item.value || '' }} />
                  </section>
                ))}
              </div>
            ) : null}

            {openPanel === 'itinerary' ? (
              <div className="itinerary-modal">
                {itineraryDays.length ? (
                  itineraryDays.map((day, dayIndex) => (
                    <section className="itinerary-day" key={`${day.rawDate}-${dayIndex}`}>
                      <div className="itinerary-day-header">
                        <h3>{formatTimelineDate(day.rawDate)}</h3>
                      </div>
                      <div className="itinerary-day-items">
                        {day.items.map((item, itemIndex) => (
                          <div className="itinerary-day-item" key={`${item.title}-${itemIndex}`}>
                            <div className={`itinerary-icon itinerary-icon-${item.type}`}>
                              <ItineraryIcon type={item.type} />
                            </div>
                            <div className="itinerary-day-copy">
                              <strong>{item.title}</strong>
                              {item.subtitle ? <p>{item.subtitle}</p> : null}
                              {item.meta.length ? (
                                <ul className="itinerary-meta-list">
                                  {item.meta.map((meta, metaIndex) => (
                                    <li key={`${meta}-${metaIndex}`}>{meta}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                ) : selectedAccommodationDetails ? (
                  <section className="itinerary-day">
                    <div className="itinerary-day-header">
                      <h3>Trip overview</h3>
                    </div>
                    <div className="itinerary-day-items">
                      <div className="itinerary-day-item">
                        <div className="itinerary-icon itinerary-icon-accommodation">
                          <ItineraryIcon type="accommodation" />
                        </div>
                        <div className="itinerary-day-copy">
                          <strong>{selectedAccommodationDetails.hotelName}</strong>
                          <ul className="itinerary-meta-list">
                            <li>{selectedAccommodationDetails.roomName}</li>
                            {selectedAccommodationDetails.boardName ? <li>{selectedAccommodationDetails.boardName}</li> : null}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : (
                  <p>No itinerary details are available yet.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
