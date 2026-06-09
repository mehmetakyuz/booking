import { gql } from './gql'
import * as Q from './queries'
import { stripProductsByPrefix } from './payload'
import type {
  Accommodation, AccommodationData, ActivityData, BookingPayload, CalendarData,
  Car, CarData, CarExtrasData, CheckoutMeta, Flight, FlightLeg, ItineraryComponent,
  ItineraryEvent, OfferMeta, PaymentMethod, ReceiptData, ReceiptLine,
} from './types'

function sessionHeaders(sessionId: string): Record<string, string> {
  return { 'x-tb-sessionid': sessionId }
}

// ---- Variable mappers ----
// The payload uses `selectedDate`; every dynamicPackage* query takes `$date`.

interface DpVariables {
  offerId: string
  date?: string
  nights?: number
  departureAirports?: string[]
  packageGroup?: string
  people: unknown[]
  groups: unknown[]
  products?: unknown[]
  [key: string]: unknown
}

export function dpVariables(payload: BookingPayload, products = payload.products): DpVariables {
  const vars: DpVariables = {
    offerId: payload.offerId,
    people: payload.people,
    groups: payload.groups,
  }
  if (payload.selectedDate) vars.date = payload.selectedDate
  if (payload.nights != null) vars.nights = payload.nights
  if (payload.departureAirports?.length) vars.departureAirports = payload.departureAirports
  // An empty-string packageGroup means "All packages"; omit it from API variables.
  if (payload.packageGroup) vars.packageGroup = payload.packageGroup
  if (payload.tourUnit != null) vars.tourUnit = payload.tourUnit
  if (products?.length) vars.products = products
  return vars
}

// Calendar takes plural list-typed filters; receipt/dynamicPackage take singulars.
export function calendarVariables(payload: BookingPayload, nightsFilter: number | null): Record<string, unknown> {
  const vars: Record<string, unknown> = {
    id: payload.offerId,
    people: payload.people,
    groups: payload.groups,
  }
  if (nightsFilter != null) vars.nights = [nightsFilter]
  if (payload.departureAirports?.length) vars.departureAirports = payload.departureAirports
  if (payload.packageGroup) vars.packageGroups = [payload.packageGroup]
  return vars
}

// ---- Offer ----

export async function fetchOffer(offerId: string, sessionId: string): Promise<OfferMeta> {
  const data = await gql<{ offer: Record<string, any> | null }>(Q.GET_OFFER, { id: offerId }, sessionHeaders(sessionId))
  const o = data.offer
  if (!o) throw new Error('Offer not found')
  return {
    id: String(o.id),
    title: o.title,
    shortTitle: o.shortTitle,
    currency: o.currency || 'GBP',
    image: o.image ?? null,
    gallery: o.gallery ?? [],
    location: o.destinationText?.location ?? null,
    hasFlights: Boolean(o.hasFlights),
    hasCars: Boolean(o.hasCars),
    hasAccommodationUnits: Boolean(o.hasAccommodationUnits),
    isLeisureOnly: Boolean(o.isLeisureOnly),
    selectDate: Boolean(o.selectDate),
    isRoundtrip: Boolean(o.isRoundtrip),
    occupancyRules: o.occupancyRules ?? null,
    paymentHelp: o.paymentHelp ?? '',
    termsMarkdown: o.termsAndConditions?.markdown ?? '',
    termsCheck: Boolean(o.termsAndConditions?.check),
    includedListWithDescriptions: o.includedListWithDescriptions ?? [],
    excludedList: o.excludedList ?? [],
    informationList: o.informationList ?? [],
  }
}

// ---- Calendar ----

export async function fetchCalendar(
  payload: BookingPayload,
  nightsFilter: number | null,
): Promise<CalendarData> {
  const data = await gql<{ offer: { calendar: any } | null }>(
    Q.GET_CALENDAR,
    calendarVariables(payload, nightsFilter),
    sessionHeaders(payload.sessionId),
  )
  const c = data.offer?.calendar
  if (!c) throw new Error('Calendar unavailable')
  return {
    departureAirports: c.departureAirports ?? [],
    packageGroups: c.packageGroups ?? [],
    nights: c.nights ?? [],
    dates: (c.dates ?? []).map((d: any) => ({ ...d, nights: d.nights ?? [] })),
    minDate: c.minDate ?? null,
    maxDate: c.maxDate ?? null,
    minChildAge: c.minChildAge ?? null,
    maxChildAge: c.maxChildAge ?? null,
  }
}

// ---- Receipt ----

