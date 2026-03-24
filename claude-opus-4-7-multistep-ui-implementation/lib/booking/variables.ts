import type { BookingPayload, ProductInput } from './types'

export function baseReceiptVars(p: BookingPayload): Record<string, unknown> {
  const v: Record<string, unknown> = {
    offerId: p.offerId,
    people: p.people,
    groups: p.groups,
  }
  if (p.selectedDate) v.date = p.selectedDate
  if (p.nights !== null && p.nights !== undefined) v.nights = p.nights
  if (p.departureAirports && p.departureAirports.length) v.departureAirports = p.departureAirports
  if (p.tourUnit !== null && p.tourUnit !== undefined) v.tourUnit = p.tourUnit
  if (p.packageGroup) v.packageGroup = p.packageGroup
  if (p.products && p.products.length) v.products = p.products
  if (p.coupons && p.coupons.length) v.coupons = p.coupons
  if (p.numOfInstalments) v.numOfInstalments = p.numOfInstalments
  if (p.properties && p.properties.length) v.properties = p.properties
  if (p.deferred !== undefined) v.deferred = p.deferred
  if (p.priceSeen) v.priceSeen = p.priceSeen
  return v
}

export function calendarVars(p: BookingPayload, dateFrom?: string, dateTo?: string) {
  const v: Record<string, unknown> = {
    offerId: p.offerId,
    people: p.people,
    groups: p.groups,
  }
  if (p.departureAirports && p.departureAirports.length) v.departureAirports = p.departureAirports
  if (p.packageGroup) v.packageGroups = [p.packageGroup]
  if (p.nights !== undefined && p.nights !== null) v.nights = [p.nights]
  else if (p.nights === null) v.nights = [null]
  if (dateFrom) v.dateFrom = dateFrom
  if (dateTo) v.dateTo = dateTo
  return v
}

export function stripProductsByPrefix(products: ProductInput[] | undefined, prefix: string): ProductInput[] {
  if (!products) return []
  return products.filter((p) => !p.id.startsWith(prefix))
}

export function replaceProductByPrefix(
  products: ProductInput[] | undefined,
  prefix: string,
  next: ProductInput | null,
): ProductInput[] {
  const cleaned = (products ?? []).filter((p) => !p.id.startsWith(prefix))
  if (next) cleaned.push(next)
  return cleaned
}
