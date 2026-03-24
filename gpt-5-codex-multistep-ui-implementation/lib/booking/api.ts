import { gql } from '@/lib/graphql/client'
import {
  CREATE_ORDER,
  GET_CAR_EXTRAS,
  GET_COUNTRIES,
  GET_DYNAMIC_PACKAGE_ACCOMMODATIONS,
  GET_DYNAMIC_PACKAGE_CARS,
  GET_DYNAMIC_PACKAGE_CHECKOUT,
  GET_DYNAMIC_PACKAGE_FLIGHTS,
  GET_DYNAMIC_PACKAGE_INFO_FOR_CUSTOMER_FORM,
  GET_DYNAMIC_PACKAGE_LEISURES,
  GET_DYNAMIC_PACKAGE_RECEIPT,
  GET_OFFER,
  GET_OFFER_CALENDAR,
  POLL_TASK_GROUP,
  START_TASK_GROUP,
} from '@/lib/graphql/queries'
import {
  normalizeAccommodations,
  normalizeActivities,
  normalizeCalendar,
  normalizeCarExtras,
  normalizeCars,
  normalizeCheckout,
  normalizeCountries,
  normalizeFlights,
  normalizeOffer,
  normalizeReceipt,
} from '@/lib/booking/normalize'
import { toCalendarVars, toDynamicPackageVars, toReceiptVars, toTaskDynamicPackage } from '@/lib/booking/variables'
import { BookingPayload, BootstrapData, CalendarData, CarExtra, CheckoutData, CheckoutFormState, ReceiptData } from '@/lib/booking/types'

const CLIENT_ENDPOINT = '/api/graphql'

function withoutProductPrefixes(payload: BookingPayload, prefixes: string[]): BookingPayload {
  return {
    ...payload,
    products: (payload.products ?? []).filter((product) => !prefixes.some((prefix) => product.id.startsWith(prefix))),
  }
}

function buildSessionHeaders(sessionId?: string) {
  return sessionId ? { 'x-tb-sessionid': sessionId } : undefined
}

