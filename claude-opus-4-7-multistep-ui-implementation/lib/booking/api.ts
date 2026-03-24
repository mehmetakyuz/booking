import { gql } from '@/lib/graphql/client'
import {
  Q_OFFER,
  Q_CALENDAR,
  Q_RECEIPT,
  Q_ACCOMMODATIONS,
  Q_LEISURES,
  Q_FLIGHTS,
  Q_CARS,
  Q_CAR_EXTRAS,
  Q_CHECKOUT,
  Q_COUNTRIES,
  M_START_TASK_GROUP,
  Q_POLL_TASK_GROUP,
  M_CREATE_ORDER,
} from '@/lib/graphql/queries'
import type {
  BookingPayload,
  OfferMeta,
  CalendarData,
  ReceiptData,
  Accommodation,
  LeisureGroup,
  Flight,
  Car,
  CarExtra,
  CheckoutMeta,
} from './types'
import { baseReceiptVars, calendarVars, stripProductsByPrefix } from './variables'

function sessionHeaders(sessionId: string) {
  return { 'x-tb-sessionid': sessionId }
}

export async function fetchOffer(offerId: string, sessionId: string): Promise<OfferMeta> {
  const d = await gql<{ offer: OfferMeta }>(Q_OFFER, { offerId }, { headers: sessionHeaders(sessionId) })
  return d.offer
}

export async function fetchCalendar(
  payload: BookingPayload,
  opts: { dateFrom?: string; dateTo?: string } = {},
): Promise<CalendarData> {
  const d = await gql<{ offer: { calendar: CalendarData } }>(
    Q_CALENDAR,
    calendarVars(payload, opts.dateFrom, opts.dateTo),
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.offer.calendar
}

export async function fetchReceipt(payload: BookingPayload): Promise<ReceiptData> {
  const d = await gql<{ dynamicPackageReceipt: ReceiptData }>(
    Q_RECEIPT,
    baseReceiptVars(payload),
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.dynamicPackageReceipt
}

export async function fetchAccommodations(
  payload: BookingPayload,
): Promise<{ accomodations: Accommodation[] }> {
  const vars = baseReceiptVars(payload) as Record<string, unknown>
  vars.products = stripProductsByPrefix(payload.products, 'A:')
  const d = await gql<{ dynamicPackage: { accomodations: Accommodation[] } }>(
    Q_ACCOMMODATIONS,
    vars,
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.dynamicPackage
}

export async function fetchLeisures(
  payload: BookingPayload,
): Promise<{ price: number; leisures: LeisureGroup[] }> {
  const vars = baseReceiptVars(payload) as Record<string, unknown>
  vars.products = stripProductsByPrefix(payload.products, 'L:')
  const d = await gql<{ dynamicPackage: { price: number; leisures: LeisureGroup[] } }>(
    Q_LEISURES,
    vars,
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.dynamicPackage
}

export async function fetchFlights(payload: BookingPayload): Promise<{ flights: Flight[] }> {
  const vars = baseReceiptVars(payload) as Record<string, unknown>
  vars.products = payload.products ?? []
  const d = await gql<{ dynamicPackage: { flights: Flight[] } }>(
    Q_FLIGHTS,
    vars,
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.dynamicPackage
}

export async function fetchCars(payload: BookingPayload): Promise<{ cars: Car[] }> {
  const vars = baseReceiptVars(payload) as Record<string, unknown>
  vars.products = payload.products ?? []
  const d = await gql<{ dynamicPackage: { cars: Car[] } }>(
    Q_CARS,
    vars,
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.dynamicPackage
}

export async function fetchCarExtras(
  carProductSetId: string,
  sessionId: string,
): Promise<{ extras: CarExtra[] }> {
  const d = await gql<{ carExtra: { extras: CarExtra[] } }>(
    Q_CAR_EXTRAS,
    { carProductSetId },
    { headers: sessionHeaders(sessionId) },
  )
  return d.carExtra
}

export async function fetchCheckoutMeta(payload: BookingPayload): Promise<CheckoutMeta> {
  const d = await gql<{ dynamicPackage: CheckoutMeta }>(
    Q_CHECKOUT,
    baseReceiptVars(payload),
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.dynamicPackage
}

export async function fetchCountries(sessionId: string) {
  const d = await gql<{ countries: { code: string; name: string; dialCode?: string; nationality?: string }[] }>(
    Q_COUNTRIES,
    {},
    { headers: sessionHeaders(sessionId) },
  )
  return d.countries
}

function taskDynamicPackage(payload: BookingPayload) {
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

export async function startFlightSearchTask(payload: BookingPayload): Promise<string> {
  const d = await gql<{ startTaskGroup: { taskGroupId: string } }>(
    M_START_TASK_GROUP,
    { tasks: [{ key: 'FLIGHT_SEARCH', dynamicPackage: taskDynamicPackage(payload) }] },
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.startTaskGroup.taskGroupId
}

export async function startFlightPriceValidationTask(payload: BookingPayload): Promise<string> {
  const d = await gql<{ startTaskGroup: { taskGroupId: string } }>(
    M_START_TASK_GROUP,
    { tasks: [{ key: 'FLIGHT_PRICE_VALIDATION', dynamicPackage: taskDynamicPackage(payload) }] },
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.startTaskGroup.taskGroupId
}

export async function startCarSearchTask(payload: BookingPayload): Promise<string> {
  const d = await gql<{ startTaskGroup: { taskGroupId: string } }>(
    M_START_TASK_GROUP,
    { tasks: [{ key: 'CAR_SEARCH', dynamicPackage: taskDynamicPackage(payload) }] },
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.startTaskGroup.taskGroupId
}

export async function pollTaskGroup(taskGroupId: string, sessionId: string): Promise<string> {
  const d = await gql<{ pollTaskGroup: { status: string } }>(
    Q_POLL_TASK_GROUP,
    { taskGroupId },
    { headers: sessionHeaders(sessionId) },
  )
  return d.pollTaskGroup.status
}

export async function waitForTaskGroup(
  taskGroupId: string,
  sessionId: string,
  timeoutMs = 120_000,
): Promise<'FINISHED' | 'FAILED' | 'TIMEOUT'> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const status = await pollTaskGroup(taskGroupId, sessionId)
    if (status === 'FINISHED') return 'FINISHED'
    if (status === 'FAILED' || status === 'ERROR') return 'FAILED'
    await new Promise((r) => setTimeout(r, 1500))
  }
  return 'TIMEOUT'
}

export async function createOrder(
  payload: BookingPayload,
  totalPrice: number,
  paymentMethodId: number,
  customerId?: number,
): Promise<{
  errors?: { code?: string; field?: string; message: string }[]
  order?: { referenceId: string }
  paymentResult?: { continueUrl: string }
}> {
  const vars = {
    ...baseReceiptVars(payload),
    totalPrice,
    paymentMethod: paymentMethodId,
    customer: customerId,
  }
  const d = await gql<{ createOrder: { result: {
    errors?: { code?: string; field?: string; message: string }[]
    order?: { referenceId: string }
    paymentResult?: { continueUrl: string }
  } } }>(
    M_CREATE_ORDER,
    vars,
    { headers: sessionHeaders(payload.sessionId) },
  )
  return d.createOrder.result
}
