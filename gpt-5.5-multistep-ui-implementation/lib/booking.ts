'use client'

export type StepId = 'dates' | 'rooms' | 'activities' | 'flights' | 'cars' | 'checkout'

export type PersonInput = {
  type?: 'adult' | 'child'
  age?: number
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  birthDate?: string
}

export type ProductInput = {
  id: string
  group?: number
  options?: Array<{ id: string; value: string }>
}

export type BookingPayload = {
  offerId: string
  sessionId: string
  people: PersonInput[]
  groups: Array<{ people: number[] }>
  departureAirports?: string[]
  packageGroup?: string
  nightsFilter?: number | null
  nights?: number | null
  selectedDate?: string
  tourUnit?: number | null
  products: ProductInput[]
  coupons: string[]
  numOfInstalments: number
  deferred: boolean
  properties: Array<{ key?: string; name?: string; value?: string }>
  priceSeen?: string
}

export type Offer = {
  id: string
  title: string
  shortTitle: string
  currency: string
  price: number
  oldPrice: number
  imageUrl: string
  location: string
  hasFlights: boolean
  hasCars: boolean
  hasAccommodationUnits: boolean
  isLeisureOnly: boolean
  occupancyRules: {
    minAdults: number
    maxAdults: number
    minChildren: number
    maxChildren: number
    minChildAge?: number | null
    maxChildAge?: number | null
  }
  informationList: Array<{ id: string; label: string; value: string; type: string }>
  terms: { check?: string | null; text?: string | null; markdown?: string | null; termsLinks: Array<{ url: string; type: string }>; pages: Array<{ url: string; pageType: string }> }
}

export type CalendarData = {
  dates: Array<{ date: string; price: number; quantity?: number | null; nights: Array<{ nights: number; price: number }> }>
  nights: Array<{ nights: number | null; price: number }>
  airports: Array<{ code: string; name: string; city: string; price: number }>
  packageGroups: Array<{ id: string; name: string; description: string; price: number; oldPrice?: number; imageUrl?: string }>
  months: string[]
}

export type Receipt = {
  title: string
  totalPrice: number
  oldPrice: number
  discount: number
  perPersonPrice: number
  startDate?: string | null
  endDate?: string | null
  nights?: number | null
  lines: Array<{ label: string; amount?: number; text?: string; perPerson?: number }>
  included: Array<{ title: string; description?: string; price?: number }>
  excluded: Array<{ title: string; description?: string; price?: number }>
  instalmentPayments: Array<Array<{ amount: number; payBeforeDate?: string | null }>>
  errors: Array<{ code?: string; field?: string; message: string }>
  itinerary: Array<{
    label: string
    sublabel?: string
    date?: string
    components: Array<{
      type: 'accommodation' | 'flight' | 'car' | 'activity' | 'other'
      label: string
      sublabel?: string
      accommodationName?: string
      unitName?: string
      boardName?: string
      flightSegments?: Array<{ from: string; to: string; departureAt?: string; arrivalAt?: string; airline?: string; flightNumber?: string; luggage?: string }>
      carModel?: string
      carImageUrl?: string
      pickup?: string
      dropoff?: string
    }>
  }>
}

export type Accommodation = {
  id: string
  name: string
  subtitle: string
  description: string
  address: string
  imageUrl: string
  gallery: string[]
  price: number
  stars?: number
  selected?: boolean
  facilities: Array<{ name: string; icon?: string | null }>
  units: Array<{
    id: string
    name: string
    subtitle: string
    description: string
    price: number
    selected?: boolean
    imageUrl: string
    gallery: string[]
    facilities: Array<{ name: string; icon?: string | null }>
    boards: Array<{ id: string; name: string; description: string; price: number; selected?: boolean }>
  }>
}

export type Activity = {
  id: string
  parentId: string
  name: string
  description: string
  price: number
  selected: boolean
  optional: boolean
  date?: string | null
  duration?: string | null
  groupType?: string | null
  imageUrl?: string
  gallery: string[]
}

export type Flight = {
  id: string
  price: number
  selected?: boolean
  badges: string[]
  legs: Array<{
    label: string
    segments: Array<{
      airline?: string
      airlineCode?: string
      logo?: string
      flightNumber?: string
      from: string
      fromCity: string
      to: string
      toCity: string
      departureAt?: string
      arrivalAt?: string
      luggage?: string
      cabin?: string
    }>
  }>
}

