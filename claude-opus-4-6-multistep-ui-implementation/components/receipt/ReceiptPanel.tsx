'use client'

import { useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import type { OfferInfoItem, ReceiptItineraryEvent, ReceiptItineraryComponent } from '@/lib/booking/types'

type ModalType = null | 'included' | 'excluded' | 'info' | 'itinerary'

const currencyFmt = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

function formatPrice(pence: number): string {
  return currencyFmt.format(pence / 100)
}

function formatDateLarge(dateString: string) {
  const d = new Date(dateString)
  const day = d.getDate()
  const month = d.toLocaleString('en-GB', { month: 'short' })
  const year = d.getFullYear()
  return { day, month, year }
}

function ComponentIcon({ type }: { type: string }) {
  const t = type.toLowerCase()
  if (t === 'accommodation' || t.includes('accommodation')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" /><path d="M3 7v14" /><path d="M21 7v14" /><path d="M3 7l9-4 9 4" />
        <rect x="7" y="11" width="4" height="4" /><rect x="13" y="11" width="4" height="4" />
      </svg>
    )
  }
  if (t === 'flight' || t.includes('flight')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5 7.1 4-4 4-2.4-.8c-.5-.2-1 0-1.2.4L2 16l5.6 1.4L9 23l1.2-.8c.4-.3.6-.8.4-1.2l-.8-2.4 4-4 4 7.1.5-.3c.4-.2.6-.6.5-1.1z" />
      </svg>
    )
  }
  if (t === 'car' || t === 'carrental' || t.includes('car')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17h14v-5H5v5z" /><path d="M2 12l3-6h14l3 6" />
        <circle cx="7.5" cy="17" r="1.5" /><circle cx="16.5" cy="17" r="1.5" />
      </svg>
    )
  }
  if (t === 'activity' || t === 'leisure' || t.includes('leisure')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
      </svg>
    )
  }
  // Fallback: generic marker
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="10" />
    </svg>
  )
}

/* ── Modal shell ── */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

/* ── Itinerary component row ── */
function ItineraryComponentRow({ component }: { component: ReceiptItineraryComponent }) {
  return (
    <div className="itinerary-component">
      <span className="itinerary-component-icon"><ComponentIcon type={component.type} /></span>
      <div className="itinerary-component-detail">
        <span className="itinerary-component-label">{component.label}</span>
        {component.sublabel && (
          <span className="itinerary-component-sublabel">{component.sublabel}</span>
        )}
      </div>
    </div>
  )
}

/* ── Itinerary event (day) ── */
function ItineraryEventBlock({ event }: { event: ReceiptItineraryEvent }) {
  const d = new Date(event.date)
  const dateStr = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="itinerary-event">
      <div className="itinerary-event-date">
        <strong>{dateStr}</strong>
        {event.sublabel && <span>{event.sublabel}</span>}
      </div>
      <div className="itinerary-event-label">{event.label}</div>
      <div className="itinerary-event-components">
        {event.components.map((comp, i) => (
          <ItineraryComponentRow key={i} component={comp} />
        ))}
      </div>
    </div>
  )
}

