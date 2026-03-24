'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type {
  BookingPayload,
  OfferMeta,
  CalendarData,
  ReceiptData,
  StepDefinition,
  Accommodation,
  LeisureGroup,
  Flight,
  Car,
  CarExtra,
  CheckoutMeta,
  ProductInput,
} from './types'
import {
  fetchOffer,
  fetchCalendar,
  fetchReceipt,
  fetchAccommodations,
  fetchLeisures,
  fetchFlights,
  fetchCars,
  fetchCarExtras,
  fetchCheckoutMeta,
  startFlightSearchTask,
  startFlightPriceValidationTask,
  startCarSearchTask,
  waitForTaskGroup,
} from './api'
import { buildSteps, sessionId } from './steps'
import { replaceProductByPrefix, stripProductsByPrefix } from './variables'
import { decodeSnapshot, encodeSnapshot, writeToUrlReplace } from './url-state'

export interface AsyncState {
  accommodationsLoading: boolean
  activitiesLoading: boolean
  flightsLoading: boolean
  carsLoading: boolean
  carExtrasLoading: boolean
  receiptLoading: boolean
  calendarLoading: boolean
  checkoutLoading: boolean
  flightSearchStatus?: string
  carSearchStatus?: string
  flightResultsEmpty?: boolean
  carResultsEmpty?: boolean
  priceChangeDelta?: number | null
}

export interface MultistepState {
  payload: BookingPayload
  steps: StepDefinition[]
  currentStep: number
  bootstrapped: boolean
  calendar: CalendarData | null
  receipt: ReceiptData | null
  lastValidPayload: BookingPayload | null
  accommodations: Accommodation[] | null
  activities: LeisureGroup[] | null
  leisureBasePrice: number | null
  flights: Flight[] | null
  cars: Car[] | null
  carExtras: CarExtra[] | null
  checkoutMeta: CheckoutMeta | null
  async: AsyncState
  globalError?: string | null
}

type Action =
  | { type: 'HYDRATE_BOOT'; offer: OfferMeta; payload: BookingPayload; steps: StepDefinition[]; calendar: CalendarData }
  | { type: 'SET_CALENDAR'; calendar: CalendarData }
  | { type: 'PATCH_PAYLOAD'; patch: Partial<BookingPayload> }
  | { type: 'SET_PRODUCTS'; products: ProductInput[] }
  | { type: 'SET_RECEIPT'; receipt: ReceiptData | null }
  | { type: 'SET_RECEIPT_LOADING'; loading: boolean }
  | { type: 'SET_CALENDAR_LOADING'; loading: boolean }
  | { type: 'SET_ACCOMMODATIONS'; data: Accommodation[] | null }
  | { type: 'SET_ACCOMMODATIONS_LOADING'; loading: boolean }
  | { type: 'SET_ACTIVITIES'; data: LeisureGroup[] | null; basePrice?: number | null }
  | { type: 'SET_ACTIVITIES_LOADING'; loading: boolean }
  | { type: 'SET_FLIGHTS'; data: Flight[] | null }
  | { type: 'SET_FLIGHTS_LOADING'; loading: boolean; status?: string; empty?: boolean }
  | { type: 'SET_CARS'; data: Car[] | null }
  | { type: 'SET_CARS_LOADING'; loading: boolean; status?: string; empty?: boolean }
  | { type: 'SET_CAR_EXTRAS'; data: CarExtra[] | null }
  | { type: 'SET_CAR_EXTRAS_LOADING'; loading: boolean }
  | { type: 'SET_CHECKOUT_META'; data: CheckoutMeta | null }
  | { type: 'SET_CHECKOUT_LOADING'; loading: boolean }
  | { type: 'SET_STEP'; step: number }
  | { type: 'ROLLBACK_TO_LAST_VALID' }
  | { type: 'SET_LAST_VALID' }
  | { type: 'CLEAR_DOWNSTREAM' }
  | { type: 'SET_GLOBAL_ERROR'; message: string | null }
  | { type: 'SET_PRICE_CHANGE_DELTA'; delta: number | null }

