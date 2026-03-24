'use client'

import { useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { formatMoney, formatDayMonthYear } from '@/lib/booking/format'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { ItineraryPreview } from './ItineraryPreview'
import { ItineraryFull } from './ItineraryFull'
import { SummaryModals } from './SummaryModals'

export function Summary() {
  const { state } = useBooking()
  const offer = state.payload.offerMeta
  const receipt = state.receipt
  const [showItinerary, setShowItinerary] = useState(false)
  const [activeModal, setActiveModal] = useState<'included' | 'excluded' | 'info' | null>(null)

  if (!offer) return null
  const currency = offer.currency || 'GBP'
  const image = offer.image?.url

  const hasDates = receipt?.startDate && receipt?.endDate
  const start = hasDates ? formatDayMonthYear(receipt!.startDate) : null
  const end = hasDates ? formatDayMonthYear(receipt!.endDate) : null
  const hasError = receipt?.errors && receipt.errors.length > 0
  const hasEvents = (receipt?.itinerary?.events?.length ?? 0) > 0

  return (
    <div className="receipt-panel">
      {image ? <img className="summary-image" src={image} alt="" /> : null}
      <div className="summary-body">
        <div className="summary-head">
          <h2 className="summary-title">{offer.shortTitle ?? offer.title}</h2>
          {offer.offerCard?.mainLocation ? (
            <p className="summary-location">{offer.offerCard.mainLocation}</p>
          ) : null}
        </div>

        <div className="summary-actions">
          {offer.includedList?.length ? (
            <button type="button" className="link-button" onClick={() => setActiveModal('included')}>
              What’s included
            </button>
          ) : null}
          {offer.excludedList?.length ? (
            <button type="button" className="link-button" onClick={() => setActiveModal('excluded')}>
              What’s excluded
            </button>
          ) : null}
          {offer.informationList?.length ? (
            <button type="button" className="link-button" onClick={() => setActiveModal('info')}>
              Trip information
            </button>
          ) : null}
        </div>

        {hasDates ? (
          <div className="summary-dates-row" role="group" aria-label="Trip dates">
            <div className="summary-date">
              <span className="summary-date-day">{start!.day}</span>
              <span className="summary-date-monthyear">{start!.monthYear}</span>
              <span className="summary-date-weekday">{start!.weekday}</span>
            </div>
            <div className="summary-date-arrow" aria-hidden>
              →
            </div>
            <div className="summary-date">
              <span className="summary-date-day">{end!.day}</span>
              <span className="summary-date-monthyear">{end!.monthYear}</span>
              <span className="summary-date-weekday">{end!.weekday}</span>
            </div>
          </div>
        ) : null}

        {state.async.receiptLoading && !hasError ? (
          <div className="receipt-inline-loader">
            <Spinner size={18} label="Updating price…" />
          </div>
        ) : null}

        {hasError ? (
          <div className="receipt-errors" role="alert">
            {receipt!.errors!.map((e, i) => (
              <p key={i} className="receipt-error">
                {e.message}
              </p>
            ))}
          </div>
        ) : null}

        {receipt?.lines?.length ? (
          <ul className="receipt-lines">
            {receipt.lines.map((line, i) => {
              const isSibling = line.origin === 'sibling'
              if (line.format === 'text') {
                return (
                  <li
                    key={i}
                    className={'receipt-line' + (isSibling ? ' receipt-line--sibling' : '')}
                  >
                    <span className="receipt-line-text">{line.text ?? line.label}</span>
                  </li>
                )
              }
              return (
                <li
                  key={i}
                  className={'receipt-line' + (isSibling ? ' receipt-line--sibling' : '')}
                >
                  <span className="receipt-line-label">{line.label}</span>
                  <span className="receipt-line-amount">
                    {formatMoney(line.amount, currency)}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : null}

        {receipt?.totalPrice !== undefined ? (
          <div className="receipt-total">
            <span className="receipt-total-label">Total</span>
            <span className="receipt-total-prices">
              {receipt.oldPrice && receipt.oldPrice > (receipt.totalPrice ?? 0) ? (
                <span className="receipt-total-old">{formatMoney(receipt.oldPrice, currency)}</span>
              ) : null}
              <span className="receipt-total-price">{formatMoney(receipt.totalPrice, currency)}</span>
            </span>
          </div>
        ) : null}

        {receipt?.cancellationConditions?.shortCancellationDescription ? (
          <p className="receipt-cancellation">
            {receipt.cancellationConditions.shortCancellationDescription}
          </p>
        ) : null}

        {hasEvents ? (
          <div className="receipt-itinerary-preview">
            <h3>Your trip</h3>
            <ItineraryPreview events={receipt!.itinerary!.events} limit={3} />
            <button type="button" className="link-button" onClick={() => setShowItinerary(true)}>
              View full itinerary
            </button>
          </div>
        ) : null}
      </div>

      <Modal
        open={showItinerary}
        onClose={() => setShowItinerary(false)}
        title="Your itinerary"
        wide
      >
        <ItineraryFull events={receipt?.itinerary?.events ?? []} />
      </Modal>

      <SummaryModals
        offer={offer}
        active={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  )
}