/* ── Main ReceiptPanel ── */
export default function ReceiptPanel() {
  const { state } = useBooking()
  const { offer, receipt, receiptLoading } = state
  const [modal, setModal] = useState<ModalType>(null)

  return (
    <aside className="receipt-panel">
      {/* Image header */}
      <div className="summary-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={offer.imageUrl} alt={offer.shortTitle || offer.title} />
      </div>

      {/* Content area */}
      <div className="summary-content">
        {/* Title + Location */}
        <h2 className="summary-title">{offer.shortTitle || offer.title}</h2>
        <p className="summary-location">{offer.location}</p>

        {/* Action links */}
        <div className="summary-actions-row">
          {offer.includedList.length > 0 && (
            <button className="btn-text" onClick={() => setModal('included')}>
              What&apos;s included
            </button>
          )}
          {offer.excludedList.length > 0 && (
            <button className="btn-text" onClick={() => setModal('excluded')}>
              What&apos;s excluded
            </button>
          )}
          {offer.informationList.length > 0 && (
            <button className="btn-text" onClick={() => setModal('info')}>
              Trip info
            </button>
          )}
        </div>

        {/* Date block */}
        {receipt?.startDate && receipt?.endDate && (
          <div className="summary-dates">
            {(() => {
              const start = formatDateLarge(receipt.startDate)
              const end = formatDateLarge(receipt.endDate)
              return (
                <>
                  <div className="summary-date">
                    <span className="summary-date-day">{start.day}</span>
                    <span className="summary-date-monthyear">
                      {start.month} {start.year}
                    </span>
                  </div>
                  <span className="summary-date-arrow">&rarr;</span>
                  <div className="summary-date">
                    <span className="summary-date-day">{end.day}</span>
                    <span className="summary-date-monthyear">
                      {end.month} {end.year}
                    </span>
                  </div>
                  {receipt.nights != null && (
                    <span className="summary-nights">
                      {receipt.nights} {receipt.nights === 1 ? 'night' : 'nights'}
                    </span>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* Receipt lines */}
        {receipt && receipt.lines.length > 0 && (
          <div className="receipt-lines">
            {receipt.lines
              .filter((line) => line.amount != null || line.text)
              .map((line, i) => (
                <div
                  key={i}
                  className={`receipt-line${line.format === 'SIBLING' ? ' receipt-line--sibling' : ''}`}
                >
                  <span className="receipt-line-label">
                    {line.label}
                    {line.text && <span className="receipt-line-text"> {line.text}</span>}
                  </span>
                  {line.amount != null && (
                    <span className="receipt-line-amount">{formatPrice(line.amount)}</span>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Total */}
        {receipt && (
          <div className="receipt-total">
            <span className="receipt-total-label">Total</span>
            <span className="receipt-total-prices">
              {receipt.discount > 0 && receipt.oldPrice > 0 && (
                <span className="receipt-total-old">{formatPrice(receipt.oldPrice)}</span>
              )}
              <span className="receipt-total-price">{formatPrice(receipt.totalPrice)}</span>
            </span>
          </div>
        )}

        {/* Itinerary preview */}
        {receipt && receipt.itinerary.length > 0 && (
          <div className="receipt-itinerary-preview">
            {receipt.itinerary.slice(0, 3).map((event, i) => (
              <div key={i} className="itinerary-preview-row">
                <span className="itinerary-preview-date">
                  {new Date(event.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span className="itinerary-preview-label">{event.label}</span>
                <span className="itinerary-preview-icons">
                  {event.components.map((c, j) => (
                    <span key={j} className="itinerary-preview-icon">
                      <ComponentIcon type={c.type} />
                    </span>
                  ))}
                </span>
              </div>
            ))}
            {receipt.itinerary.length > 3 && (
              <button className="btn-text" onClick={() => setModal('itinerary')}>
                View full itinerary
              </button>
            )}
          </div>
        )}

        {/* Errors */}
        {receipt && receipt.errors.length > 0 && (
          <div className="receipt-errors">
            {receipt.errors.map((err, i) => (
              <div key={i} className="receipt-error">
                {err.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {receiptLoading && (
        <div className="loader-overlay">
          <div className="spinner" />
        </div>
      )}

      {/* ── Modals ── */}

      {modal === 'included' && (
        <Modal title="What's included" onClose={() => setModal(null)}>
          <ul className="modal-bullet-list">
            {offer.includedList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Modal>
      )}

      {modal === 'excluded' && (
        <Modal title="What's excluded" onClose={() => setModal(null)}>
          <ul className="modal-bullet-list">
            {offer.excludedList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Modal>
      )}

      {modal === 'info' && (
        <Modal title="Trip info" onClose={() => setModal(null)}>
          <div className="modal-info-list">
            {offer.informationList.map((item: OfferInfoItem) => (
              <div key={item.id} className="modal-info-item">
                <dt className="modal-info-label">{item.label}</dt>
                <dd
                  className="modal-info-value"
                  dangerouslySetInnerHTML={{ __html: item.value }}
                />
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal === 'itinerary' && receipt && (
        <Modal title="Full itinerary" onClose={() => setModal(null)}>
          <div className="modal-itinerary">
            {receipt.itinerary.map((event, i) => (
              <ItineraryEventBlock key={i} event={event} />
            ))}
          </div>
        </Modal>
      )}
    </aside>
  )
}
