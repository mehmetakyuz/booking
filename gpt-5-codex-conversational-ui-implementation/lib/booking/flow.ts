'use client'

import {
  createOrder as createOrderRequest,
  getAccommodations,
  getActivities,
  getCalendar,
  getCarExtras,
  getCars,
  getCheckoutMetadata,
  getFlights,
  getReceipt,
} from '@/lib/booking/api'
import { buildSteps } from '@/lib/booking/steps'
import { BookingUrlSnapshot } from '@/lib/booking/url-state'
import {
  BookingPayload,
  BookingState,
  BootstrapData,
  CalendarData,
  CarExtra,
  CheckoutFormState,
  Message,
  OptionInput,
  ProductInput,
  ReceiptData,
  SelectableOption,
  StepId,
  TravellersState,
} from '@/lib/booking/types'

function createMessage(content: string): Message {
  return {
    id: `assistant-${Math.random().toString(36).slice(2, 10)}`,
    role: 'assistant',
    type: 'text',
    content,
    createdAt: new Date().toISOString(),
  }
}

function buildDefaultPayload(bootstrap: BootstrapData): BookingPayload {
  const minAdults = Math.max(bootstrap.offerMeta.occupancyRules.minAdults || 0, 2)
  const people = Array.from({ length: minAdults }, () => ({}))

  return {
    offerId: bootstrap.offer.id,
    sessionId: bootstrap.sessionId,
    offerMeta: bootstrap.offerMeta,
    people,
    groups: [{ people: people.map((_, index) => index) }],
    products: [],
    coupons: [],
    numOfInstalments: 1,
    deferred: false,
    properties: [],
  }
}

function buildDefaultTravellers(bootstrap: BootstrapData): TravellersState {
  return {
    adults: Math.max(bootstrap.offerMeta.occupancyRules.minAdults || 0, 2),
    childrenAges: [],
  }
}

function buildCheckoutForm(bootstrap: BootstrapData, payload: BookingPayload): CheckoutFormState {
  return {
    leadPassenger: {
      email: payload.people[0]?.email ?? '',
    },
    participants: payload.people.slice(1).map(() => ({})),
    phoneCountryCode: 'GB',
    couponCodes: {},
    paymentMethodId: '',
    acceptedTerms: false,
    specialRequests: '',
  }
}

function reconcileCalendarPayload(payload: BookingPayload, calendar: CalendarData): BookingPayload {
  const selectedAirport = payload.departureAirports?.[0]
  const nextAirport = selectedAirport && calendar.departureAirports.some((item) => item.iataCode === selectedAirport)
    ? selectedAirport
    : calendar.departureAirports[0]?.iataCode

  const nextPackageGroup =
    payload.packageGroup && calendar.packageGroups.some((group) => group.id === payload.packageGroup)
      ? payload.packageGroup
      : calendar.packageGroups[0]?.id

  const hasMatchingNight = calendar.nights.some((night) => night.nights === payload.nights)
  const nextNights = payload.nights != null && hasMatchingNight ? payload.nights : payload.nights == null ? payload.nights : undefined

  return {
    ...payload,
    departureAirports: nextAirport ? [nextAirport] : undefined,
    packageGroup: normalizeOptionalId(nextPackageGroup),
    nights: nextNights,
  }
}

export function createInitialState(bootstrap: BootstrapData): BookingState {
  const payload = reconcileCalendarPayload({
    ...buildDefaultPayload(bootstrap),
    departureAirports:
      bootstrap.initialCalendarSelection.departureAirports ??
      (bootstrap.calendar.departureAirports[0]?.iataCode ? [bootstrap.calendar.departureAirports[0].iataCode] : undefined),
    packageGroup:
      bootstrap.initialCalendarSelection.packageGroup ??
      bootstrap.calendar.packageGroups[0]?.id,
  }, bootstrap.calendar)
  const travellers = buildDefaultTravellers(bootstrap)

  return {
    offer: bootstrap.offer,
    offerMeta: bootstrap.offerMeta,
    travellers,
    calendar: bootstrap.calendar,
    accommodations: [],
    activities: [],
    activitiesBasePrice: 0,
    flights: [],
    cars: [],
    carExtrasByCarId: {},
    checkout: null,
    payload,
    receipt: bootstrap.initialReceipt,
    receiptLoading: false,
    accommodationsLoading: false,
    activitiesLoading: false,
    steps: buildSteps(bootstrap.offerMeta),
    currentStepIndex: 0,
    completedStepIds: [],
    mobileReceiptOpen: false,
    flightSearch: { status: 'idle' },
    carSearch: { status: 'idle' },
    carExtrasLoadingForId: undefined,
    checkoutForm: buildCheckoutForm(bootstrap, payload),
    messages: [createMessage('Let’s plan your trip. Start by choosing travellers and dates.')],
    assistantBusy: false,
  }
}

