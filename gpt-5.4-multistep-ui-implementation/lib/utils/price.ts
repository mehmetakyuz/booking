export function formatPrice(amountInPence?: number | null) {
  const amount = typeof amountInPence === 'number' ? amountInPence : 0
  return `£${(amount / 100).toFixed(0)}`
}

export function formatPriceDelta(amountInPence?: number | null, baseAmountInPence = 0, zeroLabel = '+£0') {
  const amount = typeof amountInPence === 'number' ? amountInPence : 0
  const delta = amount - baseAmountInPence
  if (delta > 0) {
    return `+${formatPrice(delta)}`
  }

  if (delta < 0) {
    return `-${formatPrice(Math.abs(delta))}`
  }

  return zeroLabel
}

export function formatPriceWithPence(amountInPence?: number | null) {
  const amount = typeof amountInPence === 'number' ? amountInPence : 0
  return `£${(amount / 100).toFixed(2)}`
}

export function formatDateLabel(value?: string | null) {
  if (!value) return 'TBC'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTimeLabel(value?: string | null) {
  if (!value) return 'TBC'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