const INITIAL_PAYLOAD: BookingPayload = {
  offerId: '',
  sessionId: '',
  people: [{}, {}],
  groups: [{ people: [0, 1] }],
  products: [],
}

const initialState: MultistepState = {
  payload: INITIAL_PAYLOAD,
  steps: [],
  currentStep: 0,
  bootstrapped: false,
  calendar: null,
  receipt: null,
  lastValidPayload: null,
  accommodations: null,
  activities: null,
  leisureBasePrice: null,
  flights: null,
  cars: null,
  carExtras: null,
  checkoutMeta: null,
  async: {
    accommodationsLoading: false,
    activitiesLoading: false,
    flightsLoading: false,
    carsLoading: false,
    carExtrasLoading: false,
    receiptLoading: false,
    calendarLoading: false,
    checkoutLoading: false,
  },
}

function reducer(s: MultistepState, a: Action): MultistepState {
  switch (a.type) {
    case 'HYDRATE_BOOT':
      return {
        ...s,
        payload: { ...a.payload, offerMeta: a.offer },
        steps: a.steps,
        calendar: a.calendar,
        bootstrapped: true,
      }
    case 'SET_CALENDAR':
      return { ...s, calendar: a.calendar }
    case 'PATCH_PAYLOAD':
      return { ...s, payload: { ...s.payload, ...a.patch } }
    case 'SET_PRODUCTS':
      return { ...s, payload: { ...s.payload, products: a.products } }
    case 'SET_RECEIPT':
      return { ...s, receipt: a.receipt }
    case 'SET_RECEIPT_LOADING':
      return { ...s, async: { ...s.async, receiptLoading: a.loading } }
    case 'SET_CALENDAR_LOADING':
      return { ...s, async: { ...s.async, calendarLoading: a.loading } }
    case 'SET_ACCOMMODATIONS':
      return { ...s, accommodations: a.data }
    case 'SET_ACCOMMODATIONS_LOADING':
      return { ...s, async: { ...s.async, accommodationsLoading: a.loading } }
    case 'SET_ACTIVITIES':
      return {
        ...s,
        activities: a.data,
        leisureBasePrice: a.basePrice ?? s.leisureBasePrice,
      }
    case 'SET_ACTIVITIES_LOADING':
      return { ...s, async: { ...s.async, activitiesLoading: a.loading } }
    case 'SET_FLIGHTS':
      return { ...s, flights: a.data }
    case 'SET_FLIGHTS_LOADING':
      return {
        ...s,
        async: {
          ...s.async,
          flightsLoading: a.loading,
          flightSearchStatus: a.status,
          flightResultsEmpty: a.empty,
        },
      }
    case 'SET_CARS':
      return { ...s, cars: a.data }
    case 'SET_CARS_LOADING':
      return {
        ...s,
        async: {
          ...s.async,
          carsLoading: a.loading,
          carSearchStatus: a.status,
          carResultsEmpty: a.empty,
        },
      }
    case 'SET_CAR_EXTRAS':
      return { ...s, carExtras: a.data }
    case 'SET_CAR_EXTRAS_LOADING':
      return { ...s, async: { ...s.async, carExtrasLoading: a.loading } }
    case 'SET_CHECKOUT_META':
      return { ...s, checkoutMeta: a.data }
    case 'SET_CHECKOUT_LOADING':
      return { ...s, async: { ...s.async, checkoutLoading: a.loading } }
    case 'SET_STEP':
      return { ...s, currentStep: a.step }
    case 'SET_LAST_VALID':
      return { ...s, lastValidPayload: { ...s.payload } }
    case 'ROLLBACK_TO_LAST_VALID':
      return s.lastValidPayload ? { ...s, payload: { ...s.lastValidPayload } } : s
    case 'CLEAR_DOWNSTREAM':
      return {
        ...s,
        payload: { ...s.payload, products: [] },
        accommodations: null,
        activities: null,
        flights: null,
        cars: null,
        carExtras: null,
        checkoutMeta: null,
      }
    case 'SET_GLOBAL_ERROR':
      return { ...s, globalError: a.message }
    case 'SET_PRICE_CHANGE_DELTA':
      return { ...s, async: { ...s.async, priceChangeDelta: a.delta } }
    default:
      return s
  }
}

