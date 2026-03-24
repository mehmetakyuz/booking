import { gql } from '@/lib/graphql/client'
import {
  GET_OFFER_CALENDAR,
  GET_DYNAMIC_PACKAGE_RECEIPT,
  GET_DYNAMIC_PACKAGE_ACCOMMODATIONS,
  GET_DYNAMIC_PACKAGE_LEISURES,
  GET_DYNAMIC_PACKAGE_FLIGHTS,
  GET_DYNAMIC_PACKAGE_CARS,
  GET_CAR_EXTRAS,
  GET_DYNAMIC_PACKAGE_INFO_FOR_CUSTOMER_FORM,
  GET_COUNTRIES,
  START_TASK_GROUP,
  POLL_TASK_GROUP,
  CREATE_ORDER,
} from '@/lib/graphql/queries'
import {
  normalizeCalendar,
  normalizeReceipt,
  normalizeAccommodations,
  normalizeActivities,
  normalizeFlights,
  normalizeCars,
  normalizeCarExtras,
  normalizeCountries,
  normalizeCheckout,
} from './normalize'
import {
  toCalendarVars,
  toReceiptVars,
  toDynamicPackageVars,
  toTaskDynamicPackage,
} from './variables'
import { buildSteps } from './steps'
import type {
  BookingState,
  BookingPayload,
  StepId,
  ReceiptData,
  CarExtra,
  CheckoutData,
  ProductInput,
  OptionInput,
  BootstrapData,
} from './types'

/* ── FlowAPI: the bridge between flow logic and React state ── */

export interface FlowAPI {
  getState: () => BookingState
  patchState: (patch: Partial<BookingState>) => void
  setStepIndex: (index: number) => void
  completeStep: (stepId: StepId) => void
  setReceipt: (receipt: ReceiptData | null) => void
  setReceiptLoading: (value: boolean) => void
  setCarExtras: (carId: string, extras: CarExtra[]) => void
  setCheckout: (checkout: CheckoutData | null) => void
}

/* ── Internal helpers ── */

function headers(payload: BookingPayload): Record<string, string> {
  return { 'x-tb-sessionid': payload.sessionId }
}

/* ── createFlow ── */

