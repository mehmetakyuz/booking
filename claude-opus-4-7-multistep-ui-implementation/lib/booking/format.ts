export function formatMoney(amount?: number | null, currency = 'GBP'): string {
  if (amount === null || amount === undefined) return '—'
  const major = amount / 100
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(major)
  } catch {
    return `£${Math.round(major)}`
  }
}

export function formatDelta(amount?: number | null, currency = 'GBP'): string {
  if (amount === null || amount === undefined) return ''
  if (amount === 0) return '+£0'
  const sign = amount > 0 ? '+' : '-'
  return sign + formatMoney(Math.abs(amount), currency)
}

export function formatDayMonthYear(iso?: string) {
  if (!iso) return { day: '', monthYear: '', weekday: '' }
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-GB', { month: 'short' })
  const year = d.getFullYear()
  const weekday = d.toLocaleString('en-GB', { weekday: 'short' })
  return { day, monthYear: `${month} ${year}`, weekday }
}

export function formatDuration(minutes?: number | null) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} hours ${m} mins`
  if (h) return `${h} hours`
  return `${m} mins`
}

export const GROUP_TYPE_LABEL: Record<string, string> = {
  GROUP_TOUR: 'Group tour',
  PRIVATE_TOUR: 'Private tour',
  SELF_GUIDED: 'Self-guided',
  WORKSHOP: 'Workshop',
  EXPERIENCE: 'Experience',
}

export function groupTypeLabel(v?: string | null) {
  if (!v) return ''
  return GROUP_TYPE_LABEL[v] ?? v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