const COMPONENT_TYPE_MAP: Record<string, ItineraryComponent['type']> = {
  ItineraryAccommodationComponent: 'accommodation',
  ItineraryFlightComponent: 'flight',
  ItineraryCarComponent: 'car',
  ItineraryLeisureComponent: 'activity',
  ItineraryTransferComponent: 'transfer',
}

function normalizeComponent(raw: any): ItineraryComponent {
  const type = COMPONENT_TYPE_MAP[raw.__typename] ?? 'other'
  const comp: ItineraryComponent = {
    type,
    label: raw.label ?? null,
    sublabel: raw.sublabel ?? null,
  }
  if (type === 'accommodation') {
    comp.checkinDate = raw.checkinDate ?? null
    comp.checkoutDate = raw.checkoutDate ?? null
    comp.stayNights = raw.stayNights ?? null
    comp.accommodationName = raw.accommodation?.name ?? null
    comp.unitName = raw.unit?.name ?? null
    comp.boardName = raw.board?.name ?? null
  } else if (type === 'flight') {
    comp.legLabel = raw.leg?.label ?? null
    comp.segments = (raw.leg?.segments ?? []).map((s: any) => ({
      airline: s.airline?.name ?? null,
      operatingAirline: s.operatingAirline?.name ?? null,
      departureAirport: s.departure?.airport?.iataCode ?? null,
      departureCity: s.departure?.airport?.cityName ?? null,
      departureTime: s.departure?.datetime ?? null,
      arrivalAirport: s.arrival?.airport?.iataCode ?? null,
      arrivalCity: s.arrival?.airport?.cityName ?? null,
      arrivalTime: s.arrival?.datetime ?? null,
      cabinClass: s.cabinClass ?? null,
      luggageAllowance: s.luggageAllowance ?? null,
      luggageIncluded: s.luggageIncluded ?? null,
    }))
  } else if (type === 'car') {
    comp.carModel = raw.car?.model ?? null
    comp.carImage = raw.car?.image?.url ?? null
    comp.pickupLocation = raw.pickupLocation?.name ?? null
    comp.dropoffLocation = raw.dropoffLocation?.name ?? null
  }
  return comp
}

function normalizeReceipt(r: any): ReceiptData {
  // itinerary is {events: [...]}, not a flat array.
  const events: ItineraryEvent[] = (r.itinerary?.events ?? []).map((e: any) => ({
    label: e.label ?? null,
    sublabel: e.sublabel ?? null,
    date: e.date ?? null,
    components: (e.components ?? []).map(normalizeComponent),
  }))
  const lines: ReceiptLine[] = (r.lines ?? []).map((l: any) => ({
    kind: l.__typename,
    label: l.label ?? null,
    format: l.format ?? null,
    amount: l.amount ?? null,
    perPerson: l.perPerson ?? null,
    text: l.text ?? null,
  }))
  return {
    title: r.title ?? null,
    totalPrice: r.totalPrice ?? null,
    oldPrice: r.oldPrice ?? null,
    discount: r.discount ?? null,
    perPersonPrice: r.perPersonPrice ?? null,
    startDate: r.startDate ?? null,
    endDate: r.endDate ?? null,
    nights: r.nights ?? null,
    lines,
    included: r.included ?? [],
    excluded: r.excluded ?? [],
    instalmentsPayments: r.instalmentsPayments ?? [],
    cancellationConditions: r.cancellationConditions ?? null,
    errors: r.errors ?? [],
    itinerary: events,
  }
}

export async function fetchReceipt(payload: BookingPayload): Promise<ReceiptData> {
  const vars = dpVariables(payload)
  if (payload.coupons?.length) vars.coupons = payload.coupons
  if (payload.numOfInstalments != null) vars.numOfInstalments = payload.numOfInstalments
  if (payload.deferred != null) vars.deferred = payload.deferred
  if (payload.priceSeen != null) vars.priceSeen = payload.priceSeen
  const data = await gql<{ dynamicPackageReceipt: any }>(Q.GET_RECEIPT, vars, sessionHeaders(payload.sessionId))
  if (!data.dynamicPackageReceipt) throw new Error('Receipt unavailable')
  return normalizeReceipt(data.dynamicPackageReceipt)
}

// ---- Accommodations ----