function buildDefaultPayload(offerId: string, sessionId: string, minAdults = 2): BookingPayload {
  const people = Array.from({ length: minAdults }, () => ({}))

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

function getCheapestByPrice<T>(items: T[], getPrice: (item: T) => number) {
  return items.reduce<T | undefined>((best, item) => {
    if (!best) return item
    return getPrice(item) < getPrice(best) ? item : best
  }, undefined)
}

export async function loadBootstrapDataServer(offerId: string, serverEndpoint: string, sessionId: string): Promise<BootstrapData> {
  const bootPayload = buildDefaultPayload(offerId, sessionId)
  const [offerData, initialCalendarData] = await Promise.all([
    gql<any>(GET_OFFER, { offerId }, { endpoint: serverEndpoint, headers: buildSessionHeaders(sessionId) }),
    gql<any>(GET_OFFER_CALENDAR, toCalendarVars(bootPayload), { endpoint: serverEndpoint, headers: buildSessionHeaders(sessionId) }),
  ])

  const normalizedOffer = normalizeOffer(offerData.offer)
  const initialCalendar = normalizeCalendar(initialCalendarData.offer.calendar)
  const cheapestAirport = getCheapestByPrice(initialCalendar.departureAirports, (item) => item.price)
  const cheapestPackageGroup = getCheapestByPrice(initialCalendar.packageGroups, (item) => item.price)
  const selectedBootstrapPayload: BookingPayload = {
    ...bootPayload,
    departureAirports: cheapestAirport?.iataCode ? [cheapestAirport.iataCode] : undefined,
    packageGroup: cheapestPackageGroup?.id ?? undefined,
  }
  const calendarData = await gql<any>(GET_OFFER_CALENDAR, toCalendarVars(selectedBootstrapPayload), {
    endpoint: serverEndpoint,
    headers: buildSessionHeaders(sessionId),
  })

  return {
    sessionId,
    offer: normalizedOffer.offer,
    offerMeta: normalizedOffer.offerMeta,
    calendar: normalizeCalendar(calendarData.offer.calendar),
    initialCalendarSelection: {
      departureAirports: selectedBootstrapPayload.departureAirports,
      packageGroup: selectedBootstrapPayload.packageGroup,
    },
    accommodations: [],
    activities: [],
    flights: [],
    cars: [],
    checkout: null,
    initialReceipt: null,
  }
}

async function pollUntilFinished(taskGroupId: string, sessionId?: string, timeoutMs = 30000) {
  const interval = 1500
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const data = await gql<any>(POLL_TASK_GROUP, { taskGroupId }, {
      endpoint: CLIENT_ENDPOINT,
      headers: buildSessionHeaders(sessionId),
    })
    const status = data.pollTaskGroup.status
    if (status === 'FINISHED') return
    if (status === 'FAILED') throw new Error(`Task group ${taskGroupId} failed.`)
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  throw new Error(`Task group ${taskGroupId} timed out.`)
}

export async function getCalendar(payload: BookingPayload): Promise<CalendarData> {
  const data = await gql<any>(GET_OFFER_CALENDAR, toCalendarVars(payload), {
    endpoint: CLIENT_ENDPOINT,
    headers: buildSessionHeaders(payload.sessionId),
  })
  return normalizeCalendar(data.offer.calendar)
}

export async function getReceipt(payload: BookingPayload): Promise<ReceiptData> {
  const data = await gql<any>(GET_DYNAMIC_PACKAGE_RECEIPT, toReceiptVars(payload), {
    endpoint: CLIENT_ENDPOINT,
    headers: buildSessionHeaders(payload.sessionId),
  })
  return normalizeReceipt(data.dynamicPackageReceipt)
}

export async function getAccommodations(payload: BookingPayload) {
  const optionsPayload = withoutProductPrefixes(payload, ['A:'])
  const data = await gql<any>(GET_DYNAMIC_PACKAGE_ACCOMMODATIONS, toDynamicPackageVars(optionsPayload), {
    endpoint: CLIENT_ENDPOINT,
    headers: buildSessionHeaders(payload.sessionId),
  })
  return normalizeAccommodations(data.dynamicPackage.accomodations)
}

export async function getActivities(payload: BookingPayload) {
  const optionsPayload = withoutProductPrefixes(payload, ['L:'])
  const data = await gql<any>(GET_DYNAMIC_PACKAGE_LEISURES, toDynamicPackageVars(optionsPayload), {
    endpoint: CLIENT_ENDPOINT,
    headers: buildSessionHeaders(payload.sessionId),
  })
  return {
    activities: normalizeActivities(data.dynamicPackage.leisures),
    basePrice: data.dynamicPackage.price ?? 0,
  }
}

export async function getFlights(
  payload: BookingPayload,
  onStage?: (stage: 'searching' | 'validating') => void,
) {
  onStage?.('searching')
  const startSearch = await gql<any>(
    START_TASK_GROUP,
    {
      tasks: [{ key: 'FLIGHT_SEARCH', dynamicPackage: toTaskDynamicPackage(payload) }],
    },
    { endpoint: CLIENT_ENDPOINT, headers: buildSessionHeaders(payload.sessionId) },
  )
  await pollUntilFinished(startSearch.startTaskGroup.taskGroupId, payload.sessionId)

  onStage?.('validating')
  const validate = await gql<any>(
    START_TASK_GROUP,
    {
      tasks: [{ key: 'FLIGHT_PRICE_VALIDATION', dynamicPackage: toTaskDynamicPackage(payload) }],
    },
    { endpoint: CLIENT_ENDPOINT, headers: buildSessionHeaders(payload.sessionId) },
  )
  await pollUntilFinished(validate.startTaskGroup.taskGroupId, payload.sessionId)

  const data = await gql<any>(
    GET_DYNAMIC_PACKAGE_FLIGHTS,
    { ...toDynamicPackageVars(payload), departureAirports: payload.departureAirports },
    { endpoint: CLIENT_ENDPOINT, headers: buildSessionHeaders(payload.sessionId) },
  )

  return normalizeFlights(data.dynamicPackage.flights)
}

export async function getCars(payload: BookingPayload) {
  const search = await gql<any>(
    START_TASK_GROUP,
    {
      tasks: [{ key: 'CAR_SEARCH', dynamicPackage: toTaskDynamicPackage(payload) }],
    },
    { endpoint: CLIENT_ENDPOINT, headers: buildSessionHeaders(payload.sessionId) },
  )
  await pollUntilFinished(search.startTaskGroup.taskGroupId, payload.sessionId)

  const data = await gql<any>(
    GET_DYNAMIC_PACKAGE_CARS,
    { ...toDynamicPackageVars(payload), departureAirports: payload.departureAirports },
    { endpoint: CLIENT_ENDPOINT, headers: buildSessionHeaders(payload.sessionId) },
  )

  return normalizeCars(data.dynamicPackage.cars)
}

export async function getCarExtras(payload: BookingPayload, carId: string): Promise<CarExtra[]> {
  try {
    const extrasTask = await gql<any>(
      START_TASK_GROUP,
      {
        tasks: [
          {
            key: 'CAR_EXTRAS',
            dynamicPackage: {
              ...toTaskDynamicPackage(payload),
              products: [...(payload.products ?? []).filter((product) => !product.id.startsWith('C:')), { id: carId }],
            },
          },
        ],
      },
      { endpoint: CLIENT_ENDPOINT, headers: buildSessionHeaders(payload.sessionId) },
    )
    await pollUntilFinished(extrasTask.startTaskGroup.taskGroupId, payload.sessionId, 15000)
    const extras = await gql<any>(GET_CAR_EXTRAS, { carProductSetId: carId }, {
      endpoint: CLIENT_ENDPOINT,
      headers: buildSessionHeaders(payload.sessionId),
    })
    return normalizeCarExtras(extras.carExtra?.extras ?? [])
  } catch {
    return []
  }
}

export async function getCheckoutMetadata(payload: BookingPayload): Promise<CheckoutData> {
  const [checkoutInfo, countries, checkoutMeta] = await Promise.all([
    gql<any>(GET_DYNAMIC_PACKAGE_INFO_FOR_CUSTOMER_FORM, toDynamicPackageVars(payload), {
      endpoint: CLIENT_ENDPOINT,
      headers: buildSessionHeaders(payload.sessionId),
    }),
    gql<any>(GET_COUNTRIES, {}, { endpoint: CLIENT_ENDPOINT, headers: buildSessionHeaders(payload.sessionId) }),
    gql<any>(GET_DYNAMIC_PACKAGE_CHECKOUT, toDynamicPackageVars(payload), {
      endpoint: CLIENT_ENDPOINT,
      headers: buildSessionHeaders(payload.sessionId),
    }),
  ])

  return normalizeCheckout(
    checkoutInfo.dynamicPackage,
    normalizeCountries(countries.countries),
    checkoutMeta.dynamicPackage,
  )
}

export async function createOrder(
  payload: BookingPayload,
  receipt: ReceiptData,
  checkoutForm: CheckoutFormState,
  restoreUrl: string,
) {
  const people = payload.people.map((person, index) => {
    const source = index === 0 ? checkoutForm.leadPassenger : checkoutForm.participants[index - 1] ?? {}
    return {
      ...person,
      firstName: source.firstName ?? '',
      lastName: source.lastName ?? '',
      email: source.email ?? person.email ?? '',
      phone: index === 0 ? source.phone ?? '' : source.phone ?? undefined,
      birthDate: source.birthDate ?? undefined,
      gender: source.gender ?? undefined,
    }
  })

  const properties = [
    ...(payload.properties ?? []),
    {
      name: 'restore_url',
      value: restoreUrl,
    },
  ]

  const data = await gql<any>(
    CREATE_ORDER,
    {
      ...toReceiptVars(payload),
      customer: 0,
      people,
      totalPrice: receipt.totalPrice,
      paymentMethod: checkoutForm.paymentMethodId ? Number(checkoutForm.paymentMethodId) : undefined,
      properties,
    },
    {
      endpoint: CLIENT_ENDPOINT,
      headers: buildSessionHeaders(payload.sessionId),
    },
  )

  return data.createOrder?.result
}
