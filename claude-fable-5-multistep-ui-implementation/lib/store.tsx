'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import * as api from './api'
import {
  buildGroups, buildPeople, getSelectedProductId, hasValidStay, newSessionId,
  replaceLeisureForGroup, replaceProduct, stripProductsByPrefix,
} from './payload'
import { buildSnapshot, payloadFromSnapshot, readSnapshotFromUrl, writeSnapshotToUrl } from './urlState'
import type {
  AccommodationData, ActivityData, BookingPayload, CalendarData, CarData,
  CarExtrasData, CheckoutMeta, Flight, OfferMeta, ProductInput, ReceiptData, StepDefinition,
} from './types'

export type AsyncSearchStatus = 'idle' | 'searching' | 'validating' | 'pricing' | 'ready' | 'noresults'

export interface FlowState {
  offerId: string
  bootStatus: 'loading' | 'restoring' | 'ready' | 'error'
  bootError: string | null

  payload: BookingPayload
  offerMeta: OfferMeta | null
  steps: StepDefinition[]
  currentStepIndex: number
  maxReachedIndex: number

  nightsFilter: number | null // visible length-of-stay filter; null = "All nights"

  calendar: CalendarData | null
  calendarLoading: boolean

  receipt: ReceiptData | null
  receiptLoading: boolean
  receiptError: string | null
  stayConfirmed: boolean // a receipt-validated stay exists

  accommodations: AccommodationData | null
  accommodationsLoading: boolean
  accommodationsKey: string | null

  activities: ActivityData | null
  activitiesLoading: boolean
  activitiesKey: string | null

  flightsStatus: AsyncSearchStatus
  flights: Flight[] | null
  flightsPriceChange: number | null
  flightsKey: string | null

  carsStatus: AsyncSearchStatus
  cars: CarData | null
  carsKey: string | null

  carExtras: CarExtrasData | null
  carExtrasLoading: boolean

  checkoutMeta: CheckoutMeta | null
  checkoutMetaLoading: boolean

  globalNotice: string | null
}

type Patch = Partial<FlowState>

function reducer(state: FlowState, patch: Patch): FlowState {
  return { ...state, ...patch }
}

const STEP_LABELS: Record<StepDefinition['id'], string> = {
  dates: 'Dates',
  rooms: 'Rooms',
  activities: 'Activities',
  flights: 'Flights',
  cars: 'Cars',
  checkout: 'Confirm & pay',
}

export function buildSteps(meta: OfferMeta): StepDefinition[] {
  const ids: StepDefinition['id'][] = ['dates']
  if (!meta.isLeisureOnly) ids.push('rooms')
  ids.push('activities')
  if (meta.hasFlights) ids.push('flights')
  if (meta.hasCars) ids.push('cars')
  ids.push('checkout')
  return ids.map((id, i) => ({ id, label: STEP_LABELS[id], number: i + 1 }))
}

// Stay identity: when this changes, downstream searches/datasets are stale.
function stayKeyOf(payload: BookingPayload): string {
  return JSON.stringify([
    payload.selectedDate, payload.nights, payload.departureAirports,
    payload.packageGroup ?? '', payload.people,
  ])
}

export interface FlowActions {
  commitOccupancy(adults: number, childAges: number[]): Promise<void>
  selectAirport(iata: string): Promise<void>
  selectPackageGroup(id: string): Promise<void>
  selectNightsFilter(nights: number | null): Promise<void>
  selectStay(date: string, nights: number): Promise<void>
  clearStay(): void
  confirmDates(): void

  goToStep(index: number): void
  goBack(): void
  goNext(): void
  resetToDates(notice?: string): void

  ensureAccommodations(): void
  selectAccommodationProduct(productId: string): Promise<void>

  ensureActivities(): void
  setLeisureSelection(groupUnitIds: string[], selectedUnitId: string | null): Promise<void>

  ensureFlights(): void
  selectFlight(flightId: string): Promise<void>