function replaceProducts(products: ProductInput[], prefixes: string[], nextProducts: ProductInput[]) {
  const filtered = products.filter((product) => !prefixes.some((prefix) => product.id.startsWith(prefix)))
  return [...filtered, ...nextProducts]
}

function normalizeOptionalId(value?: string | null) {
  return value ? value : undefined
}

function mapOptionValues(
  options: SelectableOption[],
  selectedValues: Record<string, string>,
  toggleValue: 'on' | 'true',
): OptionInput[] {
  return options.flatMap((option) => {
    if (option.kind === 'toggle') {
      const enabled = selectedValues[option.id]
      return enabled === 'true' || enabled === toggleValue || option.mandatory ? [{ id: option.id, value: toggleValue }] : []
    }

    const selected = selectedValues[option.id]
    return selected ? [{ id: option.id, value: selected }] : []
  })
}

function getStepIndex(state: BookingState, stepId: StepId) {
  return state.steps.findIndex((step) => step.id === stepId)
}

function nextStepIndex(state: BookingState, stepId: StepId) {
  const index = getStepIndex(state, stepId)
  return index >= 0 ? Math.min(index + 1, state.steps.length - 1) : state.currentStepIndex
}

function hasProductWithPrefix(products: ProductInput[], prefix: string) {
  return products.some((product) => product.id.startsWith(prefix))
}

function buildAccommodationPayload(
  state: BookingState,
  input: {
    unitId: string
    boardId: string
    selectedValues: Record<string, string>
    availableOptions: SelectableOption[]
  },
) {
  const accommodationProduct: ProductInput = {
    id: input.unitId,
    group: 0,
    options: mapOptionValues(input.availableOptions, input.selectedValues, 'on'),
  }
  const boardProduct = input.boardId && input.boardId !== input.unitId ? [{ id: input.boardId }] : []

  return {
    ...state.payload,
    products: replaceProducts(state.payload.products, ['A:'], [accommodationProduct, ...boardProduct]),
  }
}

function buildFlightPayload(
  state: BookingState,
  input: {
    flightId: string
    selectedValues: Record<string, string>
    availableOptions: SelectableOption[]
  },
) {
  return {
    ...state.payload,
    products: replaceProducts(state.payload.products, ['F:'], [
      {
        id: input.flightId,
        options: mapOptionValues(input.availableOptions, input.selectedValues, 'on'),
      },
    ]),
  }
}

function buildStepOnePayload(payload: BookingPayload): BookingPayload {
  return {
    ...payload,
    products: [],
    coupons: [],
  }
}

export interface FlowApi {
  getState: () => BookingState
  patchState: (patch: Partial<BookingState>) => void
  setStepIndex: (index: number) => void
  completeStep: (stepId: StepId) => void
  setReceipt: (receipt: ReceiptData | null) => void
  setReceiptLoading: (value: boolean) => void
  setCarExtras: (carId: string, extras: CarExtra[]) => void
  setCheckout: (checkout: BookingState['checkout']) => void
}