export async function fetchAccommodations(payload: BookingPayload): Promise<AccommodationData> {
  // Strip our own family products from the options fetch.
  const products = stripProductsByPrefix(payload.products, 'A:')
  const vars = dpVariables(payload, products)
  const data = await gql<{ dynamicPackage: any }>(Q.GET_ACCOMMODATIONS, vars, sessionHeaders(payload.sessionId))
  // The API spells this field `accomodations`.
  const list = data.dynamicPackage?.accomodations ?? []
  const accommodations: Accommodation[] = list.map((a: any) => ({
    id: a.id,
    price: a.price ?? null,
    selected: a.selected ?? null,
    name: a.name ?? null,
    subTitle: a.subTitle ?? null,
    description: a.description ?? null,
    image: a.image ?? null,
    imagePreviews: a.imagePreviews ?? [],
    facilities: a.facilities ?? [],
    starRating: a.starRating ?? null,
    checkinDate: a.checkinDate ?? null,
    checkoutDate: a.checkoutDate ?? null,
    venue: a.venue ?? null,
    units: (a.units ?? []).map((u: any) => ({
      id: u.id,
      price: u.price ?? null,
      selected: u.selected ?? null,
      name: u.name ?? null,
      description: u.description ?? null,
      image: u.image ?? null,
      images: u.images ?? [],
      facilities: u.facilities ?? [],
      boards: u.boards ?? [],
    })),
  }))
  return { accommodations }
}

// ---- Activities ----

export async function fetchLeisures(payload: BookingPayload): Promise<ActivityData> {
  const products = stripProductsByPrefix(payload.products, 'L:')
  const vars = dpVariables(payload, products)
  const data = await gql<{ dynamicPackage: any }>(Q.GET_LEISURES, vars, sessionHeaders(payload.sessionId))
  const dp = data.dynamicPackage
  return {
    basePrice: dp?.price ?? null,
    leisures: (dp?.leisures ?? []).map((g: any) => ({
      id: g.id,
      price: g.price ?? null,
      selected: g.selected ?? null,
      date: g.date ?? null,
      optional: g.optional ?? null,
      units: (g.units ?? []).map((u: any) => ({
        id: u.id,
        price: u.price ?? null,
        selected: u.selected ?? null,
        name: u.name ?? null,
        description: u.description ?? null,
        additionalInformation: u.additionalInformation ?? null,
        image: u.image ?? null,
        images: u.images ?? [],
        duration: u.duration ?? null,
        startTime: u.startTime ?? null,
        endTime: u.endTime ?? null,
        groupType: u.groupType ?? null,
        venue: u.venue ?? null,
      })),
    })),
  }
}

// ---- Async task groups ----

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 90_000

export class TaskGroupFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaskGroupFailure'
  }
}

export async function runTaskGroup(payload: BookingPayload, key: string): Promise<void> {
  const start = await gql<{ startTaskGroup: { taskGroupId: string | null; started: boolean } }>(
    Q.START_TASK_GROUP,
    { tasks: [{ key, dynamicPackage: dpVariables(payload) }] },
    sessionHeaders(payload.sessionId),
  )
  const taskGroupId = start.startTaskGroup?.taskGroupId
  if (!taskGroupId) throw new TaskGroupFailure(`Task group ${key} did not start`)

  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const poll = await gql<{ pollTaskGroup: { status: string } | null }>(
      Q.POLL_TASK_GROUP,
      { taskGroupId },
      sessionHeaders(payload.sessionId),
    )
    const status = poll.pollTaskGroup?.status
    if (status === 'FINISHED') return
    if (status === 'FAILED') throw new TaskGroupFailure(`Task group ${key} failed`)
  }
  throw new TaskGroupFailure(`Task group ${key} timed out`)
}

// ---- Flights ----

function normalizeLeg(l: any): FlightLeg | null {
  if (!l) return null
  return {
    label: l.label ?? null,
    luggageIncluded: l.luggageIncluded ?? null,
    luggageAllowance: l.luggageAllowance ?? null,
    handLuggageRules: l.handLuggageRules ?? null,
    segments: (l.segments ?? []).map((s: any) => ({
      airline: s.airline ?? null,
      operatingAirline: s.operatingAirline ?? null,
      departure: s.departure ?? null,
      arrival: s.arrival ?? null,
      flightnumber: s.flightnumber ?? null,
      luggageIncluded: s.luggageIncluded ?? null,
      luggageAllowance: s.luggageAllowance ?? null,
      handLuggageRules: s.handLuggageRules ?? null,
      cabinClass: s.cabinClass ?? null,
    })),
  }
}

export async function fetchFlights(payload: BookingPayload): Promise<Flight[]> {
  const vars = dpVariables(payload)
  const data = await gql<{ dynamicPackage: any }>(Q.GET_FLIGHTS, vars, sessionHeaders(payload.sessionId))
  return (data.dynamicPackage?.flights ?? []).map((f: any) => ({
    id: f.id,
    price: f.price ?? null,
    selected: f.selected ?? null,
    luggageIncluded: f.luggageIncluded ?? null,
    luggageAllowance: f.luggageAllowance ?? null,
    cabinClass: f.cabinClass ?? null,
    outboundLeg: normalizeLeg(f.outboundLeg),
    inboundLeg: normalizeLeg(f.inboundLeg),
  }))
}