  ensureCars(): void
  selectCar(carId: string): Promise<void>
  toggleCarExtra(extraId: string): Promise<void>

  ensureCheckoutMeta(): void
  setInstalments(n: number): Promise<void>
  updateLeadCustomer(fields: Record<string, string>): void
  updateParticipant(index: number, fields: Record<string, string>): void
  submitOrder(paymentMethod: string | null): Promise<{ ok: boolean; message?: string }>
}

const StateCtx = createContext<FlowState | null>(null)
const ActionsCtx = createContext<FlowActions | null>(null)

export function useBookingState(): FlowState {
  const s = useContext(StateCtx)
  if (!s) throw new Error('useBookingState outside provider')
  return s
}

export function useBookingActions(): FlowActions {
  const a = useContext(ActionsCtx)
  if (!a) throw new Error('useBookingActions outside provider')
  return a
}

export function BookingProvider({ offerId, children }: { offerId: string; children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => initialState(offerId))
  const ref = useRef(state)
  ref.current = state

  const patch = useCallback((p: Patch) => dispatch(p), [])

  // ---- boot ----
  useEffect(() => {
    let cancelled = false
    async function boot() {
      const snapshot = readSnapshotFromUrl()
      try {
        if (snapshot) {
          patch({ bootStatus: 'restoring' })
          const payload = payloadFromSnapshot(snapshot, offerId)
          const meta = await api.fetchOffer(offerId, payload.sessionId)
          if (cancelled) return
          payload.offerMeta = meta
          const steps = buildSteps(meta)
          const nightsFilter = snapshot.nf === undefined ? null : snapshot.nf
          const calendar = await api.fetchCalendar(payload, nightsFilter)
          if (cancelled) return
          let receipt: ReceiptData | null = null
          let stayConfirmed = false
          if (hasValidStay(payload)) {
            try {
              const r = await api.fetchReceipt(payload)
              if (!r.errors.length) {
                receipt = r
                stayConfirmed = true
                payload.priceSeen = r.totalPrice ?? undefined
              }
            } catch {
              // fall through to an unconfirmed stay
            }
          }
          let stepIndex = Math.max(0, steps.findIndex((s) => s.id === snapshot.st))
          if (!stayConfirmed) {
            // Without a valid stay nothing downstream is meaningful.
            payload.selectedDate = undefined
            payload.nights = undefined
            payload.products = undefined
            stepIndex = 0
          }
          patch({
            payload, offerMeta: meta, steps, calendar, receipt, stayConfirmed,
            nightsFilter,
            currentStepIndex: stepIndex,
            maxReachedIndex: stepIndex,
            bootStatus: 'ready',
          })
        } else {
          const sessionId = newSessionId()
          const people = buildPeople(2, [])
          const payload: BookingPayload = { offerId, sessionId, people, groups: buildGroups(people) }
          const meta = await api.fetchOffer(offerId, sessionId)
          if (cancelled) return
          payload.offerMeta = meta
          const steps = buildSteps(meta)
          // Two-phase bootstrap: facets first, then aligned calendar.
          const facets = await api.fetchCalendar(payload, null)
          if (cancelled) return
          const defaultAirport =
            facets.departureAirports.find((a) => a.selected)?.airport?.iataCode ??
            facets.departureAirports[0]?.airport?.iataCode
          if (defaultAirport) payload.departureAirports = [defaultAirport]
          const defaultPg = facets.packageGroups[0]?.id
          if (defaultPg !== undefined && defaultPg !== null) payload.packageGroup = defaultPg
          const nightsFilter = facets.nights.length ? facets.nights[0].nights : null
          const calendar = await api.fetchCalendar(payload, nightsFilter)
          if (cancelled) return
          patch({ payload, offerMeta: meta, steps, calendar, nightsFilter, bootStatus: 'ready' })
        }
      } catch (e) {
        if (!cancelled) {
          patch({ bootStatus: 'error', bootError: e instanceof Error ? e.message : 'Could not load this offer' })
        }
      }
    }
    boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId])

  // ---- URL state sync (history replacement, never a navigation) ----
  useEffect(() => {
    if (state.bootStatus !== 'ready' || !state.steps.length) return
    const stepId = state.steps[state.currentStepIndex]?.id ?? 'dates'
    writeSnapshotToUrl(buildSnapshot(state.payload, stepId, state.nightsFilter))
  }, [state.bootStatus, state.payload, state.currentStepIndex, state.nightsFilter, state.steps])

  // ---- receipt repricing core ----

  const repriceFromDates = useCallback(async (nextPayload: BookingPayload): Promise<boolean> => {
    patch({ receiptLoading: true, payload: nextPayload })
    try {
      const r = await api.fetchReceipt(nextPayload)
      if (r.errors.length) throw new Error(r.errors[0]?.message || 'This combination is not available')
      patch({
        receipt: r,
        receiptLoading: false,
        receiptError: null,
        stayConfirmed: true,
        payload: { ...nextPayload, priceSeen: r.totalPrice ?? undefined },
      })
      return true
    } catch (e) {
      // Roll back to the last valid stay; keep progression blocked.
      const prev = ref.current
      patch({
        receiptLoading: false,
        receiptError: e instanceof Error ? e.message : 'This combination is not available',
        payload: prev.stayConfirmed && prev.receipt
          ? { ...nextPayload, selectedDate: prev.receipt.startDate ?? undefined, nights: prev.receipt.nights ?? undefined }
          : { ...nextPayload, selectedDate: undefined, nights: undefined },
        stayConfirmed: prev.stayConfirmed,
      })
      return false
    }
  }, [patch])

  const resetToDates = useCallback((notice?: string) => {
    const prev = ref.current
    const payload: BookingPayload = {
      ...prev.payload,
      selectedDate: undefined,
      nights: undefined,
      products: undefined,
      priceSeen: undefined,
      numOfInstalments: undefined,
    }
    patch({
      payload,
      receipt: null,
      receiptError: null,
      stayConfirmed: false,
      currentStepIndex: 0,
      maxReachedIndex: 0,
      accommodations: null, accommodationsKey: null,
      activities: null, activitiesKey: null,
      flights: null, flightsStatus: 'idle', flightsKey: null, flightsPriceChange: null,
      cars: null, carsStatus: 'idle', carsKey: null, carExtras: null,
      checkoutMeta: null,
      globalNotice: notice ?? null,
    })
  }, [patch])

  // Downstream repricing keeps the stay; a receipt error means the combination
  // is no longer packageable, so reset the journey to Dates.
  const repriceDownstream = useCallback(async (nextPayload: BookingPayload): Promise<boolean> => {
    patch({ receiptLoading: true, payload: nextPayload })
    try {
      const r = await api.fetchReceipt(nextPayload)
      if (r.errors.length) throw new Error(r.errors[0]?.message || 'This combination is not available')
      patch({
        receipt: r,
        receiptLoading: false,
        receiptError: null,
        payload: { ...nextPayload, priceSeen: r.totalPrice ?? undefined },
      })
      return true
    } catch {
      resetToDates('Some of your selections are no longer available together. Please choose your dates again.')
      return false
    }
  }, [patch, resetToDates])

  // ---- first-step actions ----

  // Reconcile current selections against a freshly returned calendar, then
  // reprice when a confirmed stay survives the change.
  const refreshCalendar = useCallback(async (nextPayload: BookingPayload, nightsFilter: number | null) => {
    patch({ calendarLoading: true, payload: nextPayload, nightsFilter, globalNotice: null })
    try {
      let calendar = await api.fetchCalendar(nextPayload, nightsFilter)
      let payload = nextPayload

      // Airport must be one of the returned facets.
      const airports = calendar.departureAirports
      if (airports.length) {
        const current = payload.departureAirports?.[0]
        if (!current || !airports.some((a) => a.airport?.iataCode === current)) {
          const fallback = (airports.find((a) => a.selected) ?? airports[0]).airport?.iataCode
          payload = { ...payload, departureAirports: fallback ? [fallback] : undefined }
          calendar = await api.fetchCalendar(payload, nightsFilter)
        }
      }

      // Package group must be valid ('' is the legitimate "All packages" value).
      const pgs = calendar.packageGroups
      if (pgs.length && payload.packageGroup !== undefined && !pgs.some((g) => (g.id ?? '') === payload.packageGroup)) {
        payload = { ...payload, packageGroup: pgs[0].id ?? '' }
        calendar = await api.fetchCalendar(payload, nightsFilter)
      }

      // Nights filter must still exist in the facets.
      let filter = nightsFilter
      if (calendar.nights.length && !calendar.nights.some((n) => n.nights === filter)) {
        filter = calendar.nights[0].nights
        calendar = await api.fetchCalendar(payload, filter)
      }

      patch({ calendar, calendarLoading: false, payload, nightsFilter: filter })

      // Does the previously selected stay survive?
      if (payload.selectedDate && payload.nights != null) {
        const day = calendar.dates.find((d) => d.date === payload.selectedDate)
        const stillValid =
          day != null &&
          day.quantity > 0 &&
          (filter != null
            ? filter === payload.nights
            : day.nights.some((n) => n.nights === payload.nights))
        if (stillValid) {
          await repriceFromDates(payload)
        } else {
          patch({
            payload: { ...payload, selectedDate: undefined, nights: undefined, products: undefined },
            receipt: null,
            stayConfirmed: false,
            receiptError: null,
          })
        }
      }
    } catch (e) {
      patch({
        calendarLoading: false,
        receiptError: e instanceof Error ? e.message : 'Could not refresh availability',
      })
    }
  }, [patch, repriceFromDates])

  const commitOccupancy = useCallback(async (adults: number, childAges: number[]) => {
    const prev = ref.current
    const people = buildPeople(adults, childAges)
    const payload: BookingPayload = {
      ...prev.payload,
      people,
      groups: buildGroups(people),
      products: undefined, // a changed party invalidates downstream choices
    }
    await refreshCalendar(payload, prev.nightsFilter)
  }, [refreshCalendar])

  const selectAirport = useCallback(async (iata: string) => {
    const prev = ref.current
    const payload: BookingPayload = { ...prev.payload, departureAirports: [iata], products: undefined }
    await refreshCalendar(payload, prev.nightsFilter)
  }, [refreshCalendar])

  const selectPackageGroup = useCallback(async (id: string) => {
    const prev = ref.current
    const payload: BookingPayload = { ...prev.payload, packageGroup: id, products: undefined }
    await refreshCalendar(payload, prev.nightsFilter)
  }, [refreshCalendar])

  const selectNightsFilter = useCallback(async (nights: number | null) => {
    const prev = ref.current
    const payload: BookingPayload = { ...prev.payload, products: undefined }
    await refreshCalendar(payload, nights)
  }, [refreshCalendar])

  // Selecting a stay starts a new decision tree: downstream products cleared.
  const selectStay = useCallback(async (date: string, nights: number) => {
    const prev = ref.current
    const payload: BookingPayload = {
      ...prev.payload,
      selectedDate: date,
      nights,
      products: undefined,
      priceSeen: undefined,
      numOfInstalments: undefined,
    }
    patch({
      globalNotice: null,
      accommodations: null, accommodationsKey: null,
      activities: null, activitiesKey: null,
      flights: null, flightsStatus: 'idle', flightsKey: null, flightsPriceChange: null,
      cars: null, carsStatus: 'idle', carsKey: null, carExtras: null,
      checkoutMeta: null,
    })
    await repriceFromDates(payload)
  }, [patch, repriceFromDates])

  const clearStay = useCallback(() => {
    const prev = ref.current
    patch({
      payload: { ...prev.payload, selectedDate: undefined, nights: undefined, products: undefined, priceSeen: undefined },
      receipt: null,
      stayConfirmed: false,
      receiptError: null,
    })
  }, [patch])

  // ---- navigation ----

  const goToStep = useCallback((index: number) => {
    const prev = ref.current
    if (index < 0 || index >= prev.steps.length) return
    if (index > prev.maxReachedIndex) return
    patch({ currentStepIndex: index })
  }, [patch])

  const goBack = useCallback(() => {
    const prev = ref.current
    if (prev.currentStepIndex > 0) patch({ currentStepIndex: prev.currentStepIndex - 1 })
  }, [patch])

  const goNext = useCallback(() => {
    const prev = ref.current
    const next = prev.currentStepIndex + 1
    if (next >= prev.steps.length) return
    patch({ currentStepIndex: next, maxReachedIndex: Math.max(prev.maxReachedIndex, next) })
  }, [patch])

  const confirmDates = useCallback(() => {
    const prev = ref.current
    if (!prev.stayConfirmed || prev.receiptError || prev.receiptLoading) return
    goNext()
  }, [goNext])

  // ---- accommodations ----

  const ensureAccommodations = useCallback(() => {
    const prev = ref.current
    const key = stayKeyOf(prev.payload)
    if (prev.accommodationsLoading || (prev.accommodations && prev.accommodationsKey === key)) return
    patch({ accommodationsLoading: true, accommodations: null, accommodationsKey: key })
    api.fetchAccommodations(prev.payload)
      .then((data) => {
        if (stayKeyOf(ref.current.payload) !== key) return
        patch({ accommodations: data, accommodationsLoading: false })
      })
      .catch(() => {
        patch({ accommodationsLoading: false, accommodations: { accommodations: [] } })
      })
  }, [patch])

  const selectAccommodationProduct = useCallback(async (productId: string) => {
    const prev = ref.current
    const products = replaceProduct(prev.payload.products, { id: productId })
    await repriceDownstream({ ...prev.payload, products })
  }, [repriceDownstream])

  // ---- activities ----

  const ensureActivities = useCallback(() => {
    const prev = ref.current
    const key = stayKeyOf(prev.payload) + JSON.stringify(stripProductsByPrefix(prev.payload.products, 'L:'))
    if (prev.activitiesLoading || (prev.activities && prev.activitiesKey === key)) return
    patch({ activitiesLoading: true, activities: null, activitiesKey: key })
    api.fetchLeisures(prev.payload)
      .then((data) => {
        patch({ activities: data, activitiesLoading: false })
      })
      .catch(() => {
        patch({ activitiesLoading: false, activities: { basePrice: null, leisures: [] } })
      })
  }, [patch])

  const setLeisureSelection = useCallback(async (groupUnitIds: string[], selectedUnitId: string | null) => {
    const prev = ref.current
    const products = replaceLeisureForGroup(prev.payload.products, groupUnitIds, selectedUnitId)
    await repriceDownstream({ ...prev.payload, products })
  }, [repriceDownstream])

  // ---- flights ----

  const ensureFlights = useCallback(() => {
    const prev = ref.current
    const key = stayKeyOf(prev.payload)
    // Terminal per stay: never auto-restart a finished or failed search.
    if (prev.flightsKey === key && prev.flightsStatus !== 'idle') return
    patch({ flightsKey: key, flightsStatus: 'searching', flights: null, flightsPriceChange: null })

    const payload = ref.current.payload
    const totalBefore = ref.current.receipt?.totalPrice ?? null

    async function run() {
      try {
        await api.runTaskGroup(payload, 'FLIGHT_SEARCH')
        if (stayKeyOf(ref.current.payload) !== key) return
        patch({ flightsStatus: 'validating' })
        await api.runTaskGroup(payload, 'FLIGHT_PRICE_VALIDATION')
        if (stayKeyOf(ref.current.payload) !== key) return
        patch({ flightsStatus: 'pricing' })
        const flights = await api.fetchFlights(payload)
        if (stayKeyOf(ref.current.payload) !== key) return
        if (!flights.length) {
          patch({ flightsStatus: 'noresults' })
          return
        }
        // Re-fetch the receipt for the unchanged payload and surface any change.
        let priceChange: number | null = null
        try {
          const r = await api.fetchReceipt(ref.current.payload)
          if (!r.errors.length) {
            if (totalBefore != null && r.totalPrice != null) priceChange = r.totalPrice - totalBefore
            patch({ receipt: r, payload: { ...ref.current.payload, priceSeen: r.totalPrice ?? undefined } })
          }
        } catch {
          // keep the previous receipt visible
        }
        patch({ flights, flightsStatus: 'ready', flightsPriceChange: priceChange && priceChange !== 0 ? priceChange : null })
      } catch {
        if (stayKeyOf(ref.current.payload) === key) patch({ flightsStatus: 'noresults' })
      }
    }
    run()
  }, [patch])

  const selectFlight = useCallback(async (flightId: string) => {
    const prev = ref.current
    const products = replaceProduct(prev.payload.products, { id: flightId })
    await repriceDownstream({ ...prev.payload, products })
  }, [repriceDownstream])

  // ---- cars ----

  const ensureCars = useCallback(() => {
    const prev = ref.current
    const key = stayKeyOf(prev.payload)
    if (prev.carsKey === key && prev.carsStatus !== 'idle') return
    patch({ carsKey: key, carsStatus: 'searching', cars: null, carExtras: null })

    const payload = ref.current.payload

    async function run() {
      try {
        await api.runTaskGroup(payload, 'CAR_SEARCH')
        if (stayKeyOf(ref.current.payload) !== key) return
        const data = await api.fetchCars(payload)
        if (stayKeyOf(ref.current.payload) !== key) return
        if (!data.cars.length) {
          patch({ carsStatus: 'noresults' })
          return
        }
        patch({ cars: data, carsStatus: 'ready' })
        // Load extras for the already-selected car (payload first, then backend default).
        const current = ref.current
        const selectedId =
          getSelectedProductId(current.payload.products, 'C:') ??
          data.cars.find((c) => c.selected)?.id ??
          null
        if (selectedId) {
          patch({ carExtrasLoading: true })
          try {
            const extras = await api.fetchCarExtras(payload.sessionId, selectedId)
            patch({ carExtras: extras, carExtrasLoading: false })
          } catch {
            patch({ carExtrasLoading: false })
          }
        }
      } catch {
        if (stayKeyOf(ref.current.payload) === key) patch({ carsStatus: 'noresults' })
      }
    }
    run()
  }, [patch])

  const selectCar = useCallback(async (carId: string) => {
    const prev = ref.current
    const products = replaceProduct(prev.payload.products, { id: carId })
    patch({ carExtras: null, carExtrasLoading: true })
    const ok = await repriceDownstream({ ...prev.payload, products })
    if (!ok) {
      patch({ carExtrasLoading: false })
      return
    }
    try {
      const extras = await api.fetchCarExtras(prev.payload.sessionId, carId)
      patch({ carExtras: extras, carExtrasLoading: false })
    } catch {
      patch({ carExtrasLoading: false })
    }
  }, [patch, repriceDownstream])

  const toggleCarExtra = useCallback(async (extraId: string) => {
    const prev = ref.current
    const carId = getSelectedProductId(prev.payload.products, 'C:')
    if (!carId) return
    const products = (prev.payload.products ?? []).map((p) => {
      if (p.id !== carId) return p
      const options = p.options ?? []
      const has = options.some((o) => o.id === extraId)
      return { ...p, options: has ? options.filter((o) => o.id !== extraId) : [...options, { id: extraId }] }
    })
    await repriceDownstream({ ...prev.payload, products })
  }, [repriceDownstream])

  // ---- checkout ----

  const ensureCheckoutMeta = useCallback(() => {
    const prev = ref.current
    if (prev.checkoutMeta || prev.checkoutMetaLoading) return
    patch({ checkoutMetaLoading: true })
    Promise.all([
      api.fetchCheckoutMeta(prev.payload),
      api.fetchReceipt(prev.payload).catch(() => null),
    ])
      .then(([meta, receipt]) => {
        const p: Patch = { checkoutMeta: meta, checkoutMetaLoading: false }
        if (receipt && !receipt.errors.length) p.receipt = receipt
        patch(p)
      })
      .catch(() => patch({ checkoutMetaLoading: false }))
  }, [patch])

  const setInstalments = useCallback(async (n: number) => {
    const prev = ref.current
    await repriceDownstream({ ...prev.payload, numOfInstalments: n })
  }, [repriceDownstream])

  const updateLeadCustomer = useCallback((fields: Record<string, string>) => {
    const prev = ref.current
    const people = [...prev.payload.people]
    people[0] = { ...people[0], ...fields }
    patch({ payload: { ...prev.payload, people } })
  }, [patch])

  const updateParticipant = useCallback((index: number, fields: Record<string, string>) => {
    const prev = ref.current
    const people = [...prev.payload.people]
    if (!people[index]) return
    people[index] = { ...people[index], ...fields }
    patch({ payload: { ...prev.payload, people } })
  }, [patch])

  const submitOrder = useCallback(async (paymentMethod: string | null): Promise<{ ok: boolean; message?: string }> => {
    const prev = ref.current
    const totalPrice = prev.receipt?.totalPrice
    if (totalPrice == null) return { ok: false, message: 'No valid price is available for this booking.' }
    try {
      const result = await api.createOrder(prev.payload, {
        paymentMethod,
        totalPrice,
        restoreUrl: typeof window !== 'undefined' ? window.location.href : '',
      })
      if (result.errors.length) {
        return { ok: false, message: result.errors[0]?.message || 'Your booking could not be completed.' }
      }
      if (result.continueUrl) {
        window.location.assign(result.continueUrl)
        return { ok: true }
      }
      return { ok: false, message: 'No payment continuation was returned. Please try again.' }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Your booking could not be completed.' }
    }
  }, [])

  const actions = useMemo<FlowActions>(() => ({
    commitOccupancy, selectAirport, selectPackageGroup, selectNightsFilter,
    selectStay, clearStay, confirmDates,
    goToStep, goBack, goNext, resetToDates,
    ensureAccommodations, selectAccommodationProduct,
    ensureActivities, setLeisureSelection,
    ensureFlights, selectFlight,
    ensureCars, selectCar, toggleCarExtra,
    ensureCheckoutMeta, setInstalments, updateLeadCustomer, updateParticipant, submitOrder,
  }), [
    commitOccupancy, selectAirport, selectPackageGroup, selectNightsFilter,
    selectStay, clearStay, confirmDates,
    goToStep, goBack, goNext, resetToDates,
    ensureAccommodations, selectAccommodationProduct,
    ensureActivities, setLeisureSelection,
    ensureFlights, selectFlight,
    ensureCars, selectCar, toggleCarExtra,
    ensureCheckoutMeta, setInstalments, updateLeadCustomer, updateParticipant, submitOrder,
  ])

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  )
}

function initialState(offerId: string): FlowState {
  const people = buildPeople(2, [])
  return {
    offerId,
    bootStatus: 'loading',
    bootError: null,
    payload: { offerId, sessionId: '', people, groups: buildGroups(people) },
    offerMeta: null,
    steps: [],
    currentStepIndex: 0,
    maxReachedIndex: 0,
    nightsFilter: null,
    calendar: null,
    calendarLoading: false,
    receipt: null,
    receiptLoading: false,
    receiptError: null,
    stayConfirmed: false,
    accommodations: null,
    accommodationsLoading: false,
    accommodationsKey: null,
    activities: null,
    activitiesLoading: false,
    activitiesKey: null,
    flightsStatus: 'idle',
    flights: null,
    flightsPriceChange: null,
    flightsKey: null,
    carsStatus: 'idle',
    cars: null,
    carsKey: null,
    carExtras: null,
    carExtrasLoading: false,
    checkoutMeta: null,
    checkoutMetaLoading: false,
    globalNotice: null,
  }
}