export function createFlow(api: FlowAPI) {
  const { getState, patchState, setStepIndex, completeStep, setReceipt, setReceiptLoading, setCarExtras, setCheckout } = api

  /* ── Helper: getCalendar ── */
  async function getCalendar(payload: BookingPayload) {
    const data = await gql(GET_OFFER_CALENDAR, toCalendarVars(payload), headers(payload))
    return normalizeCalendar(data.offer.calendar)
  }

  /* ── Helper: getReceipt ── */
  async function getReceipt(payload: BookingPayload) {
    const data = await gql(GET_DYNAMIC_PACKAGE_RECEIPT, toReceiptVars(payload), headers(payload))
    return normalizeReceipt(data.dynamicPackageReceipt)
  }

  /* ── Helper: pollTaskGroupUntilDone ── */
  async function pollTaskGroupUntilDone(
    taskGroupId: string,
    interval = 1500,
    timeout = 30000,
  ) {
    const start = Date.now()
    const { payload } = getState()

    while (true) {
      const data = await gql(POLL_TASK_GROUP, { taskGroupId }, headers(payload))
      const status = data.pollTaskGroup.status

      if (status === 'FINISHED') return
      if (status === 'FAILED') throw new Error('Task group failed')
      if (Date.now() - start > timeout) throw new Error('Task group polling timed out')

      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  /* ── Helper: startAndPollTask ── */
  async function startAndPollTask(taskType: string, payload: BookingPayload) {
    const data = await gql(
      START_TASK_GROUP,
      { tasks: [{ type: taskType, dynamicPackage: toTaskDynamicPackage(payload) }] },
      headers(payload),
    )
    await pollTaskGroupUntilDone(data.startTaskGroup.taskGroupId)
  }

  /* ── Helper: stripProductsByPrefix ── */
  function stripProductsByPrefix(products: ProductInput[], prefix: string): ProductInput[] {
    return products.filter((p) => !p.id.startsWith(prefix))
  }

  /* ── Helper: replaceProduct ── */
  function replaceProduct(
    products: ProductInput[],
    prefix: string,
    newProduct: ProductInput,
  ): ProductInput[] {
    return [...stripProductsByPrefix(products, prefix), newProduct]
  }

  /* ── Helper: syncUrlState ── */
  function syncUrlState(payload: BookingPayload, currentStepIndex: number) {
    if (typeof window === 'undefined') return
    const obj = {
      s: payload.sessionId,
      step: currentStepIndex,
      date: payload.selectedDate,
      nights: payload.nights,
      airports: payload.departureAirports,
      pkg: payload.packageGroup,
      products: payload.products,
      coupons: payload.coupons,
      people: payload.people.length,
    }
    const encoded = btoa(JSON.stringify(obj))
    window.history.replaceState(null, '', `?state=${encoded}`)
  }

  /* ── Helper: reprice receipt ── */
  async function repriceReceipt(payload: BookingPayload) {
    setReceiptLoading(true)
    try {
      const receipt = await getReceipt(payload)
      setReceipt(receipt)
      return receipt
    } finally {
      setReceiptLoading(false)
    }
  }

  /* ── Actions ── */

  function goBack() {
    const { currentStepIndex } = getState()
    if (currentStepIndex > 0) {
      setStepIndex(currentStepIndex - 1)
    }
  }

  function goToStep(index: number) {
    const { steps, completedStepIds, currentStepIndex } = getState()
    const step = steps[index]
    if (!step) return
    if (index <= currentStepIndex || completedStepIds.includes(step.id)) {
      setStepIndex(index)
    }
  }

  function toggleMobileReceipt(value: boolean) {
    patchState({ mobileReceiptOpen: value })
  }

  async function updateTravellers(adults: number, childrenAges: number[]) {
    const state = getState()
    const totalPeople = adults + childrenAges.length
    const people = Array.from({ length: totalPeople }, () => ({}))
    const groups = [{ people: Array.from({ length: totalPeople }, (_, i) => i) }]

    const payload: BookingPayload = {
      ...state.payload,
      people,
      groups,
      products: [],
    }

    const travellers = { adults, childrenAges }
    const calendar = await getCalendar(payload)

    let receipt: ReceiptData | null = null
    if (payload.selectedDate) {
      receipt = await repriceReceipt(payload)
    }

    const steps = buildSteps(state.offerMeta)

    patchState({
      travellers,
      calendar,
      steps,
      payload,
      ...(receipt ? { receipt } : {}),
    })
  }

  async function updateCalendarFilters(filters: {
    airport?: string
    packageGroup?: string
    nights?: number | null
  }) {
    const state = getState()
    const payload: BookingPayload = { ...state.payload }

    if (filters.airport !== undefined) {
      payload.departureAirports = filters.airport ? [filters.airport] : undefined
    }
    if (filters.packageGroup !== undefined) {
      payload.packageGroup = filters.packageGroup || undefined
    }
    if (filters.nights !== undefined) {
      payload.nights = filters.nights
    }

    const calendar = await getCalendar(payload)
    patchState({ calendar, payload })
  }

  async function selectDate(params: {
    selectedDate: string
    nights: number
    airport?: string
    packageGroup?: string
  }) {
    const state = getState()
    const payload: BookingPayload = {
      ...state.payload,
      selectedDate: params.selectedDate,
      nights: params.nights,
      products: [],
    }

    if (params.airport !== undefined) {
      payload.departureAirports = params.airport ? [params.airport] : undefined
    }
    if (params.packageGroup !== undefined) {
      payload.packageGroup = params.packageGroup || undefined
    }

    patchState({ payload })
    await repriceReceipt(payload)
  }

  async function confirmDates(params: {
    selectedDate: string
    nights: number
    airport?: string
    packageGroup?: string
  }) {
    const state = getState()
    const previousPayload = state.payload

    const payload: BookingPayload = {
      ...state.payload,
      selectedDate: params.selectedDate,
      nights: params.nights,
      products: [],
    }

    if (params.airport !== undefined) {
      payload.departureAirports = params.airport ? [params.airport] : undefined
    }
    if (params.packageGroup !== undefined) {
      payload.packageGroup = params.packageGroup || undefined
    }

    const receipt = await repriceReceipt(payload)

    if (receipt.errors && receipt.errors.length > 0) {
      // Rollback
      patchState({ payload: previousPayload })
      setReceipt(state.receipt)
      throw new Error(receipt.errors.map((e) => e.message).join(', '))
    }

    completeStep('dates')
    const nextIndex = state.currentStepIndex + 1
    setStepIndex(nextIndex)
    patchState({ payload })
    syncUrlState(payload, nextIndex)
  }

  async function loadAccommodations() {
    const state = getState()
    const payload: BookingPayload = {
      ...state.payload,
      products: stripProductsByPrefix(
        stripProductsByPrefix(state.payload.products, 'A:'),
        'S:',
      ),
    }

    patchState({ accommodationsLoading: true, payload })

    const data = await gql(
      GET_DYNAMIC_PACKAGE_ACCOMMODATIONS,
      toDynamicPackageVars(payload),
      headers(payload),
    )
    const accommodations = normalizeAccommodations(
      data.dynamicPackage.accomodations ?? data.dynamicPackage.accommodations ?? [],
    )

    patchState({ accommodations, accommodationsLoading: false })
  }

  async function confirmAccommodation(params: {
    hotelId: string
    unitId: string
    boardId: string
    options: OptionInput[]
  }) {
    const state = getState()
    const products = [...state.payload.products]

    // Build unit product with options (IDs already include prefix from API)
    const unitProduct: ProductInput = {
      id: params.unitId,
      options: params.options,
    }

    // Replace A: products
    let updatedProducts = replaceProduct(
      stripProductsByPrefix(products, 'A:'),
      'A:',
      unitProduct,
    )

    // Add board if different from unit
    if (params.boardId !== params.unitId) {
      updatedProducts.push({ id: params.boardId })
    }

    const payload: BookingPayload = {
      ...state.payload,
      products: updatedProducts,
    }

    await repriceReceipt(payload)

    completeStep('rooms')
    const nextIndex = state.currentStepIndex + 1
    setStepIndex(nextIndex)
    patchState({ payload })
    syncUrlState(payload, nextIndex)
  }

  async function loadActivities() {
    const state = getState()
    const payload: BookingPayload = {
      ...state.payload,
      products: stripProductsByPrefix(state.payload.products, 'L:'),
    }

    patchState({ activitiesLoading: true, payload })

    const data = await gql(
      GET_DYNAMIC_PACKAGE_LEISURES,
      toDynamicPackageVars(payload),
      headers(payload),
    )
    const activities = normalizeActivities(data.dynamicPackage.leisures ?? [])
    const activitiesBasePrice = data.dynamicPackage.price ?? 0

    patchState({ activities, activitiesBasePrice, activitiesLoading: false })
  }

  async function updateActivitySelection(activityId: string, selected: boolean) {
    const state = getState()
    let products: ProductInput[]

    if (selected) {
      // IDs already include prefix from API
      products = replaceProduct(state.payload.products, activityId, {
        id: activityId,
      })
    } else {
      products = stripProductsByPrefix(state.payload.products, activityId)
    }

    const payload: BookingPayload = { ...state.payload, products }
    patchState({ payload })
    await repriceReceipt(payload)
  }

  async function confirmActivities() {
    const state = getState()
    completeStep('activities')
    const nextIndex = state.currentStepIndex + 1
    setStepIndex(nextIndex)
    syncUrlState(state.payload, nextIndex)
  }

  async function loadFlights() {
    const state = getState()
    const payload = state.payload

    try {
      patchState({ flightSearch: { status: 'searching' } })
      await startAndPollTask('FLIGHT_SEARCH', payload)

      patchState({ flightSearch: { status: 'validating' } })
      await startAndPollTask('FLIGHT_PRICE_VALIDATION', payload)

      const data = await gql(
        GET_DYNAMIC_PACKAGE_FLIGHTS,
        toDynamicPackageVars(payload),
        headers(payload),
      )
      const flights = normalizeFlights(data.dynamicPackage.flights ?? [])

      // Find default flight
      const defaultFlight = flights.find((f) => f.selected) ?? flights[0]

      let updatedProducts = payload.products
      if (defaultFlight) {
        updatedProducts = replaceProduct(payload.products, 'F:', {
          id: defaultFlight.id,
        })
      }

      const updatedPayload: BookingPayload = { ...payload, products: updatedProducts }
      patchState({ flights, payload: updatedPayload })
      await repriceReceipt(updatedPayload)
      patchState({ flightSearch: { status: 'success' } })
    } catch (error) {
      patchState({
        flightSearch: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Flight search failed',
        },
      })
    }
  }

  async function confirmFlight(params: { flightId: string; options: OptionInput[] }) {
    const state = getState()
    const products = replaceProduct(state.payload.products, 'F:', {
      id: params.flightId,
      options: params.options,
    })

    const payload: BookingPayload = { ...state.payload, products }
    patchState({ payload })
    await repriceReceipt(payload)

    completeStep('flights')
    const nextIndex = state.currentStepIndex + 1
    setStepIndex(nextIndex)
    syncUrlState(payload, nextIndex)
  }

  async function loadCars() {
    const state = getState()
    const payload = state.payload

    try {
      patchState({ carSearch: { status: 'searching' } })
      await startAndPollTask('CAR_SEARCH', payload)

      const data = await gql(
        GET_DYNAMIC_PACKAGE_CARS,
        toDynamicPackageVars(payload),
        headers(payload),
      )
      const cars = normalizeCars(data.dynamicPackage.cars ?? [])

      // Find default car
      const defaultCar = cars.find((c) => c.selected) ?? cars[0]

      let updatedProducts = payload.products
      if (defaultCar) {
        updatedProducts = replaceProduct(payload.products, 'C:', {
          id: defaultCar.id,
        })
      }

      const updatedPayload: BookingPayload = { ...payload, products: updatedProducts }
      patchState({ cars, payload: updatedPayload })
      await repriceReceipt(updatedPayload)
      patchState({ carSearch: { status: 'success' } })
    } catch (error) {
      patchState({
        carSearch: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Car search failed',
        },
      })
    }
  }

  async function loadCarExtras(carId: string) {
    const state = getState()
    const payload = state.payload

    patchState({ carExtrasLoadingForId: carId })

    await startAndPollTask('CAR_EXTRAS', payload)

    const data = await gql(
      GET_CAR_EXTRAS,
      { carProductSetId: carId },
      headers(payload),
    )
    const extras = normalizeCarExtras(data.carExtra.extras ?? [])
    setCarExtras(carId, extras)
  }

  async function confirmCar(params: { carId: string; extraIds: string[] }) {
    const state = getState()

    // Build car product with extras as options
    const options: OptionInput[] = params.extraIds.map((id) => ({ id, value: 'true' }))
    const carProduct: ProductInput = {
      id: params.carId,
      options,
    }

    // Strip old C: and CE: products, add new car product
    let products = stripProductsByPrefix(state.payload.products, 'C:')
    products = stripProductsByPrefix(products, 'CE:')
    products.push(carProduct)

    const payload: BookingPayload = { ...state.payload, products }
    patchState({ payload })
    await repriceReceipt(payload)

    completeStep('cars')
    const nextIndex = state.currentStepIndex + 1
    setStepIndex(nextIndex)
    syncUrlState(payload, nextIndex)
  }

  async function loadCheckout() {
    const state = getState()
    const payload = state.payload

    const [dpData, countriesData, receipt] = await Promise.all([
      gql(
        GET_DYNAMIC_PACKAGE_INFO_FOR_CUSTOMER_FORM,
        toDynamicPackageVars(payload),
        headers(payload),
      ),
      gql(GET_COUNTRIES, {}, headers(payload)),
      getReceipt(payload),
    ])

    const countries = normalizeCountries(countriesData.countries ?? [])
    const checkout = normalizeCheckout(dpData.dynamicPackage, countries)

    setCheckout(checkout)
    setReceipt(receipt)
  }

  function updateCheckoutField(
    section: 'leadPassenger' | 'participants',
    key: string,
    value: string,
    index?: number,
  ) {
    const state = getState()
    const form = { ...state.checkoutForm }

    if (section === 'leadPassenger') {
      form.leadPassenger = { ...form.leadPassenger, [key]: value }
    } else if (section === 'participants' && index !== undefined) {
      const participants = [...form.participants]
      participants[index] = { ...participants[index], [key]: value }
      form.participants = participants
    }

    patchState({ checkoutForm: form })
  }

  function updateCheckoutMeta(patch: Partial<{
    acceptedTerms: boolean
    paymentMethodId: string
    specialRequests: string
    phoneCountryCode: string
  }>) {
    const state = getState()
    patchState({
      checkoutForm: { ...state.checkoutForm, ...patch },
    })
  }

  async function applyCoupon(source: string) {
    const state = getState()
    const coupons = [...state.payload.coupons, source]
    const payload: BookingPayload = { ...state.payload, coupons }
    patchState({ payload })
    await repriceReceipt(payload)
  }

  async function updateInstalments(numOfInstalments: number) {
    const state = getState()
    const payload: BookingPayload = { ...state.payload, numOfInstalments }
    patchState({ payload })
    await repriceReceipt(payload)
  }

  async function submitOrder() {
    const state = getState()
    const payload = state.payload
    const receipt = state.receipt

    const data = await gql(
      CREATE_ORDER,
      {
        offerId: payload.offerId,
        people: payload.people,
        groups: payload.groups,
        totalPrice: receipt?.totalPrice,
        date: payload.selectedDate,
        paymentMethod: state.checkoutForm.paymentMethodId
          ? parseInt(state.checkoutForm.paymentMethodId, 10)
          : undefined,
        nights: payload.nights,
        products: payload.products,
        coupons: payload.coupons,
        numOfInstalments: payload.numOfInstalments,
        departureAirports: payload.departureAirports,
        tourUnit: payload.tourUnit,
        packageGroup: payload.packageGroup,
        deferred: payload.deferred,
        priceSeen: payload.priceSeen,
        properties: [
          ...(payload.properties ?? []),
          { key: 'restore_url', value: typeof window !== 'undefined' ? window.location.href : '' },
        ],
      },
      headers(payload),
    )

    const result = data.createOrder.result
    if (result.errors?.length) {
      throw new Error(result.errors.map((e: any) => e.message).join(', '))
    }

    const continueUrl = result.paymentResult?.continueUrl
    if (continueUrl && typeof window !== 'undefined') {
      window.location.href = continueUrl
    }
  }

  return {
    goBack,
    goToStep,
    toggleMobileReceipt,
    updateTravellers,
    updateCalendarFilters,
    selectDate,
    confirmDates,
    loadAccommodations,
    confirmAccommodation,
    loadActivities,
    updateActivitySelection,
    confirmActivities,
    loadFlights,
    confirmFlight,
    loadCars,
    loadCarExtras,
    confirmCar,
    loadCheckout,
    updateCheckoutField,
    updateCheckoutMeta,
    applyCoupon,
    updateInstalments,
    submitOrder,
  }
}