export function createFlow(api: FlowApi) {
  const refreshReceipt = async (nextPayload: BookingPayload) => {
    api.patchState({ payload: nextPayload })

    if (!nextPayload.selectedDate) {
      api.setReceipt(null)
      return null
    }

    api.setReceiptLoading(true)
    try {
      const receipt = await getReceipt(nextPayload)
      api.setReceipt(receipt)
      const withPriceSeen = {
        ...nextPayload,
        priceSeen: receipt.perPersonPrice ? (receipt.perPersonPrice / 100).toFixed(2) : nextPayload.priceSeen,
      }
      api.patchState({ payload: withPriceSeen })
      return receipt
    } finally {
      api.setReceiptLoading(false)
    }
  }

  const goToNextStep = (stepId: StepId) => {
    const state = api.getState()
    api.completeStep(stepId)
    api.setStepIndex(nextStepIndex(state, stepId))
  }

  const ensureActivitiesReady = async (payload: BookingPayload) => {
    api.patchState({ activitiesLoading: true })
    let activityData: Awaited<ReturnType<typeof getActivities>>
    try {
      activityData = await getActivities(payload)
      api.patchState({ activities: activityData.activities, activitiesBasePrice: activityData.basePrice, activitiesLoading: false })
    } catch (error) {
      api.patchState({ activitiesLoading: false })
      throw error
    }

    const optionalActivities = activityData.activities.filter((activity) => activity.optional)
    if (optionalActivities.length === 0) {
      goToNextStep('activities')
      return true
    }

    return false
  }

  return {
    goBack() {
      const state = api.getState()
      api.setStepIndex(Math.max(0, state.currentStepIndex - 1))
    },

    goToStep(index: number) {
      const state = api.getState()
      if (index <= state.currentStepIndex || state.completedStepIds.includes(state.steps[index].id)) {
        api.setStepIndex(index)
      }
    },

    toggleMobileReceipt(value: boolean) {
      api.patchState({ mobileReceiptOpen: value })
    },

    async hydrateFromSnapshot(snapshot: BookingUrlSnapshot) {
      const state = api.getState()
      if (snapshot.payload.offerId !== state.offer.id) {
        return
      }

      const allowedStepIds = new Set(state.steps.map((step) => step.id))
      const completedStepIds = (snapshot.completedStepIds ?? []).filter((stepId) => allowedStepIds.has(stepId))
      const currentStepIndex = Math.max(
        0,
        state.steps.findIndex((step) => step.id === snapshot.stepId),
      )
      const payload: BookingPayload = {
        ...state.payload,
        ...snapshot.payload,
        offerId: state.offer.id,
      }

      api.patchState({
        payload,
        travellers: snapshot.travellers ?? state.travellers,
        checkoutForm: snapshot.checkoutForm ?? state.checkoutForm,
        completedStepIds,
        currentStepIndex,
      })

      const hydratedCalendar = await getCalendar(payload)
      const reconciledPayload = reconcileCalendarPayload(payload, hydratedCalendar)

      const patches: Partial<BookingState> = {
        calendar: hydratedCalendar,
        payload: reconciledPayload,
        accommodationsLoading: false,
        activitiesLoading: false,
        activitiesBasePrice: 0,
      }

      if (reconciledPayload.selectedDate) {
        api.setReceiptLoading(true)
        try {
          patches.receipt = await getReceipt(reconciledPayload)
        } finally {
          api.setReceiptLoading(false)
        }
      } else {
        patches.receipt = null
      }

      const stepAtOrBeyond = (stepId: StepId) => {
        const index = getStepIndex(state, stepId)
        return index >= 0 && currentStepIndex >= index
      }

      if (!state.offerMeta.isLeisureOnly && (stepAtOrBeyond('accommodation') || hasProductWithPrefix(reconciledPayload.products, 'A:'))) {
        api.patchState({ accommodationsLoading: true })
        patches.accommodations = await getAccommodations(reconciledPayload)
        patches.accommodationsLoading = false
      }

      if (stepAtOrBeyond('activities') || hasProductWithPrefix(reconciledPayload.products, 'L:') || state.offerMeta.isLeisureOnly) {
        api.patchState({ activitiesLoading: true })
        const activityData = await getActivities(reconciledPayload)
        patches.activities = activityData.activities
        patches.activitiesBasePrice = activityData.basePrice
        patches.activitiesLoading = false
      }

      if (state.offerMeta.hasFlights && (stepAtOrBeyond('flights') || hasProductWithPrefix(reconciledPayload.products, 'F:'))) {
        api.patchState({ flightSearch: { status: 'searching' } })
        try {
          patches.flights = await getFlights(reconciledPayload, (stage) => {
            api.patchState({ flightSearch: { status: stage } })
          })
          patches.flightSearch = { status: 'success' }
        } catch (error) {
          patches.flightSearch = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unable to load flights.',
          }
        }
      }

      if (state.offerMeta.hasCars && (stepAtOrBeyond('cars') || hasProductWithPrefix(reconciledPayload.products, 'C:'))) {
        api.patchState({ carSearch: { status: 'searching' } })
        try {
          patches.cars = await getCars(reconciledPayload)
          patches.carSearch = { status: 'success' }
        } catch (error) {
          patches.carSearch = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unable to load cars.',
          }
        }

        const carProduct = reconciledPayload.products.find((product) => product.id.startsWith('C:'))
        if (carProduct) {
          patches.carExtrasByCarId = {
            ...state.carExtrasByCarId,
            [carProduct.id]: await getCarExtras(reconciledPayload, carProduct.id),
          }
        }
      }

      if (stepAtOrBeyond('checkout')) {
        const checkout = await getCheckoutMetadata(reconciledPayload)
        patches.checkout = checkout
        patches.checkoutForm = {
          ...snapshot.checkoutForm,
          phoneCountryCode:
            snapshot.checkoutForm?.phoneCountryCode ||
            checkout.countries.find((country) => country.code === 'GB')?.code ||
            state.checkoutForm.phoneCountryCode,
          paymentMethodId:
            snapshot.checkoutForm?.paymentMethodId ||
            checkout.paymentMethods.find((method) => method.default)?.id ||
            checkout.paymentMethodGroups.flatMap((group) => group.paymentMethods).find((method) => method.default)?.id ||
            '',
        }
      }

      api.patchState(patches)
    },

    async confirmOccupancy(adults: number, childrenAges: number[]) {
      const people = Array.from({ length: adults + childrenAges.length }, () => ({}))
      const payload: BookingPayload = buildStepOnePayload({
        ...api.getState().payload,
        people,
        groups: [{ people: people.map((_, index) => index) }],
      })

      api.patchState({
        travellers: {
          adults,
          childrenAges,
        },
        payload,
        checkoutForm: {
          ...api.getState().checkoutForm,
          participants: people.slice(1).map(() => ({})),
        },
      })
      const calendar = await getCalendar(payload)
      api.patchState({
        calendar,
        payload: reconcileCalendarPayload(payload, calendar),
      })
    },

    async updateCalendarFilters(filters: { airport?: string; packageGroup?: string; nights?: number | null }) {
      const state = api.getState()
      const nextNights =
        filters.nights === null ? undefined : typeof filters.nights === 'number' ? filters.nights : state.payload.nights
      const payload: BookingPayload = buildStepOnePayload({
        ...state.payload,
        departureAirports: filters.airport ? [filters.airport] : state.payload.departureAirports,
        packageGroup:
          filters.packageGroup !== undefined
            ? normalizeOptionalId(filters.packageGroup)
            : normalizeOptionalId(state.payload.packageGroup),
        nights: nextNights,
        selectedDate: filters.nights !== undefined ? undefined : state.payload.selectedDate,
      })

      const calendar = await getCalendar(payload)
      api.patchState({
        calendar,
        payload: reconcileCalendarPayload(payload, calendar),
      })
    },

    async previewCalendarSelection(input: {
      selectedDate: string
      nights: number
      airport?: string
      packageGroup?: string
    }) {
      const state = api.getState()
      const previousPayload = state.payload
      const payload: BookingPayload = buildStepOnePayload({
        ...state.payload,
        selectedDate: input.selectedDate,
        nights: input.nights,
        departureAirports: input.airport ? [input.airport] : state.payload.departureAirports,
        packageGroup:
          input.packageGroup !== undefined
            ? normalizeOptionalId(input.packageGroup)
            : normalizeOptionalId(state.payload.packageGroup),
      })

      const receipt = await refreshReceipt(payload)
      if (receipt?.errors.length) {
        api.patchState({
          payload: buildStepOnePayload({
            ...previousPayload,
            selectedDate: undefined,
          }),
        })
      }
      return receipt
    },

    async refreshCurrentReceipt() {
      const state = api.getState()
      if (!state.payload.selectedDate || state.payload.nights == null) {
        return
      }
      await refreshReceipt(buildStepOnePayload(state.payload))
    },

    async confirmCalendar(input: {
      selectedDate: string
      nights: number
      airport?: string
      packageGroup?: string
    }) {
      const state = api.getState()
      const previousPayload = state.payload
      const payload: BookingPayload = buildStepOnePayload({
        ...state.payload,
        selectedDate: input.selectedDate,
        nights: input.nights,
        departureAirports: input.airport ? [input.airport] : state.payload.departureAirports,
        packageGroup:
          input.packageGroup !== undefined
            ? normalizeOptionalId(input.packageGroup)
            : normalizeOptionalId(state.payload.packageGroup),
      })

      const canReuseExistingReceipt =
        state.receipt != null &&
        state.receipt.errors.length === 0 &&
        state.payload.selectedDate === input.selectedDate &&
        state.payload.nights === input.nights &&
        (state.payload.departureAirports?.[0] ?? '') === (payload.departureAirports?.[0] ?? '') &&
        normalizeOptionalId(state.payload.packageGroup) === normalizeOptionalId(payload.packageGroup)

      const receipt = canReuseExistingReceipt ? state.receipt : await refreshReceipt(payload)
      if (!receipt || receipt.errors.length) {
        api.patchState({
          payload: buildStepOnePayload({
            ...previousPayload,
            selectedDate: undefined,
          }),
        })
        return false
      }
      api.patchState({
        accommodations: [],
        activities: [],
        activitiesBasePrice: 0,
        accommodationsLoading: false,
        activitiesLoading: false,
        flights: [],
        cars: [],
        carExtrasByCarId: {},
        checkout: null,
        flightSearch: { status: 'idle' },
        carSearch: { status: 'idle' },
      })

      if (state.offerMeta.isLeisureOnly) {
        api.patchState({ activitiesLoading: true })
      } else {
        api.patchState({ accommodationsLoading: true })
      }
      goToNextStep('occupancy')

      let autoAdvanced = false
      if (state.offerMeta.isLeisureOnly) {
        autoAdvanced = await ensureActivitiesReady(payload)
      } else {
        try {
          const accommodations = await getAccommodations(payload)
          api.patchState({ accommodations, accommodationsLoading: false })
        } catch (error) {
          api.patchState({ accommodationsLoading: false })
          throw error
        }
      }

      if (autoAdvanced) {
        return true
      }
      return true
    },

    async previewAccommodation(input: {
      unitId: string
      boardId: string
      selectedValues: Record<string, string>
      availableOptions: SelectableOption[]
    }) {
      const state = api.getState()
      const payload = buildAccommodationPayload(state, input)
      await refreshReceipt(payload)
    },

    async confirmAccommodation(input: {
      unitId: string
      boardId: string
      selectedValues: Record<string, string>
      availableOptions: SelectableOption[]
    }) {
      const state = api.getState()
      const payload = buildAccommodationPayload(state, input)
      api.patchState({ activitiesLoading: true })
      goToNextStep('accommodation')
      const receiptPromise = refreshReceipt(payload)
      const autoAdvanced = await ensureActivitiesReady(payload)
      await receiptPromise
      if (autoAdvanced) {
        return
      }
    },

    async previewActivities(selectedIds: string[]) {
      const state = api.getState()
      const leisureProducts = selectedIds.map((id) => ({ id }))
      const payload: BookingPayload = {
        ...state.payload,
        products: replaceProducts(state.payload.products, ['L:'], leisureProducts),
      }

      await refreshReceipt(payload)
    },

    async confirmActivities(selectedIds: string[]) {
      const state = api.getState()
      const leisureProducts = selectedIds.map((id) => ({ id }))
      const payload: BookingPayload = {
        ...state.payload,
        products: replaceProducts(state.payload.products, ['L:'], leisureProducts),
      }

      goToNextStep('activities')
      await refreshReceipt(payload)
    },

    async ensureFlightsLoaded() {
      const state = api.getState()
      if (!state.offerMeta.hasFlights || state.flightSearch.status === 'success' || state.flightSearch.status === 'searching' || state.flightSearch.status === 'validating') {
        return
      }

      api.patchState({ flightSearch: { status: 'searching' } })
      try {
        const flights = await getFlights(state.payload, (stage) => {
          api.patchState({ flightSearch: { status: stage } })
        })
        api.patchState({ flights, flightSearch: { status: 'success' } })
      } catch (error) {
        api.patchState({
          flightSearch: { status: 'error', error: error instanceof Error ? error.message : 'Unable to load flights.' },
        })
      }
    },

    async previewFlight(input: {
      flightId: string
      selectedValues: Record<string, string>
      availableOptions: SelectableOption[]
    }) {
      const state = api.getState()
      const payload = buildFlightPayload(state, input)
      await refreshReceipt(payload)
    },

    async confirmFlight(input: {
      flightId: string
      selectedValues: Record<string, string>
      availableOptions: SelectableOption[]
    }) {
      const state = api.getState()
      const payload = buildFlightPayload(state, input)
      goToNextStep('flights')
      await refreshReceipt(payload)
    },

    async ensureCarsLoaded() {
      const state = api.getState()
      if (!state.offerMeta.hasCars || state.carSearch.status === 'success' || state.carSearch.status === 'searching') {
        return
      }

      api.patchState({ carSearch: { status: 'searching' } })
      try {
        const cars = await getCars(state.payload)
        api.patchState({ cars, carSearch: { status: 'success' } })
      } catch (error) {
        api.patchState({
          carSearch: { status: 'error', error: error instanceof Error ? error.message : 'Unable to load cars.' },
        })
      }
    },

    async loadCarExtras(carId: string) {
      const state = api.getState()
      if (state.carExtrasByCarId[carId]) {
        return
      }

      api.patchState({ carExtrasLoadingForId: carId })
      const extras = await getCarExtras(state.payload, carId)
      api.setCarExtras(carId, extras)
      api.patchState({ carExtrasLoadingForId: undefined })
    },

    async confirmCar(input: { carId?: string; selectedExtraIds: string[] }) {
      const state = api.getState()
      const nextProducts = input.carId
        ? [
            {
              id: input.carId,
              options: input.selectedExtraIds.map((extraId) => ({ id: extraId, value: 'true' })),
            },
          ]
        : []

      const payload: BookingPayload = {
        ...state.payload,
        products: replaceProducts(state.payload.products, ['C:'], nextProducts),
      }

      goToNextStep('cars')
      await refreshReceipt(payload)
    },

    async ensureCheckoutLoaded() {
      const state = api.getState()
      if (state.checkout) {
        return
      }

      const checkout = await getCheckoutMetadata(state.payload)
      api.setCheckout(checkout)
      api.patchState({
        checkoutForm: {
          ...state.checkoutForm,
          phoneCountryCode: checkout.countries.find((country) => country.code === 'GB')?.code ?? state.checkoutForm.phoneCountryCode,
          paymentMethodId:
            checkout.paymentMethods.find((method) => method.default)?.id ??
            checkout.paymentMethodGroups.flatMap((group) => group.paymentMethods).find((method) => method.default)?.id ??
            '',
        },
      })
    },

    async submitOrder(restoreUrl: string) {
      const state = api.getState()
      if (!state.receipt) {
        throw new Error('A live receipt is required before creating an order.')
      }

      const result = await createOrderRequest(state.payload, state.receipt, state.checkoutForm, restoreUrl)
      const createOrderErrors = result?.errors ?? []
      if (createOrderErrors.length) {
        throw new Error(createOrderErrors[0].message || 'Unable to create order.')
      }

      const continueUrl = result?.paymentResult?.continueUrl
      if (!continueUrl) {
        throw new Error('Order created without a payment continuation URL.')
      }

      return continueUrl
    },

    updateCheckoutField(section: 'leadPassenger' | 'participants' | 'couponCodes', key: string, value: string, index?: number) {
      const state = api.getState()

      if (section === 'participants' && typeof index === 'number') {
        const participants = [...state.checkoutForm.participants]
        participants[index] = {
          ...participants[index],
          [key]: value,
        }
        api.patchState({ checkoutForm: { ...state.checkoutForm, participants } })
        return
      }

      const nextForm = {
        ...state.checkoutForm,
        [section]: {
          ...state.checkoutForm[section],
          [key]: value,
        },
      }
      const nextPatch: Partial<BookingState> = {
        checkoutForm: nextForm,
      }

      if (section === 'leadPassenger' && key === 'email') {
        const people = [...state.payload.people]
        people[0] = {
          ...people[0],
          email: value,
        }
        nextPatch.payload = {
          ...state.payload,
          people,
        }
      }

      api.patchState(nextPatch)
    },

    updateCheckoutMeta(patch: Partial<CheckoutFormState>) {
      const state = api.getState()
      api.patchState({ checkoutForm: { ...state.checkoutForm, ...patch } })
    },

    async applyCoupon(source: string) {
      const state = api.getState()
      const code = state.checkoutForm.couponCodes[source]?.trim()
      if (!code) {
        return
      }

      const payload: BookingPayload = {
        ...state.payload,
        coupons: Array.from(new Set([...(state.payload.coupons ?? []), code])),
      }
      await refreshReceipt(payload)
    },

    async updateInstalments(numOfInstalments: number) {
      const state = api.getState()
      const payload: BookingPayload = {
        ...state.payload,
        numOfInstalments,
      }
      await refreshReceipt(payload)
    },
  }
}