export type Car = {
  id: string
  name: string
  category: string
  transmission: string
  seats?: number | null
  doors?: number | null
  airConditioning?: boolean
  price: number
  selected?: boolean
  imageUrl?: string
  pickup?: string
  dropoff?: string
  insurance?: string
  termsUrl?: string
}

export type CarExtra = {
  id: string
  name: string
  extraType?: string
  price: number
  prePayable?: boolean
  keyFactsUrl?: string
  policyDocUrl?: string
}

export type CheckoutData = {
  fields: string[]
  participantFields: string[]
  countries: Array<{ code: string; name: string; dialCode?: string }>
  paymentMethods: Array<{ id: string; name: string; imageUrl?: string; default?: boolean; availableInInstalments?: boolean }>
  maxNrOfInstalments: number
  termsMarkdown: string
  termsText: string
  euDirectiveText: string
  specialWishesSupported: boolean
}

export type Snapshot = {
  step?: StepId
  payload: Partial<BookingPayload>
  checkout?: Record<string, string>
}

const GET_OFFER = /* GraphQL */ `
  query OfferForBooking($offerId: ID!) {
    offer(id: $offerId) {
      id
      title
      shortTitle
      currency
      price
      oldPrice
      image { url(w: 780, h: 440) }
      hasFlights
      hasCars
      hasAccommodationUnits
      isLeisureOnly
      occupancyRules {
        minAdults
        maxAdults
        minChildren
        maxChildren
        minChildAge
        maxChildAge
      }
      offerCard { mainLocation }
      informationList(order: [hotel_night, checkin, checkout, currency, additional_list, payment, raw_conditions]) {
        id
        type
        label(format: markdown)
        value(format: markdown)
      }
      termsAndConditions {
        check
        text
        markdown
        termsLinks { url type }
        pages { url pageType }
      }
    }
  }
`

const GET_CALENDAR = /* GraphQL */ `
  query OfferCalendarForBooking(
    $offerId: ID!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]
    $nights: [Int]
    $departureAirports: [String]
    $packageGroups: [String]
    $tourUnits: [String]
  ) {
    offer(id: $offerId) {
      calendar(
        people: $people
        groups: $groups
        nights: $nights
        departureAirports: $departureAirports
        packageGroups: $packageGroups
        tourUnits: $tourUnits
      ) {
        dates { date price quantity nights { nights price } }
        nights { nights price }
        departureAirports { airport { iataCode name cityName } price }
        packageGroups { id name description price oldPrice images { url(w: 390, h: 220) } }
        months { month price }
      }
    }
  }
`

const RECEIPT = /* GraphQL */ `
  query ReceiptForBooking(
    $offerId: ID!
    $date: Date
    $nights: Int
    $products: [ProductInput]
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]
    $coupons: [String]
    $numOfInstalments: Int
    $departureAirports: [String]
    $tourUnit: Int
    $packageGroup: String
    $properties: [OrderPropertyInput]
    $deferred: Boolean
    $priceSeen: Price
  ) {
    dynamicPackageReceipt(
      offerId: $offerId
      date: $date
      nights: $nights
      products: $products
      people: $people
      groups: $groups
      coupons: $coupons
      numOfInstalments: $numOfInstalments
      departureAirports: $departureAirports
      tourUnit: $tourUnit
      packageGroup: $packageGroup
      properties: $properties
      deferred: $deferred
      priceSeen: $priceSeen
    ) {
      title
      totalPrice
      oldPrice
      discount
      perPersonPrice
      startDate
      endDate
      nights
      lines {
        label
        ... on ReceiptLineAmount { amount perPerson }
        ... on ReceiptLineText { text }
      }
      included { title description price }
      excluded { title description price }
      instalmentsPayments { amount payBeforeDate }
      errors { code field message }
      itinerary {
        events {
          label
          sublabel
          date
          components {
            __typename
            label
            sublabel
            ... on ItineraryAccommodationComponent {
              accommodation { name }
              unit { name }
              board { name }
            }
            ... on ItineraryFlightComponent {
              leg {
                label
                segments {
                  flightnumber
                  luggageAllowance
                  airline { name iataCode logo }
                  departure { datetime airport { iataCode cityName name } }
                  arrival { datetime airport { iataCode cityName name } }
                }
              }
            }
            ... on ItineraryCarComponent {
              car { model image { url } }
              pickupLocation { name venue { formattedAddress city country } }
              dropoffLocation { name venue { formattedAddress city country } }
            }
          }
        }
      }
    }
  }
`