/* ── createInitialState ── */

export function createInitialState(bootstrap: BootstrapData): BookingState {
  const { sessionId, offer, offerMeta, calendar, initialCalendarSelection } = bootstrap
  const steps = buildSteps(offerMeta)

  const payload: BookingPayload = {
    offerId: offer.id,
    sessionId,
    people: [{}, {}],
    groups: [{ people: [0, 1] }],
    departureAirports: initialCalendarSelection.departureAirports,
    packageGroup: initialCalendarSelection.packageGroup,
    products: [],
    coupons: [],
    numOfInstalments: 1,
    deferred: false,
  }

  return {
    offer,
    offerMeta,
    travellers: { adults: 2, childrenAges: [] },
    calendar,
    accommodations: [],
    activities: [],
    activitiesBasePrice: 0,
    flights: [],
    cars: [],
    carExtrasByCarId: {},
    checkout: null,
    payload,
    receipt: null,
    receiptLoading: false,
    accommodationsLoading: false,
    activitiesLoading: false,
    steps,
    currentStepIndex: 0,
    completedStepIds: [],
    mobileReceiptOpen: false,
    flightSearch: { status: 'idle' },
    carSearch: { status: 'idle' },
    checkoutForm: {
      leadPassenger: {},
      participants: [],
      phoneCountryCode: '',
      couponCodes: {},
      paymentMethodId: '',
      acceptedTerms: false,
      specialRequests: '',
    },
  }
}
