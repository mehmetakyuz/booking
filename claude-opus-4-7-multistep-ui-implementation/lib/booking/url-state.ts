import type { BookingPayload } from './types'

export interface UrlSnapshot {
  sid: string
  st: number
  p: Pick<
    BookingPayload,
    'people' | 'groups' | 'departureAirports' | 'packageGroup' | 'nights' | 'selectedDate' | 'tourUnit' | 'products' | 'coupons' | 'numOfInstalments' | 'properties'
  >
}

function b64urlEncode(s: string): string {
  return (typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(s)))
    : Buffer.from(s, 'utf-8').toString('base64'))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const normal = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  return typeof atob !== 'undefined'
    ? decodeURIComponent(escape(atob(normal)))
    : Buffer.from(normal, 'base64').toString('utf-8')
}

export function encodeSnapshot(payload: BookingPayload, stepIndex: number): string {
  const snap: UrlSnapshot = {
    sid: payload.sessionId,
    st: stepIndex,
    p: {
      people: payload.people,
      groups: payload.groups,
      departureAirports: payload.departureAirports,
      packageGroup: payload.packageGroup,
      nights: payload.nights,
      selectedDate: payload.selectedDate,
      tourUnit: payload.tourUnit,
      products: payload.products,
      coupons: payload.coupons,
      numOfInstalments: payload.numOfInstalments,
      properties: payload.properties,
    },
  }
  return b64urlEncode(JSON.stringify(snap))
}

export function decodeSnapshot(encoded: string): UrlSnapshot | null {
  try {
    return JSON.parse(b64urlDecode(encoded)) as UrlSnapshot
  } catch {
    return null
  }
}

export function writeToUrlReplace(encoded: string) {
  if (typeof window === 'undefined') return
  const u = new URL(window.location.href)
  u.searchParams.set('s', encoded)
  window.history.replaceState(null, '', u.toString())
}