const ACCOMMODATIONS = /* GraphQL */ `
  query AccommodationsForBooking(
    $offerId: ID!
    $date: Date!
    $nights: Int
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]
    $products: [ProductInput]!
    $departureAirports: [String]
    $packageGroup: String
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      people: $people
      groups: $groups
      products: $products
      departureAirports: $departureAirports
      packageGroup: $packageGroup
    ) {
      accomodations {
        id
        name
        subTitle
        price
        description
        starRating
        venue { formattedAddress }
        image { url(w: 480, h: 280) }
        imagePreviews { url(w: 640, h: 360) }
        facilities { name icon }
        units {
          id
          name
          subTitle
          description
          price
          selected
          image { url(w: 480, h: 280) }
          images { url(w: 640, h: 360) }
          facilities { name icon }
          boards { id name description price selected }
        }
      }
    }
  }
`

const ACTIVITIES = /* GraphQL */ `
  query ActivitiesForBooking(
    $offerId: ID!
    $date: Date!
    $nights: Int
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]
    $products: [ProductInput]!
    $departureAirports: [String]
    $packageGroup: String
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      people: $people
      groups: $groups
      products: $products
      departureAirports: $departureAirports
      packageGroup: $packageGroup
    ) {
      price
      leisures {
        productId
        price
        date
        selected
        optional
        units {
          productId
          selected
          price
          name
          description
          duration
          groupType
          images { url(w: 640, h: 360) }
          image { url(w: 240, h: 160) }
        }
      }
    }
  }
`

const FLIGHTS = /* GraphQL */ `
  query FlightsForBooking(
    $offerId: ID!
    $date: Date!
    $nights: Int
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]
    $products: [ProductInput]!
    $departureAirports: [String]!
    $packageGroup: String
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      people: $people
      groups: $groups
      products: $products
      departureAirports: $departureAirports
      packageGroup: $packageGroup
    ) {
      flights {
        id
        selected
        price
        luggageAllowance
        badges { badgeText }
        legs {
          label
          segments {
            flightnumber
            luggageAllowance
            cabinClass
            airline { iataCode name logoUrl }
            departure { datetime airport { iataCode name cityName } }
            arrival { datetime airport { iataCode name cityName } }
          }
        }
      }
    }
  }
`

const CARS = /* GraphQL */ `
  query CarsForBooking(
    $offerId: ID!
    $date: Date!
    $nights: Int
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]
    $products: [ProductInput]!
    $departureAirports: [String]!
    $packageGroup: String
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      people: $people
      groups: $groups
      products: $products
      departureAirports: $departureAirports
      packageGroup: $packageGroup
    ) {
      cars {
        id
        selected
        price
        insurance
        productTermsUrl
        vehicle { modelName minSeats doors airConditioning transmission category photo { url(w: 260, h: 170) } }
        pickupLocation { name airport { name cityName iataCode } }
        dropoffLocation { name airport { name cityName iataCode } }
      }
    }
  }
`

const CAR_EXTRAS = /* GraphQL */ `
  query CarExtrasForBooking($carProductSetId: ID!) {
    carExtra(carProductSetId: $carProductSetId) {
      extras {
        id
        name
        extraType
        prePayable
        keyFactsUrl
        policyDocUrl
        price { amount }
      }
    }
  }
`

const CHECKOUT = /* GraphQL */ `
  query CheckoutForBooking(
    $offerId: ID!
    $date: Date
    $nights: Int
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]
    $products: [ProductInput]
    $departureAirports: [String]
    $packageGroup: String
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      people: $people
      groups: $groups
      products: $products
      departureAirports: $departureAirports
      packageGroup: $packageGroup
    ) {
      availableCouponSources { source disclaimer }
      paymentMethods {
        id
        name
        default
        availableInInstalments
        image { url(w: 64, h: 47) }
      }
      maxNrOfInstalments
      customerSalesflowDisplayFields
      participantSalesflowDisplayFields
      namesMustMatchId
      termsAndConditions { check text markdown termsLinks { url type } pages { url pageType } }
      euDirectiveText
      accomodations { specialWishesAreSupported }
    }
    countries { code name dialCode }
  }
`

const START_TASK = /* GraphQL */ `
  mutation StartBookingTask($tasks: [TaskInput]!) {
    startTaskGroup(tasks: $tasks) { taskGroupId }
  }
`

const POLL_TASK = /* GraphQL */ `
  query PollBookingTask($taskGroupId: ID!) {
    pollTaskGroup(taskGroupId: $taskGroupId) { status }
  }
`