interface Ctx {
  state: MultistepState
  actions: ReturnType<typeof buildActions>
}

const BookingContext = createContext<Ctx | null>(null)

function buildActions(
  getState: () => MultistepState,
  dispatch: React.Dispatch<Action>,
  offerIdProp: string,
) {
  async function runReceipt(nextPayload: BookingPayload) {
    dispatch({ type: 'SET_RECEIPT_LOADING', loading: true })
    try {
      const r = await fetchReceipt(nextPayload)
      dispatch({ type: 'SET_RECEIPT', receipt: r })
      if (!r.errors || r.errors.length === 0) dispatch({ type: 'SET_LAST_VALID' })
      return r
    } finally {
      dispatch({ type: 'SET_RECEIPT_LOADING', loading: false })
    }
  }

  async function runCalendar(payload: BookingPayload) {
    dispatch({ type: 'SET_CALENDAR_LOADING', loading: true })
    try {
      const c = await fetchCalendar(payload)
      dispatch({ type: 'SET_CALENDAR', calendar: c })
      return c
    } finally {
      dispatch({ type: 'SET_CALENDAR_LOADING', loading: false })
    }
  }

  async function bootstrap(snapshot: ReturnType<typeof decodeSnapshot>) {
    const sid = snapshot?.sid ?? sessionId()
    const baseline: BookingPayload = {
      ...INITIAL_PAYLOAD,
      offerId: offerIdProp,
      sessionId: sid,
      ...(snapshot?.p ?? {}),
    }
    if (!snapshot) {
      baseline.people = [{}, {}]
      baseline.groups = [{ people: [0, 1] }]
      baseline.products = []
    }
    const offer = await fetchOffer(offerIdProp, sid)
    const steps = buildSteps(offer)

    // Phase 1 — unfiltered calendar for leading airport/package discovery
    const phase1 = await fetchCalendar({ ...baseline, offerMeta: offer })
    const leadingAirport = phase1.departureAirports?.[0]?.airport?.iataCode
    const leadingPackage = phase1.packageGroups?.[0]?.id
    const payloadWithLeading: BookingPayload = {
      ...baseline,
      offerMeta: offer,
      departureAirports: baseline.departureAirports ?? (leadingAirport ? [leadingAirport] : undefined),
      packageGroup:
        baseline.packageGroup !== undefined
          ? baseline.packageGroup
          : leadingPackage !== undefined
            ? leadingPackage
            : undefined,
    }
    // Phase 2 — aligned calendar
    const phase2 = await fetchCalendar(payloadWithLeading)
    dispatch({
      type: 'HYDRATE_BOOT',
      offer,
      payload: payloadWithLeading,
      steps,
      calendar: phase2,
    })

    if (snapshot) {
      dispatch({ type: 'SET_STEP', step: snapshot.st })
      if (payloadWithLeading.selectedDate && payloadWithLeading.nights != null) {
        try {
          await runReceipt(payloadWithLeading)
        } catch {}
      }
    }
  }

  async function refreshFirstStep(patch: Partial<BookingPayload>, opts: { reprice?: boolean } = {}) {
    const prev = getState().payload
    const next: BookingPayload = { ...prev, ...patch }
    dispatch({ type: 'PATCH_PAYLOAD', patch })
    dispatch({ type: 'SET_CALENDAR_LOADING', loading: true })
    try {
      const c = await fetchCalendar(next)
      dispatch({ type: 'SET_CALENDAR', calendar: c })
      const airports = c.departureAirports?.map((d) => d.airport.iataCode) ?? []
      const fix: Partial<BookingPayload> = {}
      if (next.departureAirports?.[0] && airports.length && !airports.includes(next.departureAirports[0])) {
        fix.departureAirports = [airports[0]]
      }
      if (Object.keys(fix).length) {
        dispatch({ type: 'PATCH_PAYLOAD', patch: fix })
      }
      if (opts.reprice && next.selectedDate && next.nights != null) {
        await runReceipt({ ...next, ...fix })
      }
    } finally {
      dispatch({ type: 'SET_CALENDAR_LOADING', loading: false })
    }
  }

  async function selectStay(date: string, nights: number | null) {
    const prev = getState().payload
    const cleared = { ...prev, selectedDate: date, nights: nights, products: [] }
    dispatch({ type: 'CLEAR_DOWNSTREAM' })
    dispatch({ type: 'PATCH_PAYLOAD', patch: { selectedDate: date, nights: nights } })
    try {
      const r = await runReceipt(cleared)
      if (r.errors && r.errors.length > 0) {
        dispatch({ type: 'ROLLBACK_TO_LAST_VALID' })
      }
    } catch (e) {
      dispatch({ type: 'SET_GLOBAL_ERROR', message: (e as Error).message })
    }
  }

  async function loadAccommodations() {
    const payload = getState().payload
    dispatch({ type: 'SET_ACCOMMODATIONS_LOADING', loading: true })
    try {
      const { accomodations } = await fetchAccommodations(payload)
      dispatch({ type: 'SET_ACCOMMODATIONS', data: accomodations })

      // Apply backend-selected defaults if nothing is selected yet
      const hasAccProduct = (payload.products ?? []).some((p) => p.id.startsWith('A:'))
      if (!hasAccProduct && accomodations && accomodations.length > 0) {
        const defaultAcc = accomodations[0]
        const defaultUnit = defaultAcc.units?.find((u) => u.selected) ?? defaultAcc.units?.[0]
        const defaultBoard =
          defaultUnit?.boards?.find((b) => b.selected) ?? defaultUnit?.boards?.[0]
        const products: ProductInput[] = stripProductsByPrefix(payload.products, 'A:')
        if (defaultUnit) products.push({ id: defaultUnit.id })
        if (defaultBoard && defaultBoard.id !== defaultUnit?.id) products.push({ id: defaultBoard.id })
        dispatch({ type: 'SET_PRODUCTS', products })
        await runReceipt({ ...payload, products })
      }
    } finally {
      dispatch({ type: 'SET_ACCOMMODATIONS_LOADING', loading: false })
    }
  }

  async function selectAccommodation(unitId: string, boardId?: string) {
    const payload = getState().payload
    let products = stripProductsByPrefix(payload.products, 'A:')
    products.push({ id: unitId })
    if (boardId && boardId !== unitId) products.push({ id: boardId })
    dispatch({ type: 'SET_PRODUCTS', products })
    await runReceipt({ ...payload, products })
  }

  async function loadActivities() {
    const payload = getState().payload
    dispatch({ type: 'SET_ACTIVITIES_LOADING', loading: true })
    try {
      const { leisures, price } = await fetchLeisures(payload)
      dispatch({ type: 'SET_ACTIVITIES', data: leisures, basePrice: price })
    } finally {
      dispatch({ type: 'SET_ACTIVITIES_LOADING', loading: false })
    }
  }

  async function toggleLeisureChoice(groupProductId: string, unitProductId: string | null) {
    const payload = getState().payload
    const group = getState().activities?.find((g) => g.productId === groupProductId)
    if (!group) return
    let products = [...(payload.products ?? [])]
    for (const u of group.units) products = products.filter((p) => p.id !== u.productId)
    products = products.filter((p) => p.id !== groupProductId)
    if (unitProductId) products.push({ id: unitProductId })
    dispatch({ type: 'SET_PRODUCTS', products })
    await runReceipt({ ...payload, products })
  }

  async function loadFlights() {
    const payload = getState().payload
    dispatch({ type: 'SET_FLIGHTS_LOADING', loading: true, status: 'Searching flights…', empty: false })
    dispatch({ type: 'SET_PRICE_CHANGE_DELTA', delta: null })
    const baselineTotal = getState().receipt?.totalPrice ?? 0
    try {
      const searchGroup = await startFlightSearchTask(payload)
      const searchStatus = await waitForTaskGroup(searchGroup, payload.sessionId)
      if (searchStatus !== 'FINISHED') {
        dispatch({ type: 'SET_FLIGHTS_LOADING', loading: false, status: 'No flights available', empty: true })
        dispatch({ type: 'SET_FLIGHTS', data: [] })
        return
      }

      dispatch({ type: 'SET_FLIGHTS_LOADING', loading: true, status: 'Validating prices…' })
      const priceGroup = await startFlightPriceValidationTask(payload)
      await waitForTaskGroup(priceGroup, payload.sessionId)

      const { flights } = await fetchFlights(payload)
      dispatch({ type: 'SET_FLIGHTS', data: flights })
      if (!flights || flights.length === 0) {
        dispatch({ type: 'SET_FLIGHTS_LOADING', loading: false, empty: true })
        return
      }
      // Apply backend-selected default flight if payload has no F:
      const hasF = (payload.products ?? []).some((p) => p.id.startsWith('F:'))
      let nextPayload = payload
      if (!hasF) {
        const defaultFlight = flights.find((f) => f.selected) ?? flights[0]
        const products = replaceProductByPrefix(payload.products, 'F:', { id: defaultFlight.id })
        dispatch({ type: 'SET_PRODUCTS', products })
        nextPayload = { ...payload, products }
      }
      const r = await runReceipt(nextPayload)
      if (baselineTotal && r.totalPrice && r.totalPrice !== baselineTotal) {
        dispatch({ type: 'SET_PRICE_CHANGE_DELTA', delta: r.totalPrice - baselineTotal })
      }
      dispatch({ type: 'SET_FLIGHTS_LOADING', loading: false, empty: false })
    } catch (e) {
      dispatch({ type: 'SET_FLIGHTS_LOADING', loading: false, status: 'No flights available', empty: true })
      dispatch({ type: 'SET_FLIGHTS', data: [] })
    }
  }

  async function selectFlight(flightId: string) {
    const payload = getState().payload
    const products = replaceProductByPrefix(payload.products, 'F:', { id: flightId })
    dispatch({ type: 'SET_PRODUCTS', products })
    await runReceipt({ ...payload, products })
  }

  async function loadCars() {
    const payload = getState().payload
    dispatch({ type: 'SET_CARS_LOADING', loading: true, status: 'Searching cars…', empty: false })
    try {
      const group = await startCarSearchTask(payload)
      const status = await waitForTaskGroup(group, payload.sessionId)
      if (status !== 'FINISHED') {
        dispatch({ type: 'SET_CARS_LOADING', loading: false, status: 'No cars available', empty: true })
        dispatch({ type: 'SET_CARS', data: [] })
        return
      }
      const { cars } = await fetchCars(payload)
      dispatch({ type: 'SET_CARS', data: cars })
      if (!cars || cars.length === 0) {
        dispatch({ type: 'SET_CARS_LOADING', loading: false, empty: true })
        return
      }
      const hasC = (payload.products ?? []).some((p) => p.id.startsWith('C:'))
      let nextPayload = payload
      if (!hasC) {
        const defaultCar = cars.find((c) => c.selected) ?? cars[0]
        const products = replaceProductByPrefix(payload.products, 'C:', { id: defaultCar.id })
        dispatch({ type: 'SET_PRODUCTS', products })
        nextPayload = { ...payload, products }
        await loadCarExtras(defaultCar.id)
      }
      await runReceipt(nextPayload)
      dispatch({ type: 'SET_CARS_LOADING', loading: false, empty: false })
    } catch {
      dispatch({ type: 'SET_CARS_LOADING', loading: false, status: 'No cars available', empty: true })
      dispatch({ type: 'SET_CARS', data: [] })
    }
  }

  async function selectCar(carId: string) {
    const payload = getState().payload
    const products = replaceProductByPrefix(payload.products, 'C:', { id: carId })
    dispatch({ type: 'SET_PRODUCTS', products })
    await runReceipt({ ...payload, products })
    await loadCarExtras(carId)
  }

  async function loadCarExtras(carId: string) {
    const payload = getState().payload
    dispatch({ type: 'SET_CAR_EXTRAS_LOADING', loading: true })
    try {
      const { extras } = await fetchCarExtras(carId, payload.sessionId)
      dispatch({ type: 'SET_CAR_EXTRAS', data: extras })
    } catch {
      dispatch({ type: 'SET_CAR_EXTRAS', data: [] })
    } finally {
      dispatch({ type: 'SET_CAR_EXTRAS_LOADING', loading: false })
    }
  }

  async function toggleCarExtra(extraId: string) {
    const payload = getState().payload
    const products = [...(payload.products ?? [])]
    const carIdx = products.findIndex((p) => p.id.startsWith('C:'))
    if (carIdx < 0) return
    const car = products[carIdx]
    const opts = car.options ?? []
    const has = opts.find((o) => o.id === extraId)
    const nextOpts = has ? opts.filter((o) => o.id !== extraId) : [...opts, { id: extraId }]
    products[carIdx] = { ...car, options: nextOpts }
    dispatch({ type: 'SET_PRODUCTS', products })
    await runReceipt({ ...payload, products })
  }

  async function loadCheckoutMeta() {
    const payload = getState().payload
    dispatch({ type: 'SET_CHECKOUT_LOADING', loading: true })
    try {
      const meta = await fetchCheckoutMeta(payload)
      dispatch({ type: 'SET_CHECKOUT_META', data: meta })
    } finally {
      dispatch({ type: 'SET_CHECKOUT_LOADING', loading: false })
    }
  }

  async function setInstalments(n: number) {
    const payload = getState().payload
    const next = { ...payload, numOfInstalments: n }
    dispatch({ type: 'PATCH_PAYLOAD', patch: { numOfInstalments: n } })
    await runReceipt(next)
  }

  function goToStep(n: number) {
    dispatch({ type: 'SET_STEP', step: n })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  function restartFromDates() {
    dispatch({ type: 'CLEAR_DOWNSTREAM' })
    dispatch({ type: 'SET_STEP', step: 0 })
  }

  return {
    bootstrap,
    runReceipt,
    runCalendar,
    refreshFirstStep,
    selectStay,
    loadAccommodations,
    selectAccommodation,
    loadActivities,
    toggleLeisureChoice,
    loadFlights,
    selectFlight,
    loadCars,
    selectCar,
    loadCarExtras,
    toggleCarExtra,
    loadCheckoutMeta,
    setInstalments,
    goToStep,
    restartFromDates,
    patch: (patch: Partial<BookingPayload>) => dispatch({ type: 'PATCH_PAYLOAD', patch }),
    setProducts: (products: ProductInput[]) => dispatch({ type: 'SET_PRODUCTS', products }),
    setGlobalError: (m: string | null) => dispatch({ type: 'SET_GLOBAL_ERROR', message: m }),
  }
}

export function BookingProvider({ offerId, children }: { offerId: string; children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state
  const actions = useMemo(() => buildActions(() => stateRef.current, dispatch, offerId), [offerId])

  useEffect(() => {
    let cancelled = false
    const url = new URL(window.location.href)
    const s = url.searchParams.get('s')
    const snap = s ? decodeSnapshot(s) : null
    ;(async () => {
      try {
        await actions.bootstrap(snap)
        if (cancelled) return
      } catch (e) {
        if (!cancelled) actions.setGlobalError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId])

  // URL sync — replace, not navigate
  useEffect(() => {
    if (!state.bootstrapped) return
    writeToUrlReplace(encodeSnapshot(state.payload, state.currentStep))
  }, [state.payload, state.currentStep, state.bootstrapped])

  return <BookingContext.Provider value={{ state, actions }}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider')
  return ctx
}
