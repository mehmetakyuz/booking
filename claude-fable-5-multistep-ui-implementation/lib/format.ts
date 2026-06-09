// Formatting helpers. All API money values are minor-unit integers; divide by
// 100 only here at the render boundary.

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
}

export function formatMoney(minor: number | null | undefined, currency = 'GBP'): string {
  if (minor == null) return ''
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  const negative = minor < 0
  const abs = Math.abs(minor)
  const whole = Math.floor(abs / 100)
  const cents = abs % 100
  const wholeStr = whole.toLocaleString('en-GB')
  const base = cents === 0 ? wholeStr : `${wholeStr}.${String(cents).padStart(2, '0')}`
  return `${negative ? '-' : ''}${symbol}${base}`
}

// Delta against a baseline: "+£0", "+£120", "-£80"
export function formatDelta(deltaMinor: number, currency = 'GBP'): string {
  if (deltaMinor >= 0) return `+${formatMoney(deltaMinor, currency)}`
  return formatMoney(deltaMinor, currency)
}

// ISO 8601 duration (PT2H30M) -> "2 hours 30 mins"
export function formatDuration(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!m) return null
  const days = parseInt(m[1] || '0', 10)
  const hours = parseInt(m[2] || '0', 10)
  const mins = parseInt(m[3] || '0', 10)
  const parts: string[] = []
  if (days) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  if (mins) parts.push(`${mins} ${mins === 1 ? 'min' : 'mins'}`)
  if (!parts.length) return null
  return parts.join(' ')
}

// Explicit user-facing label maps for enum-like backend values.
const TOUR_TYPE_LABELS: Record<string, string> = {
  GROUP_TOUR: 'Group tour',
  INDIVIDUAL: 'Individual',
}

export function tourTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return TOUR_TYPE_LABELS[value] ?? null
}

const CABIN_CLASS_LABELS: Record<string, string> = {
  ECONOMY: 'Economy',
  BUSINESS: 'Business',
  FIRST: 'First class',
}

export function cabinClassLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return CABIN_CLASS_LABELS[value] ?? null
}

const CAR_EXTRA_TYPE_LABELS: Record<string, string> = {
  ADDITIONAL_DRIVER: 'Additional driver',
  BABY_SEAT: 'Baby seat',
  BABY_SEAT_INCLUDED: 'Baby seat (included)',
  BLUE_TOOTH: 'Bluetooth',
  SNOW_CHAINS: 'Snow chains',
  SNOW_CHAINS2: 'Snow chains',
  SNOW_TYRE: 'Snow tyres',
  WIFI: 'Wi-Fi',
  WIFI2: 'Wi-Fi',
  PUSH_CHAIR: 'Pushchair',
  CHILD_SEAT: 'Child seat',
  CHILD_SEAT_INCLUDED: 'Child seat (included)',
  CHILD_BOOSTER_SEAT: 'Child booster seat',
  CHILD_BOOSTER_SEAT_INCLUDED: 'Child booster seat (included)',
  BOOSTER: 'Booster seat',
  GPS: 'Sat nav',
  ROOF_RACK: 'Roof rack',
  SKI_BOX: 'Ski box',
  SKI_RACK: 'Ski rack',
  EXPRESS_CHECKIN: 'Express check-in',
  QUEUE_JUMP: 'Queue jump',
  FULL_INSURANCE: 'Full insurance',
  PHONE_CHARGER: 'Phone charger',
  TANK_FUEL: 'Full tank of fuel',
  RENTALCOVER_FULL_PROTECTION: 'Full protection cover',
}

export function carExtraTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return CAR_EXTRA_TYPE_LABELS[value] ?? null
}

const TRANSMISSION_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  AUTOMATIC: 'Automatic',
}

export function transmissionLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return TRANSMISSION_LABELS[value] ?? null
}

// ---- Dates (timezone-safe: never go through Date.toISOString) ----

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = parseISODate(iso)
  return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export function dateParts(iso: string): { day: number; month: string; year: number; weekday: string } {
  const d = parseISODate(iso)
  return {
    day: d.getDate(),
    month: MONTHS[d.getMonth()].slice(0, 3),
    year: d.getFullYear(),
    weekday: WEEKDAYS[d.getDay()],
  }
}

export function formatTime(datetime: string | null | undefined): string {
  if (!datetime) return ''
  const m = datetime.match(/T(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : ''
}

export function formatDateTime(datetime: string | null | undefined): string {
  if (!datetime) return ''
  const datePart = datetime.slice(0, 10)
  return `${formatDateLong(datePart)}, ${formatTime(datetime)}`
}

export function monthLabel(year: number, monthIndex: number): string {
  return `${MONTHS[monthIndex]} ${year}`
}
