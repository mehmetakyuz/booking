import type { BookingPayload } from './types'

/* ── Calendar query variables ── */

export function toCalendarVars(payload: BookingPayload) {
  return {
    offerId: payload.offerId,
    sessionId: payload.sessionId,
    people: payload.people,
    groups: payload.groups,
    nights: payload.nights != null ? [payload.nights] : undefined,
    departureAirports: payload.departureAirports?.length
      ? [payload.departureAirports[0]]
      : undefined,
    packageGroups: payload.packageGroup ? [payload.packageGroup] : undefined,
  }
}

/* ── Dynamic package query variables ── */

export function toDynamicPackageVars(payload: BookingPayload) {
  return {
    offerId: payload.offerId,
    sessionId: payload.sessionId,
    people: payload.people,
    groups: payload.groups,
    departureAirports: payload.departureAirports,
    packageGroup: payload.packageGroup || undefined,
    nights: payload.nights,
    date: payload.selectedDate,
    tourUnit: payload.tourUnit,
    products: payload.products,
    dpr: 2,
  }
}

/* ── Receipt query variables ── */

export function toReceiptVars(payload: BookingPayload) {
  return {
    ...toDynamicPackageVars(payload),
    coupons: payload.coupons,
    numOfInstalments: payload.numOfInstalments,
    deferred: payload.deferred,
    properties: payload.properties,
    priceSeen: payload.priceSeen,
  }
}

/* ── Task dynamic package (subset for task group mutations) ── */

export function toTaskDynamicPackage(payload: BookingPayload) {
  return {
    offerId: payload.offerId,
    sessionId: payload.sessionId,
    people: payload.people,
    groups: payload.groups,
    departureAirports: payload.departureAirports,
    packageGroup: payload.packageGroup || undefined,
    nights: payload.nights,
    date: payload.selectedDate,
    tourUnit: payload.tourUnit,
    products: payload.products,
  }
}
