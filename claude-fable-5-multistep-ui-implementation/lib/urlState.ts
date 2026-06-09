import type { BookingPayload, ProductInput } from './types'
import { buildGroups, buildPeople, partyComposition } from './payload'

// Compact URL-encoded journey snapshot. Never contains cached API responses.
export interface UrlSnapshot {
  v: 1
  sid: string // session id
  st: string // current step id
  a: number // adults
  ca: number[] // child ages
  ap?: string[] // departure airports
  pg?: string // package group ('' is a valid "All packages" value)
  nf?: number | null // visible nights filter (null = All nights)
  n?: number // effective nights
  d?: string // selected date
  pr?: ProductInput[] // products
  cp?: string[] // coupons
  ni?: number // numOfInstalments
}

function toBase64Url(s: string): string {
  const b64 = typeof window === 'undefined' ? Buffer.from(s).toString('base64') : btoa(unescape(encodeURIComponent(s)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return typeof window === 'undefined' ? Buffer.from(b64, 'base64').toString() : decodeURIComponent(escape(atob(b64)))
}

export function encodeSnapshot(snap: UrlSnapshot): string {
  return toBase64Url(JSON.stringify(snap))
}

export function decodeSnapshot(encoded: string): UrlSnapshot | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded))
    if (parsed && parsed.v === 1 && typeof parsed.sid === 'string') return parsed as UrlSnapshot
    return null
  } catch {
    return null
  }
}

export function buildSnapshot(
  payload: BookingPayload,
  stepId: string,
  nightsFilter: number | null | undefined,
): UrlSnapshot {
  const { adults, childAges } = partyComposition(payload.people)
  const snap: UrlSnapshot = { v: 1, sid: payload.sessionId, st: stepId, a: adults, ca: childAges }
  if (payload.departureAirports?.length) snap.ap = payload.departureAirports
  if (payload.packageGroup !== undefined) snap.pg = payload.packageGroup
  if (nightsFilter !== undefined) snap.nf = nightsFilter
  if (payload.nights != null) snap.n = payload.nights
  if (payload.selectedDate) snap.d = payload.selectedDate
  if (payload.products?.length) snap.pr = payload.products
  if (payload.coupons?.length) snap.cp = payload.coupons
  if (payload.numOfInstalments != null) snap.ni = payload.numOfInstalments
  return snap
}

export function payloadFromSnapshot(snap: UrlSnapshot, offerId: string): BookingPayload {
  const people = buildPeople(snap.a ?? 2, snap.ca ?? [])
  return {
    offerId,
    sessionId: snap.sid,
    people,
    groups: buildGroups(people),
    departureAirports: snap.ap,
    packageGroup: snap.pg,
    nights: snap.n,
    selectedDate: snap.d,
    products: snap.pr,
    coupons: snap.cp,
    numOfInstalments: snap.ni,
  }
}

// Write the snapshot into the URL without triggering a Next.js navigation.
export function writeSnapshotToUrl(snap: UrlSnapshot): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('s', encodeSnapshot(snap))
  window.history.replaceState(window.history.state, '', url.toString())
}

export function readSnapshotFromUrl(): UrlSnapshot | null {
  if (typeof window === 'undefined') return null
  const s = new URL(window.location.href).searchParams.get('s')
  return s ? decodeSnapshot(s) : null
}
