'use client'

import { useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { formatMoney } from '@/lib/booking/format'
import { Summary } from './Summary'

export function MobileSummaryBar() {
  const { state } = useBooking()
  const [open, setOpen] = useState(false)
  const receipt = state.receipt
  const currency = state.payload.offerMeta?.currency ?? 'GBP'
  return (
    <>
      <div className="mobile-summary-bar">
        <button type="button" className="mobile-summary-trigger" onClick={() => setOpen(true)}>
          <span className="mobile-summary-label">View summary</span>
          <span className="mobile-summary-price">
            {receipt?.totalPrice !== undefined ? formatMoney(receipt.totalPrice, currency) : '—'}
          </span>
        </button>
      </div>
      {open ? (
        <div className="mobile-drawer" onClick={() => setOpen(false)}>
          <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setOpen(false)}>
              ×
            </button>
            <Summary />
          </div>
        </div>
      ) : null}
    </>
  )
}
