'use client'

import React from 'react'
import { formatDelta, formatMoney } from '@/lib/format'

// Standard option-card price block: delta on top, resulting total beneath.
// Only the true baseline shows "Included"; ties show "+£0".
export function PriceBlock({
  isBaseline,
  delta,
  total,
  currency,
}: {
  isBaseline: boolean
  delta: number | null
  total: number | null
  currency: string
}) {
  return (
    <div className="price-block">
      {isBaseline ? (
        <span className="price-delta price-included">Included</span>
      ) : delta != null ? (
        <span className={`price-delta${delta < 0 ? ' price-negative' : ''}`}>{formatDelta(delta, currency)}</span>
      ) : null}
      {total != null ? <span className="price-total-line">{formatMoney(total, currency)} total</span> : null}
    </div>
  )
}
