import { BookingPayload } from '@/lib/booking/types'

export function toCalendarVars(payload: BookingPayload) {
  return {
    offerId: payload.offerId,
    people: payload.people,
    groups: payload.groups,
    nights: payload.nights ? [payload.nights] : undefined,
    departureAirports: payload.departureAirports?.[0] ? [payload.departureAirports[0]] : undefined,
    packageGroups: payload.packageGroup ? [payload.packageGroup] : undefined,
    tourUnits: payload.tourUnit ? [String(payload.tourUnit)] : undefined,
  }
}

export function toDynamicPackageVars(payload: BookingPayload) {
  return {
    offerId: payload.offerId,
    date: payload.selectedDate,
    nights: payload.nights,
    people: payload.people,
    groups: payload.groups,
    products: payload.products ?? [],
    departureAirports: payload.departureAirports,
    tourUnit: payload.tourUnit ?? null,
    packageGroup: payload.packageGroup || undefined,
    dpr: 2,
  }
}

export function toReceiptVars(payload: BookingPayload) {
  return {
    ...toDynamicPackageVars(payload),
    coupons: payload.coupons ?? [],
    numOfInstalments: payload.numOfInstalments ?? 1,
    deferred: payload.deferred ?? false,
    properties: payload.properties ?? [],
    priceSeen: payload.priceSeen,
  }
}

export function toTaskDynamicPackage(payload: BookingPayload) {
  return {
    offerId: payload.offerId,
    date: payload.selectedDate,
    nights: payload.nights,
    people: payload.people,
    groups: payload.groups,
    products: payload.products,
    departureAirports: payload.departureAirports,
    packageGroup: payload.packageGroup ?? undefined,
  }
}
