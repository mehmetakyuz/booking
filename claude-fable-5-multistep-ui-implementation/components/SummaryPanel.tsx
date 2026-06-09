'use client'

import React, { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useBookingState } from '@/lib/store'
import { Modal } from './Modal'
import { LoadingOverlay } from './Loading'
import { ItineraryTimeline } from './ItineraryTimeline'
import { dateParts, formatMoney } from '@/lib/format'
import type { ReceiptLine } from '@/lib/types'

type InfoModal = 'included' | 'excluded' | 'information' | 'itinerary' | null

// One unified summary surface: image header flowing into title, info actions,
// date block, receipt lines, total, and the itinerary preview.
export function SummaryPanel() {
  const { offerMeta, receipt, receiptLoading, receiptError } = useBookingState()
  const [modal, setModal] = useState<InfoModal>(null)

  if (!offerMeta) return null
  const currency = offerMeta.currency

  return (
    <div className="summary-panel">
      {offerMeta.image?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={offerMeta.image.url} alt="" className="summary-image" />
      ) : null}

      <div className="summary-body">
        <h2 className="summary-title">{offerMeta.shortTitle || offerMeta.title}</h2>
        {offerMeta.location ? <p className="summary-location">{offerMeta.location}</p> : null}

        <div className="summary-links">
          <button type="button" className="text-link" onClick={() => setModal('included')}>
            What’s included
          </button>
          <button type="button" className="text-link" onClick={() => setModal('excluded')}>
            What’s excluded
          </button>
          {offerMeta.informationList.length ? (
            <button type="button" className="text-link" onClick={() => setModal('information')}>
              Trip information
            </button>
          ) : null}
        </div>

        {receiptError ? <div className="summary-error">{receiptError}</div> : null}

        <div className="summary-live">
          {receiptLoading ? <LoadingOverlay /> : null}

          {receipt?.startDate && receipt.endDate ? (
            <DateBlock start={receipt.startDate} end={receipt.endDate} />
          ) : null}

          {receipt ? (
            <>
              <div className="receipt-lines">
                {receipt.lines.map((line, i) => (
                  <ReceiptLineRow key={i} line={line} currency={currency} />
                ))}
              </div>
              <div className="receipt-total">
                <span>Total</span>
                <strong>{formatMoney(receipt.totalPrice, currency)}</strong>
              </div>

              {receipt.itinerary.length ? (
                <div className="summary-itinerary">
                  <h3 className="summary-section-heading">Your itinerary</h3>
                  <ItineraryTimeline events={receipt.itinerary.slice(0, 3)} compact />
                  <button type="button" className="btn btn-secondary btn-block" onClick={() => setModal('itinerary')}>
                    View full itinerary
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="summary-empty">Choose your dates to see live pricing for your trip.</p>
          )}
        </div>
      </div>

      {modal === 'included' ? (
        <Modal title="What’s included" onClose={() => setModal(null)}>
          <ul className="info-list">
            {offerMeta.includedListWithDescriptions.map((item, i) => (
              <li key={i}>
                <p className="info-list-name">{item.name}</p>
                {item.description ? <p className="info-list-desc">{item.description}</p> : null}
              </li>
            ))}
          </ul>
        </Modal>
      ) : null}

      {modal === 'excluded' ? (
        <Modal title="What’s excluded" onClose={() => setModal(null)}>
          <ul className="info-list">
            {offerMeta.excludedList.map((item, i) => (
              <li key={i}>
                <p className="info-list-name">{item}</p>
              </li>
            ))}
          </ul>
        </Modal>
      ) : null}

      {modal === 'information' ? (
        <Modal title="Trip information" onClose={() => setModal(null)}>
          <dl className="info-dl">
            {offerMeta.informationList.map((item) => (
              <div key={item.id} className="info-dl-row">
                <dt>{item.label}</dt>
                <dd dangerouslySetInnerHTML={{ __html: item.value }} />
              </div>
            ))}
          </dl>
        </Modal>
      ) : null}

      {modal === 'itinerary' && receipt ? (
        <Modal title="Your itinerary" onClose={() => setModal(null)} wide>
          <ItineraryTimeline events={receipt.itinerary} />
        </Modal>
      ) : null}
    </div>
  )
}

function DateBlock({ start, end }: { start: string; end: string }) {
  const s = dateParts(start)
  const e = dateParts(end)
  return (
    <div className="date-block">
      <div className="date-block-side">
        <span className="date-block-day">{s.day}</span>
        <span className="date-block-month">
          {s.month} {s.year}
        </span>
        <span className="date-block-weekday">{s.weekday}</span>
      </div>
      <ArrowRight size={20} className="date-block-arrow" />
      <div className="date-block-side">
        <span className="date-block-day">{e.day}</span>
        <span className="date-block-month">
          {e.month} {e.year}
        </span>
        <span className="date-block-weekday">{e.weekday}</span>
      </div>
    </div>
  )
}

function ReceiptLineRow({ line, currency }: { line: ReceiptLine; currency: string }) {
  const important = line.format === 'IMPORTANT'
  if (line.kind === 'ReceiptLineAmount') {
    return (
      <div className={`receipt-line${important ? ' is-important' : ''}`}>
        <span className="receipt-line-label">{line.label}</span>
        <span className="receipt-line-amount">{formatMoney(line.amount ?? null, currency)}</span>
      </div>
    )
  }
  if (line.format === 'LINEBREAK') return <div className="receipt-linebreak" />
  // Descriptive sibling rows.
  return (
    <div className={`receipt-line receipt-line-sibling${important ? ' is-important' : ''}`}>
      <span className="receipt-line-label">{line.text ?? line.label}</span>
    </div>
  )
}