const CREATE_ORDER = /* GraphQL */ `
  mutation CreateBookingOrder(
    $offerId: ID!
    $people: [PersonInput]!
    $totalPrice: Price!
    $date: Date
    $paymentMethod: Int
    $nights: Int
    $products: [ProductInput]
    $groups: [PersonGroupsInput]
    $coupons: [String]
    $numOfInstalments: Int
    $departureAirports: [String]
    $packageGroup: String
    $properties: [OrderPropertyInput]
    $deferred: Boolean
    $priceSeen: Price
  ) {
    createOrder(
      offerId: $offerId
      people: $people
      totalPrice: $totalPrice
      date: $date
      paymentMethod: $paymentMethod
      nights: $nights
      products: $products
      groups: $groups
      coupons: $coupons
      numOfInstalments: $numOfInstalments
      departureAirports: $departureAirports
      packageGroup: $packageGroup
      properties: $properties
      deferred: $deferred
      priceSeen: $priceSeen
    ) {
      result {
        errors { code field message }
        paymentResult { continueUrl }
      }
    }
  }
`

export function money(amount: number | undefined | null, currency = 'GBP', signed = false) {
  const raw = amount ?? 0
  const sign = signed && raw > 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: raw % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(raw / 100)}`
}

export function buildSteps(offer: Offer): Array<{ id: StepId; label: string }> {
  return [
    { id: 'dates', label: 'Dates' },
    ...(!offer.isLeisureOnly ? [{ id: 'rooms' as StepId, label: 'Rooms' }] : []),
    { id: 'activities', label: 'Activities' },
    ...(offer.hasFlights ? [{ id: 'flights' as StepId, label: 'Flights' }] : []),
    ...(offer.hasCars ? [{ id: 'cars' as StepId, label: 'Cars' }] : []),
    { id: 'checkout', label: 'Confirm & pay' },
  ]
}

export function makePayload(offerId: string, sessionId: string, adults = 2): BookingPayload {
  const people = Array.from({ length: adults }, () => ({}))
  return {
    offerId,
    sessionId,
    people,
    groups: [{ people: people.map((_, index) => index) }],
    products: [],
    coupons: [],
    numOfInstalments: 1,
    deferred: false,
    properties: [],
  }
}

export function peopleFromTravellers(adults: number, childAges: number[]) {
  const people: PersonInput[] = [
    ...Array.from({ length: adults }, () => ({})),
    ...childAges.map((age) => ({ type: 'child' as const, age })),
  ]
  return { people, groups: [{ people: people.map((_, index) => index) }] }
}

export function replaceProductFamily(products: ProductInput[], prefixes: string[], next: ProductInput[]) {
  return [...products.filter((item) => !prefixes.some((prefix) => item.id.startsWith(prefix))), ...dedupeProducts(next)]
}

export function dedupeProducts(products: ProductInput[]) {
  const seen = new Set<string>()
  return products.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function encodeSnapshot(snapshot: Snapshot) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(snapshot))))
}

export function decodeSnapshot(value: string | null): Snapshot | null {
  if (!value) return null
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value)))) as Snapshot
  } catch {
    return null
  }
}

export function publicPayloadSnapshot(payload: BookingPayload): Partial<BookingPayload> {
  return {
    offerId: payload.offerId,
    sessionId: payload.sessionId,
    people: payload.people,
    groups: payload.groups,
    departureAirports: payload.departureAirports,
    packageGroup: payload.packageGroup,
    nightsFilter: payload.nightsFilter,
    nights: payload.nights,
    selectedDate: payload.selectedDate,
    products: payload.products,
    coupons: payload.coupons,
    numOfInstalments: payload.numOfInstalments,
    deferred: payload.deferred,
    properties: payload.properties,
    priceSeen: payload.priceSeen,
  }
}

function calendarVars(payload: BookingPayload) {
  const nightsFilter = payload.nightsFilter !== undefined ? payload.nightsFilter : payload.nights

  return {
    offerId: payload.offerId,
    people: payload.people,
    groups: payload.groups,
    nights: typeof nightsFilter === 'number' ? [nightsFilter] : undefined,
    departureAirports: payload.departureAirports?.[0] ? [payload.departureAirports[0]] : undefined,
    packageGroups: payload.packageGroup ? [payload.packageGroup] : undefined,
    tourUnits: payload.tourUnit ? [String(payload.tourUnit)] : undefined,
  }
}

function dynamicVars(payload: BookingPayload) {
  return {
    offerId: payload.offerId,
    date: payload.selectedDate,
    nights: typeof payload.nights === 'number' ? payload.nights : undefined,
    people: payload.people,
    groups: payload.groups,
    products: payload.products ?? [],
    departureAirports: payload.departureAirports,
    packageGroup: payload.packageGroup || undefined,
  }
}

function receiptVars(payload: BookingPayload) {
  return {
    ...dynamicVars(payload),
    coupons: payload.coupons ?? [],
    numOfInstalments: payload.numOfInstalments ?? 1,
    deferred: payload.deferred ?? false,
    properties: payload.properties ?? [],
    priceSeen: payload.priceSeen,
  }
}

async function gql<T>(query: string, variables: Record<string, unknown>, sessionId?: string): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'x-tb-sessionid': sessionId } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(`GraphQL request failed with ${response.status}`)
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'GraphQL request failed')
  if (!json.data) throw new Error('GraphQL response did not include data')
  return json.data
}

export async function bootstrapBooking(offerId: string, snapshot: Snapshot | null) {
  const sessionId = snapshot?.payload.sessionId ?? crypto.randomUUID()
  const basePayload = { ...makePayload(offerId, sessionId), ...snapshot?.payload, offerId, sessionId } as BookingPayload
  const [offerResult, firstCalendarResult] = await Promise.all([
    gql<any>(GET_OFFER, { offerId }, sessionId),
    gql<any>(GET_CALENDAR, calendarVars(basePayload), sessionId),
  ])
  const offer = normalizeOffer(offerResult.offer)
  const firstCalendar = normalizeCalendar(firstCalendarResult.offer.calendar)
  const withDefaults: BookingPayload = {
    ...basePayload,
    departureAirports: basePayload.departureAirports ?? (firstCalendar.airports[0]?.code ? [firstCalendar.airports[0].code] : undefined),
    packageGroup: basePayload.packageGroup ?? firstCalendar.packageGroups[0]?.id,
  }
  const secondCalendarResult = await gql<any>(GET_CALENDAR, calendarVars(withDefaults), sessionId)
  const calendar = normalizeCalendar(secondCalendarResult.offer.calendar)
  const currentFilter = withDefaults.nightsFilter !== undefined ? withDefaults.nightsFilter : withDefaults.nights
  const nextFilter =
    currentFilter !== undefined && calendar.nights.some((item) => item.nights === currentFilter)
      ? currentFilter
      : calendar.nights[0]?.nights

  return {
    offer,
    calendar,
    payload: {
      ...withDefaults,
      nightsFilter: nextFilter,
      nights: nextFilter === null ? withDefaults.nights : nextFilter,
    },
    step: snapshot?.step ?? 'dates',
  }
}

export async function fetchCalendar(payload: BookingPayload) {
  const data = await gql<any>(GET_CALENDAR, calendarVars(payload), payload.sessionId)
  return normalizeCalendar(data.offer.calendar)
}

export async function fetchReceipt(payload: BookingPayload) {
  const data = await gql<any>(RECEIPT, receiptVars(payload), payload.sessionId)
  return normalizeReceipt(data.dynamicPackageReceipt)
}

export async function fetchAccommodations(payload: BookingPayload) {
  const stripped = { ...payload, products: payload.products.filter((item) => !item.id.startsWith('A:')) }
  const data = await gql<any>(ACCOMMODATIONS, dynamicVars(stripped), payload.sessionId)
  return normalizeAccommodations(data.dynamicPackage?.accomodations ?? [])
}

export async function fetchActivities(payload: BookingPayload) {
  const stripped = { ...payload, products: payload.products.filter((item) => !item.id.startsWith('L:')) }
  const data = await gql<any>(ACTIVITIES, dynamicVars(stripped), payload.sessionId)
  return {
    basePrice: data.dynamicPackage?.price ?? 0,
    activities: normalizeActivities(data.dynamicPackage?.leisures ?? []),
  }
}

export async function fetchFlights(payload: BookingPayload, onStage: (stage: 'searching' | 'validating') => void) {
  onStage('searching')
  await runTask('FLIGHT_SEARCH', payload, 45000)
  onStage('validating')
  await runTask('FLIGHT_PRICE_VALIDATION', payload, 45000)
  const data = await gql<any>(FLIGHTS, { ...dynamicVars(payload), departureAirports: payload.departureAirports ?? [] }, payload.sessionId)
  return normalizeFlights(data.dynamicPackage?.flights ?? [])
}

export async function fetchCars(payload: BookingPayload) {
  await runTask('CAR_SEARCH', payload, 45000)
  const data = await gql<any>(CARS, { ...dynamicVars(payload), departureAirports: payload.departureAirports ?? [] }, payload.sessionId)
  return normalizeCars(data.dynamicPackage?.cars ?? [])
}

export async function fetchCarExtras(payload: BookingPayload, carId: string) {
  const payloadWithCar = {
    ...payload,
    products: replaceProductFamily(payload.products, ['C:'], [{ id: carId }]),
  }
  await runTask('CAR_EXTRAS', payloadWithCar, 20000).catch(() => undefined)
  const data = await gql<any>(CAR_EXTRAS, { carProductSetId: carId }, payload.sessionId)
  return normalizeCarExtras(data.carExtra?.extras ?? [])
}

export async function fetchCheckout(payload: BookingPayload) {
  const data = await gql<any>(CHECKOUT, dynamicVars(payload), payload.sessionId)
  const pkg = data.dynamicPackage ?? {}
  return {
    fields: pkg.customerSalesflowDisplayFields ?? ['firstName', 'lastName', 'email', 'phone'],
    participantFields: pkg.participantSalesflowDisplayFields ?? ['firstName', 'lastName'],
    countries: (data.countries ?? []).map((item: any) => ({ code: item.code, name: item.name, dialCode: item.dialCode })),
    paymentMethods: (pkg.paymentMethods ?? []).map((item: any) => ({
      id: String(item.id),
      name: item.name,
      default: Boolean(item.default),
      availableInInstalments: Boolean(item.availableInInstalments),
      imageUrl: item.image?.url,
    })),
    maxNrOfInstalments: pkg.maxNrOfInstalments ?? 1,
    termsMarkdown: pkg.termsAndConditions?.markdown ?? pkg.termsAndConditions?.text ?? '',
    termsText: pkg.termsAndConditions?.check ?? '',
    euDirectiveText: pkg.euDirectiveText ?? '',
    specialWishesSupported: Boolean(pkg.accomodations?.some((item: any) => item.specialWishesAreSupported)),
  } satisfies CheckoutData
}

export async function submitOrder(payload: BookingPayload, receipt: Receipt, form: Record<string, string>, restoreUrl: string) {
  const lead = {
    ...payload.people[0],
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
  }
  const properties = [...(payload.properties ?? []), { key: 'restore_url', value: restoreUrl }]
  const variables = {
    ...receiptVars({ ...payload, properties }),
    people: [lead, ...payload.people.slice(1)],
    totalPrice: receipt.totalPrice,
    paymentMethod: Number(form.paymentMethodId || 0) || undefined,
  }
  const data = await gql<any>(CREATE_ORDER, variables, payload.sessionId)
  const result = data.createOrder?.result
  if (result?.errors?.length) throw new Error(result.errors[0].message ?? 'Unable to create order')
  const continueUrl = result?.paymentResult?.continueUrl
  if (!continueUrl) throw new Error('The payment continuation URL was not returned')
  return continueUrl as string
}

async function runTask(key: string, payload: BookingPayload, timeoutMs: number) {
  const dynamicPackage = dynamicVars(payload)
  const started = await gql<any>(START_TASK, { tasks: [{ key, dynamicPackage }] }, payload.sessionId)
  const taskGroupId = started.startTaskGroup?.taskGroupId
  if (!taskGroupId) throw new Error('The search task could not be started')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const data = await gql<any>(POLL_TASK, { taskGroupId }, payload.sessionId)
    const status = data.pollTaskGroup?.status
    if (status === 'FINISHED') return
    if (status === 'FAILED') throw new Error('No options are available for this stay')
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  throw new Error('The search took too long. Choose another stay and try again.')
}

function normalizeOffer(input: any): Offer {
  return {
    id: String(input.id),
    title: input.title ?? '',
    shortTitle: input.shortTitle ?? input.title ?? '',
    currency: input.currency ?? 'GBP',
    price: input.price ?? 0,
    oldPrice: input.oldPrice ?? 0,
    imageUrl: input.image?.url ?? '',
    location: input.offerCard?.mainLocation ?? '',
    hasFlights: Boolean(input.hasFlights),
    hasCars: Boolean(input.hasCars),
    hasAccommodationUnits: Boolean(input.hasAccommodationUnits),
    isLeisureOnly: Boolean(input.isLeisureOnly),
    occupancyRules: {
      minAdults: input.occupancyRules?.minAdults ?? 1,
      maxAdults: input.occupancyRules?.maxAdults ?? 6,
      minChildren: input.occupancyRules?.minChildren ?? 0,
      maxChildren: input.occupancyRules?.maxChildren ?? 4,
      minChildAge: input.occupancyRules?.minChildAge ?? 2,
      maxChildAge: input.occupancyRules?.maxChildAge ?? 17,
    },
    informationList: (input.informationList ?? []).map((item: any) => ({
      id: String(item.id),
      type: item.type ?? '',
      label: item.label ?? '',
      value: item.value ?? '',
    })),
    terms: {
      check: input.termsAndConditions?.check,
      text: input.termsAndConditions?.text,
      markdown: input.termsAndConditions?.markdown,
      termsLinks: input.termsAndConditions?.termsLinks ?? [],
      pages: input.termsAndConditions?.pages ?? [],
    },
  }
}

function normalizeCalendar(input: any): CalendarData {
  return {
    dates: (input?.dates ?? []).map((item: any) => ({
      date: item.date,
      price: item.price ?? 0,
      quantity: item.quantity ?? null,
      nights: (item.nights ?? []).map((night: any) => ({ nights: night.nights, price: night.price ?? 0 })),
    })),
    nights: (input?.nights ?? []).map((item: any) => ({ nights: item.nights ?? null, price: item.price ?? 0 })),
    airports: (input?.departureAirports ?? []).map((item: any) => ({
      code: item.airport?.iataCode ?? '',
      name: item.airport?.name ?? '',
      city: item.airport?.cityName ?? '',
      price: item.price ?? 0,
    })).filter((item: { code: string }) => item.code),
    packageGroups: (input?.packageGroups ?? []).map((item: any) => ({
      id: item.id ?? '',
      name: item.name ?? 'All packages',
      description: item.description ?? '',
      price: item.price ?? 0,
      oldPrice: item.oldPrice ?? undefined,
      imageUrl: item.images?.[0]?.url,
    })),
    months: (input?.months ?? []).map((item: any) => item.month).filter(Boolean),
  }
}

function normalizeReceipt(input: any): Receipt {
  return {
    title: input?.title ?? 'Booking summary',
    totalPrice: input?.totalPrice ?? 0,
    oldPrice: input?.oldPrice ?? 0,
    discount: input?.discount ?? 0,
    perPersonPrice: input?.perPersonPrice ?? 0,
    startDate: input?.startDate ?? null,
    endDate: input?.endDate ?? null,
    nights: input?.nights ?? null,
    lines: (input?.lines ?? []).map((line: any) => ({
      label: line.label ?? '',
      amount: line.amount ?? undefined,
      text: line.text ?? undefined,
      perPerson: line.perPerson ?? undefined,
    })),
    included: input?.included ?? [],
    excluded: input?.excluded ?? [],
    instalmentPayments: Array.isArray(input?.instalmentsPayments?.[0])
      ? input.instalmentsPayments
      : [input?.instalmentsPayments ?? []],
    errors: input?.errors ?? [],
    itinerary: (input?.itinerary?.events ?? []).map((event: any) => ({
      label: event.label ?? '',
      sublabel: event.sublabel ?? '',
      date: event.date ?? '',
      components: (event.components ?? []).map((component: any) => {
        const typeName = String(component.__typename ?? '').toLowerCase()
        const type = typeName.includes('flight')
          ? 'flight'
          : typeName.includes('car')
            ? 'car'
            : typeName.includes('accommodation')
              ? 'accommodation'
              : typeName.includes('leisure')
                ? 'activity'
                : 'other'
        return {
          type,
          label: component.label ?? component.accommodation?.name ?? component.car?.model ?? '',
          sublabel: component.sublabel ?? '',
          accommodationName: component.accommodation?.name,
          unitName: component.unit?.name,
          boardName: component.board?.name,
          flightSegments: (component.leg?.segments ?? []).map((segment: any) => ({
            from: segment.departure?.airport?.iataCode ?? '',
            to: segment.arrival?.airport?.iataCode ?? '',
            departureAt: segment.departure?.datetime,
            arrivalAt: segment.arrival?.datetime,
            airline: segment.airline?.name,
            flightNumber: segment.flightnumber,
            luggage: segment.luggageAllowance,
          })),
          carModel: component.car?.model,
          carImageUrl: component.car?.image?.url,
          pickup: component.pickupLocation?.name ?? component.pickupLocation?.venue?.formattedAddress,
          dropoff: component.dropoffLocation?.name ?? component.dropoffLocation?.venue?.formattedAddress,
        }
      }),
    })),
  }
}

function normalizeAccommodations(items: any[]): Accommodation[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name ?? 'Hotel',
    subtitle: item.subTitle ?? '',
    description: item.description ?? '',
    address: item.venue?.formattedAddress ?? '',
    imageUrl: item.image?.url ?? '',
    gallery: [item.image?.url, ...(item.imagePreviews ?? []).map((image: any) => image.url)].filter(Boolean),
    price: item.price ?? 0,
    stars: item.starRating ?? undefined,
    selected: Boolean(item.selected),
    facilities: item.facilities ?? [],
    units: (item.units ?? []).map((unit: any) => ({
      id: unit.id,
      name: unit.name ?? 'Room',
      subtitle: unit.subTitle ?? '',
      description: unit.description ?? '',
      price: unit.price ?? 0,
      selected: Boolean(unit.selected),
      imageUrl: unit.image?.url ?? '',
      gallery: [unit.image?.url, ...(unit.images ?? []).map((image: any) => image.url)].filter(Boolean),
      facilities: unit.facilities ?? [],
      boards: (unit.boards ?? []).map((board: any) => ({
        id: board.id,
        name: board.name ?? 'Board',
        description: board.description ?? '',
        price: board.price ?? 0,
        selected: Boolean(board.selected),
      })),
    })),
  }))
}

function normalizeActivities(items: any[]): Activity[] {
  return items.flatMap((activity) =>
    (activity.units ?? []).map((unit: any) => ({
      id: unit.productId,
      parentId: activity.productId,
      name: unit.name ?? 'Activity',
      description: unit.description ?? '',
      price: unit.price ?? activity.price ?? 0,
      selected: Boolean(unit.selected),
      optional: Boolean(activity.optional),
      date: activity.date ?? null,
      duration: unit.duration ?? null,
      groupType: unit.groupType ?? null,
      imageUrl: unit.image?.url,
      gallery: (unit.images ?? []).map((image: any) => image.url).filter(Boolean),
    })),
  )
}

function normalizeFlights(items: any[]): Flight[] {
  return items.map((item) => ({
    id: item.id,
    price: item.price ?? 0,
    selected: Boolean(item.selected),
    badges: (item.badges ?? []).map((badge: any) => badge.badgeText).filter(Boolean),
    legs: (item.legs ?? []).map((leg: any) => ({
      label: leg.label ?? '',
      segments: (leg.segments ?? []).map((segment: any) => ({
        airline: segment.airline?.name,
        airlineCode: segment.airline?.iataCode,
        logo: segment.airline?.logoUrl,
        flightNumber: segment.flightnumber,
        from: segment.departure?.airport?.iataCode ?? '',
        fromCity: segment.departure?.airport?.cityName ?? '',
        to: segment.arrival?.airport?.iataCode ?? '',
        toCity: segment.arrival?.airport?.cityName ?? '',
        departureAt: segment.departure?.datetime,
        arrivalAt: segment.arrival?.datetime,
        luggage: segment.luggageAllowance,
        cabin: segment.cabinClass,
      })),
    })),
  }))
}

function normalizeCars(items: any[]): Car[] {
  return items.map((item) => ({
    id: item.id,
    name: item.vehicle?.modelName ?? 'Car hire',
    category: item.vehicle?.category ?? '',
    transmission: item.vehicle?.transmission ?? '',
    seats: item.vehicle?.minSeats ?? null,
    doors: item.vehicle?.doors ?? null,
    airConditioning: Boolean(item.vehicle?.airConditioning),
    price: item.price ?? 0,
    selected: Boolean(item.selected),
    imageUrl: item.vehicle?.photo?.url,
    pickup: item.pickupLocation?.name ?? item.pickupLocation?.airport?.name,
    dropoff: item.dropoffLocation?.name ?? item.dropoffLocation?.airport?.name,
    insurance: item.insurance,
    termsUrl: item.productTermsUrl,
  }))
}

function normalizeCarExtras(items: any[]): CarExtra[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name ?? 'Extra',
    extraType: item.extraType,
    price: item.price?.amount ?? 0,
    prePayable: Boolean(item.prePayable),
    keyFactsUrl: item.keyFactsUrl,
    policyDocUrl: item.policyDocUrl,
  }))
}