// ---- Cars ----

export async function fetchCars(payload: BookingPayload): Promise<CarData> {
  const vars = dpVariables(payload)
  const data = await gql<{ dynamicPackage: any }>(Q.GET_CARS, vars, sessionHeaders(payload.sessionId))
  const cars: Car[] = (data.dynamicPackage?.cars ?? []).map((c: any) => ({
    id: c.id,
    price: c.price ?? null,
    selected: c.selected ?? null,
    vehicle: c.vehicle ?? null,
    pickupLocation: c.pickupLocation ?? null,
    dropoffLocation: c.dropoffLocation ?? null,
    productTermsUrl: c.productTermsUrl ?? null,
  }))
  return { cars }
}

export async function fetchCarExtras(sessionId: string, carId: string): Promise<CarExtrasData> {
  const data = await gql<{ carExtra: { extras: any[] } | null }>(
    Q.GET_CAR_EXTRAS,
    { carProductSetId: carId },
    sessionHeaders(sessionId),
  )
  return {
    carId,
    extras: (data.carExtra?.extras ?? []).map((e: any) => ({
      id: e.id,
      name: e.name ?? null,
      amount: e.price?.amount ?? null,
      prePayable: e.prePayable ?? null,
      extraType: e.extraType ?? null,
      keyFactsUrl: e.keyFactsUrl ?? null,
      policyDocUrl: e.policyDocUrl ?? null,
    })),
  }
}

// ---- Checkout ----

export async function fetchCheckoutMeta(payload: BookingPayload): Promise<CheckoutMeta> {
  const vars = dpVariables(payload)
  const [meta, countriesData] = await Promise.all([
    gql<{ dynamicPackage: any }>(Q.GET_CHECKOUT_META, vars, sessionHeaders(payload.sessionId)),
    gql<{ countries: any[] }>(Q.GET_COUNTRIES, {}, sessionHeaders(payload.sessionId)),
  ])
  const dp = meta.dynamicPackage ?? {}
  const paymentMethods: PaymentMethod[] = (dp.paymentMethods ?? []).filter(Boolean).map((m: any) => ({
    id: m.id,
    name: m.name ?? null,
    image: m.image ?? null,
    default: m.default ?? null,
  }))
  return {
    customerFields: dp.customerSalesflowDisplayFields ?? [],
    participantFields: dp.participantSalesflowDisplayFields ?? [],
    paymentMethods,
    maxNrOfInstalments: dp.maxNrOfInstalments ?? 1,
    termsMarkdown: dp.termsAndConditions?.markdown ?? '',
    termsCheck: Boolean(dp.termsAndConditions?.check),
    euDirectiveText: dp.euDirectiveText ?? null,
    namesMustMatchId: Boolean(dp.namesMustMatchId),
    passportRequired: Boolean(dp.passportRequired),
    countries: (countriesData.countries ?? []).filter(Boolean),
  }
}

// ---- Order ----

export interface CreateOrderResultData {
  order: { id: string | null; token: string | null; referenceId: string | null; restoreUrl: string | null } | null
  continueUrl: string | null
  errors: { code: string | null; field: string | null; message: string | null }[]
}

export async function createOrder(
  payload: BookingPayload,
  args: { paymentMethod: string | null; totalPrice: number; restoreUrl: string },
): Promise<CreateOrderResultData> {
  const vars: Record<string, unknown> = {
    offerId: payload.offerId,
    customer: 0,
    people: payload.people,
    totalPrice: args.totalPrice,
    date: payload.selectedDate,
    nights: payload.nights,
    products: payload.products ?? [],
    groups: payload.groups,
    properties: [...(payload.properties ?? []), { name: 'restore_url', value: args.restoreUrl }],
  }
  if (args.paymentMethod) vars.paymentMethod = args.paymentMethod
  if (payload.coupons?.length) vars.coupons = payload.coupons
  if (payload.numOfInstalments != null) vars.numOfInstalments = payload.numOfInstalments
  if (payload.departureAirports?.length) vars.departureAirports = payload.departureAirports
  if (payload.tourUnit != null) vars.tourUnit = payload.tourUnit
  if (payload.packageGroup) vars.packageGroup = payload.packageGroup
  if (payload.deferred != null) vars.deferred = payload.deferred

  const data = await gql<{ createOrder: { result: any } }>(Q.CREATE_ORDER, vars, sessionHeaders(payload.sessionId))
  const result = data.createOrder?.result
  return {
    order: result?.order ?? null,
    continueUrl: result?.paymentResult?.continueUrl ?? null,
    errors: result?.errors ?? [],
  }
}
