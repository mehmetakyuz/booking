'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import {
  Activity as ActivityIcon,
  BedDouble,
  Building2,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Menu,
  Plane,
  ReceiptText,
  Users,
  Wifi,
  X,
} from 'lucide-react'
import {
  Accommodation,
  Activity,
  BookingPayload,
  CalendarData,
  Car,
  CarExtra,
  CheckoutData,
  Flight,
  Offer,
  Receipt,
  StepId,
  bootstrapBooking,
  buildSteps,
  decodeSnapshot,
  encodeSnapshot,
  fetchAccommodations,
  fetchActivities,
  fetchCalendar,
  fetchCarExtras,
  fetchCars,
  fetchCheckout,
  fetchFlights,
  fetchReceipt,
  money,
  peopleFromTravellers,
  publicPayloadSnapshot,
  replaceProductFamily,
  submitOrder,
} from '@/lib/booking'

type LoadState = 'idle' | 'loading' | 'error'

type BookingState = {
  offer: Offer | null
  payload: BookingPayload | null
  calendar: CalendarData | null
  receipt: Receipt | null
  lastValidStay: BookingPayload | null
  currentStep: StepId
  travellers: { adults: number; childrenAges: number[] }
  accommodations: Accommodation[]
  activities: Activity[]
  activityBasePrice: number
  flights: Flight[]
  cars: Car[]
  carExtras: Record<string, CarExtra[]>
  checkout: CheckoutData | null
  checkoutForm: Record<string, string>
  completed: StepId[]
}

type ModalState =
  | { kind: 'hotel'; hotel: Accommodation }
  | { kind: 'activity'; activity: Activity }
  | { kind: 'flight'; flight: Flight }
  | { kind: 'itinerary' }
  | { kind: 'info'; title: string; content: string }
  | null

const STEP_COPY: Record<StepId, string> = {
  dates: 'Choose travellers, travel style and stay dates.',
  rooms: 'Choose the stay option that fits your trip.',
  activities: 'Review included experiences and add optional activities.',
  flights: 'Choose flights for this package.',
  cars: 'Choose car hire and any useful extras.',
  checkout: 'Enter passenger details and payment preferences.',
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  GROUP_TOUR: 'Group tour',
  PRIVATE_TOUR: 'Private tour',
  SELF_GUIDED: 'Self-guided',
}

export function BookingClient({ offerId }: { offerId: string }) {
  const [state, setState] = useState<BookingState>({
    offer: null,
    payload: null,
    calendar: null,
    receipt: null,
    lastValidStay: null,
    currentStep: 'dates',
    travellers: { adults: 2, childrenAges: [] },
    accommodations: [],
    activities: [],
    activityBasePrice: 0,
    flights: [],
    cars: [],
    carExtras: {},
    checkout: null,
    checkoutForm: {},
    completed: [],
  })
  const [bootStatus, setBootStatus] = useState<LoadState>('loading')
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [panelLoading, setPanelLoading] = useState<Partial<Record<StepId, string>>>({})
  const [panelLoaded, setPanelLoaded] = useState<Partial<Record<StepId, boolean>>>({})
  const [error, setError] = useState('')
  const [mobileStepsOpen, setMobileStepsOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)

  const offer = state.offer
  const payload = state.payload
  const calendar = state.calendar
  const receipt = state.receipt
  const steps = useMemo(() => (offer ? buildSteps(offer) : []), [offer])
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === state.currentStep))
  const activeStep = steps[activeIndex]
  const nextStep = steps[activeIndex + 1]

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setBootStatus('loading')
      setError('')
      try {
        const params = new URLSearchParams(window.location.search)
        const snapshot = decodeSnapshot(params.get('state'))
        const boot = await bootstrapBooking(offerId, snapshot)
        if (cancelled) return
        const adults = Math.max(2, (boot.payload.people ?? []).filter((person) => person.type !== 'child').length || 2)
        const childrenAges = (boot.payload.people ?? []).filter((person) => person.type === 'child').map((person) => person.age ?? 8)
        setState((prev) => ({
          ...prev,
          offer: boot.offer,
          calendar: boot.calendar,
          payload: boot.payload,
          currentStep: boot.step,
          travellers: { adults, childrenAges },
        }))
        setBootStatus('idle')
        if (boot.payload.selectedDate && typeof boot.payload.nights === 'number') {
          void reprice(boot.payload, { preserveValidStay: true })
        }
      } catch (err) {
        if (cancelled) return
        setBootStatus('error')
        setError(err instanceof Error ? err.message : 'Unable to load the offer.')
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [offerId])

  useEffect(() => {
    if (!payload) return
    const token = encodeSnapshot({
      step: state.currentStep,
      payload: publicPayloadSnapshot(payload),
      checkout: state.checkoutForm,
    })
    const url = new URL(window.location.href)
    url.searchParams.set('state', token)
    window.history.replaceState(null, '', url)
  }, [payload, state.currentStep, state.checkoutForm])

  useEffect(() => {
    if (!payload || !offer || !payload.selectedDate || typeof payload.nights !== 'number') return
    if (state.currentStep === 'rooms' && state.accommodations.length === 0 && !panelLoading.rooms && !panelLoaded.rooms) {
      void loadRooms(payload)
    }
    if (state.currentStep === 'activities' && state.activities.length === 0 && !panelLoading.activities && !panelLoaded.activities) {
      void loadActivities(payload)
    }
    if (state.currentStep === 'flights' && state.flights.length === 0 && !panelLoading.flights && !panelLoaded.flights) {
      void loadFlights(payload)
    }
    if (state.currentStep === 'cars' && state.cars.length === 0 && !panelLoading.cars && !panelLoaded.cars) {
      void loadCars(payload)
    }
    if (state.currentStep === 'checkout' && !state.checkout && !panelLoading.checkout && !panelLoaded.checkout) {
      void loadCheckout(payload)
    }
  }, [state.currentStep, payload, offer, state.accommodations.length, state.activities.length, state.flights.length, state.cars.length, state.checkout, panelLoading, panelLoaded])

  async function reprice(nextPayload: BookingPayload, options?: { preserveValidStay?: boolean; rollbackOnError?: boolean }) {
    setReceiptLoading(true)
    setError('')
    try {
      const nextReceipt = await fetchReceipt(nextPayload)
      if (nextReceipt.errors.length) {
        setState((prev) => ({
          ...prev,
          payload: options?.rollbackOnError && prev.lastValidStay ? prev.lastValidStay : nextPayload,
          receipt: nextReceipt,
        }))
        return nextReceipt
      }
      setState((prev) => ({
        ...prev,
        payload: nextPayload,
        receipt: nextReceipt,
        lastValidStay: options?.preserveValidStay ? nextPayload : prev.lastValidStay ?? nextPayload,
      }))
      return nextReceipt
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update pricing.')
      throw err
    } finally {
      setReceiptLoading(false)
    }
  }

  async function refreshCalendar(nextPayload: BookingPayload, keepDate = false) {
    setCalendarLoading(true)
    setError('')
    try {
      const nextCalendar = await fetchCalendar(nextPayload)
      const reconciled = reconcilePayloadToCalendar(
        {
          ...nextPayload,
          selectedDate: keepDate ? nextPayload.selectedDate : undefined,
          products: keepDate ? nextPayload.products : [],
        },
        nextCalendar,
      )
      setState((prev) => ({ ...prev, calendar: nextCalendar, payload: reconciled, receipt: keepDate ? prev.receipt : null }))
      if (!keepDate) {
        setPanelLoaded({})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh dates.')
    } finally {
      setCalendarLoading(false)
    }
  }

  async function selectStay(date: string, nights: number) {
    if (!payload) return
    const nextPayload = { ...payload, selectedDate: date, nights, products: [] }
    const nextReceipt = await reprice(nextPayload, { preserveValidStay: true, rollbackOnError: true })
    if (nextReceipt?.errors.length) return
    setState((prev) => ({
      ...prev,
      accommodations: [],
      activities: [],
      flights: [],
      cars: [],
      carExtras: {},
      checkout: null,
      lastValidStay: nextPayload,
    }))
    setPanelLoaded({})
  }

  async function selectProducts(prefixes: string[], products: Array<{ id: string; group?: number }>) {
    if (!payload) return
    const nextPayload = { ...payload, products: replaceProductFamily(payload.products, prefixes, products) }
    await reprice(nextPayload)
  }

  function goToStep(stepId: StepId) {
    setState((prev) => ({ ...prev, currentStep: stepId }))
    setMobileStepsOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goNext() {
    if (!activeStep) return
    if (activeStep.id === 'dates' && (!receipt || receipt.errors.length || !payload?.selectedDate || typeof payload.nights !== 'number')) return
    setState((prev) => ({
      ...prev,
      completed: prev.completed.includes(activeStep.id) ? prev.completed : [...prev.completed, activeStep.id],
      currentStep: nextStep?.id ?? prev.currentStep,
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    const previous = steps[activeIndex - 1]
    if (previous) goToStep(previous.id)
  }

  async function loadRooms(sourcePayload: BookingPayload) {
    setPanelLoaded((prev) => ({ ...prev, rooms: false }))
    setPanelLoading((prev) => ({ ...prev, rooms: 'Loading rooms' }))
    try {
      const rooms = await fetchAccommodations(sourcePayload)
      setState((prev) => ({ ...prev, accommodations: rooms }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load rooms.')
    } finally {
      setPanelLoaded((prev) => ({ ...prev, rooms: true }))
      setPanelLoading((prev) => ({ ...prev, rooms: undefined }))
    }
  }

  async function loadActivities(sourcePayload: BookingPayload) {
    setPanelLoaded((prev) => ({ ...prev, activities: false }))
    setPanelLoading((prev) => ({ ...prev, activities: 'Loading activities' }))
    try {
      const result = await fetchActivities(sourcePayload)
      setState((prev) => ({ ...prev, activities: result.activities, activityBasePrice: result.basePrice }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load activities.')
    } finally {
      setPanelLoaded((prev) => ({ ...prev, activities: true }))
      setPanelLoading((prev) => ({ ...prev, activities: undefined }))
    }
  }

  async function loadFlights(sourcePayload: BookingPayload) {
    const previousTotal = state.receipt?.totalPrice
    setPanelLoaded((prev) => ({ ...prev, flights: false }))
    setPanelLoading((prev) => ({ ...prev, flights: 'Searching flights' }))
    try {
      const flights = await fetchFlights(sourcePayload, (stage) => {
        setPanelLoading((prev) => ({ ...prev, flights: stage === 'searching' ? 'Searching flights' : 'Validating flight prices' }))
      })
      const freshReceipt = await fetchReceipt(sourcePayload)
      setState((prev) => ({
        ...prev,
        flights,
        receipt: freshReceipt,
        checkoutForm: {
          ...prev.checkoutForm,
          flightPriceNotice:
            previousTotal && freshReceipt.totalPrice !== previousTotal
              ? `${freshReceipt.totalPrice > previousTotal ? 'The package total increased' : 'The package total decreased'} by ${money(Math.abs(freshReceipt.totalPrice - previousTotal), prev.offer?.currency)} after flight validation.`
              : '',
        },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No flights are available for this stay.')
    } finally {
      setPanelLoaded((prev) => ({ ...prev, flights: true }))
      setPanelLoading((prev) => ({ ...prev, flights: undefined }))
    }
  }

  async function loadCars(sourcePayload: BookingPayload) {
    setPanelLoaded((prev) => ({ ...prev, cars: false }))
    setPanelLoading((prev) => ({ ...prev, cars: 'Searching car hire' }))
    try {
      const cars = await fetchCars(sourcePayload)
      setState((prev) => ({ ...prev, cars }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No car-hire options are available for this stay.')
    } finally {
      setPanelLoaded((prev) => ({ ...prev, cars: true }))
      setPanelLoading((prev) => ({ ...prev, cars: undefined }))
    }
  }

  async function loadCheckout(sourcePayload: BookingPayload) {
    setPanelLoaded((prev) => ({ ...prev, checkout: false }))
    setPanelLoading((prev) => ({ ...prev, checkout: 'Loading checkout' }))
    try {
      const [checkout, latestReceipt] = await Promise.all([fetchCheckout(sourcePayload), fetchReceipt(sourcePayload)])
      const defaultPayment = checkout.paymentMethods.find((method: CheckoutData['paymentMethods'][number]) => method.default) ?? checkout.paymentMethods[0]
      setState((prev) => ({
        ...prev,
        checkout,
        receipt: latestReceipt,
        checkoutForm: { ...prev.checkoutForm, paymentMethodId: prev.checkoutForm.paymentMethodId || defaultPayment?.id || '' },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load checkout.')
    } finally {
      setPanelLoaded((prev) => ({ ...prev, checkout: true }))
      setPanelLoading((prev) => ({ ...prev, checkout: undefined }))
    }
  }

  async function updateInstalments(count: number) {
    if (!payload) return
    const nextPayload = { ...payload, numOfInstalments: count }
    await reprice(nextPayload)
  }

  async function handleSubmitOrder() {
    if (!payload || !receipt) return
    setPanelLoading((prev) => ({ ...prev, checkout: 'Creating order' }))
    try {
      const url = await submitOrder(payload, receipt, state.checkoutForm, window.location.href)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue to payment.')
    } finally {
      setPanelLoading((prev) => ({ ...prev, checkout: undefined }))
    }
  }

  if (bootStatus === 'loading') {
    return <FullPageStatus title="Loading booking" message="Fetching live availability and prices." />
  }

  if (bootStatus === 'error' || !offer || !payload || !calendar) {
    return <FullPageStatus title="Unable to load booking" message={error || 'Refresh the page to try again.'} />
  }

  return (
    <div className="booking-app">
      <header className="top-rail">
        <div className="rail-inner">
          <a className="logo-wrap" href="/">
            <img src="/logo-light.svg" alt="Secret Escapes" />
          </a>
          <button className="mobile-step-trigger" onClick={() => setMobileStepsOpen((open) => !open)}>
            <Menu size={18} />
            Step {activeIndex + 1}. {activeStep?.label}
          </button>
          <nav className={clsx('steps-nav', mobileStepsOpen && 'open')} aria-label="Booking steps">
            {steps.map((step, index) => {
              const completed = state.completed.includes(step.id) || index < activeIndex
              return (
                <button
                  key={step.id}
                  className={clsx('step-tab', step.id === state.currentStep && 'active', completed && 'complete')}
                  disabled={!completed && step.id !== state.currentStep}
                  onClick={() => completed && goToStep(step.id)}
                >
                  {index + 1}. {step.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="booking-shell">
        <section className="step-panel">
          <div className="step-heading">
            <p className="eyebrow">Step {activeIndex + 1}</p>
            <h1>{activeStep?.label}</h1>
            <p>{activeStep ? STEP_COPY[activeStep.id] : ''}</p>
          </div>

          {error && (
            <div className="alert">
              <strong>We could not complete that action.</strong>
              <span>{error}</span>
            </div>
          )}

          {state.currentStep === 'dates' && (
            <DatesStep
              offer={offer}
              payload={payload}
              calendar={calendar}
              travellers={state.travellers}
              loading={calendarLoading}
              receiptLoading={receiptLoading}
              onTravellers={(travellers) => {
                const peoplePatch = peopleFromTravellers(travellers.adults, travellers.childrenAges)
                setState((prev) => ({ ...prev, travellers }))
                void refreshCalendar({ ...payload, ...peoplePatch, products: [], selectedDate: undefined }, false)
              }}
              onAirport={(code) => refreshCalendar({ ...payload, departureAirports: [code], products: [], selectedDate: undefined }, false)}
              onPackage={(id) => refreshCalendar({ ...payload, packageGroup: id, products: [], selectedDate: undefined }, false)}
              onNights={(nights) =>
                refreshCalendar(
                  {
                    ...payload,
                    nightsFilter: nights,
                    nights: nights === null ? undefined : nights,
                    products: [],
                    selectedDate: undefined,
                  },
                  false,
                )
              }
              onStay={selectStay}
            />
          )}

          {state.currentStep === 'rooms' && (
            <RoomsStep
              offer={offer}
              payload={payload}
              accommodations={state.accommodations}
              receipt={receipt}
              loading={panelLoading.rooms}
              onSelect={selectProducts}
              onDetails={(hotel) => setModal({ kind: 'hotel', hotel })}
            />
          )}

          {state.currentStep === 'activities' && (
            <ActivitiesStep
              offer={offer}
              payload={payload}
              activities={state.activities}
              basePrice={state.activityBasePrice}
              receipt={receipt}
              loading={panelLoading.activities}
              onSelect={selectProducts}
              onDetails={(activity) => setModal({ kind: 'activity', activity })}
            />
          )}

          {state.currentStep === 'flights' && (
            <FlightsStep
              offer={offer}
              payload={payload}
              flights={state.flights}
              receipt={receipt}
              loading={panelLoading.flights}
              notice={state.checkoutForm.flightPriceNotice}
              onSelect={selectProducts}
              onDetails={(flight) => setModal({ kind: 'flight', flight })}
              onReset={() => goToStep('dates')}
            />
          )}

          {state.currentStep === 'cars' && (
            <CarsStep
              offer={offer}
              payload={payload}
              cars={state.cars}
              extras={state.carExtras}
              receipt={receipt}
              loading={panelLoading.cars}
              onSelect={async (carId) => {
                await selectProducts(['C:', 'CE:'], [{ id: carId }])
                const extras = await fetchCarExtras(payload, carId)
                setState((prev) => ({ ...prev, carExtras: { ...prev.carExtras, [carId]: extras } }))
              }}
              onExtra={selectProducts}
              onReset={() => goToStep('dates')}
            />
          )}

          {state.currentStep === 'checkout' && (
            <CheckoutStep
              checkout={state.checkout}
              form={state.checkoutForm}
              receipt={receipt}
              payload={payload}
              offer={offer}
              loading={panelLoading.checkout}
              onForm={(patch) => setState((prev) => ({ ...prev, checkoutForm: { ...prev.checkoutForm, ...patch } }))}
              onInstalments={updateInstalments}
              onSubmit={handleSubmitOrder}
            />
          )}

          <div className="step-footer">
            {activeIndex > 0 && (
              <button className="button button-secondary" onClick={goBack}>
                Back
              </button>
            )}
            {state.currentStep !== 'checkout' && (
              <button
                className="button button-primary"
                onClick={goNext}
                disabled={state.currentStep === 'dates' && (!receipt || receipt.errors.length > 0 || receiptLoading)}
              >
                {nextStep ? `Step ${activeIndex + 2}. ${nextStep.label}` : 'Continue'}
              </button>
            )}
          </div>
        </section>

        <aside className="summary-column">
          <ReceiptPanel
            offer={offer}
            payload={payload}
            receipt={receipt}
            loading={receiptLoading}
            onItinerary={() => setModal({ kind: 'itinerary' })}
            onInfo={(title, content) => setModal({ kind: 'info', title, content })}
          />
        </aside>
      </main>

      <button className="mobile-summary-bar" onClick={() => setSummaryOpen(true)}>
        <ReceiptText size={18} />
        <span>Summary</span>
        <strong>{receipt ? money(receipt.totalPrice, offer.currency) : money(offer.price, offer.currency)}</strong>
      </button>

      {summaryOpen && (
        <div className="drawer-backdrop" onClick={() => setSummaryOpen(false)}>
          <div className="summary-drawer" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSummaryOpen(false)} aria-label="Close summary">
              <X size={18} />
            </button>
            <ReceiptPanel offer={offer} payload={payload} receipt={receipt} loading={receiptLoading} onItinerary={() => setModal({ kind: 'itinerary' })} onInfo={(title, content) => setModal({ kind: 'info', title, content })} />
          </div>
        </div>
      )}

      <DetailModal modal={modal} receipt={receipt} onClose={() => setModal(null)} />
    </div>
  )
}

function DatesStep({
  offer,
  payload,
  calendar,
  travellers,
  loading,
  receiptLoading,
  onTravellers,
  onAirport,
  onPackage,
  onNights,
  onStay,
}: {
  offer: Offer
  payload: BookingPayload
  calendar: CalendarData
  travellers: { adults: number; childrenAges: number[] }
  loading: boolean
  receiptLoading: boolean
  onTravellers: (travellers: { adults: number; childrenAges: number[] }) => void
  onAirport: (code: string) => void
  onPackage: (id: string) => void
  onNights: (nights: number | null) => void
  onStay: (date: string, nights: number) => void
}) {
  const [occupancyOpen, setOccupancyOpen] = useState(false)
  const [airportOpen, setAirportOpen] = useState(false)
  const [draft, setDraft] = useState(travellers)
  const [month, setMonth] = useState(0)
  const [flexStart, setFlexStart] = useState<string | null>(null)

  const selectedAirport = calendar.airports.find((airport) => airport.code === payload.departureAirports?.[0]) ?? calendar.airports[0]
  const monthDates = useMemo(() => {
    const groups = Array.from(new Set(calendar.dates.map((date) => date.date.slice(0, 7)))).sort()
    const key = groups[Math.min(month, Math.max(0, groups.length - 1))]
    return { key, dates: calendar.dates.filter((date) => date.date.startsWith(key)) }
  }, [calendar.dates, month])

  const selectedDate = calendar.dates.find((date) => date.date === payload.selectedDate)
  const selectedNightsFilter = payload.nightsFilter !== undefined ? payload.nightsFilter : payload.nights
  const flexibleMode = selectedNightsFilter == null
  const flexStartDate = calendar.dates.find((date) => date.date === flexStart)

  useEffect(() => {
    setFlexStart(null)
  }, [selectedNightsFilter, payload.departureAirports?.[0], payload.packageGroup])

  return (
    <div className={clsx('dates-step', loading && 'panel-busy')}>
      <div className="filter-grid">
        <div className="dropdown">
          <button className="field-button" onClick={() => setOccupancyOpen((open) => !open)}>
            <Users size={18} />
            {travellers.adults} {travellers.adults === 1 ? 'adult' : 'adults'}
            {travellers.childrenAges.length ? `, ${travellers.childrenAges.length} children` : ''}
            <ChevronDown size={16} />
          </button>
          {occupancyOpen && (
            <div className="dropdown-panel occupancy-panel">
              <Stepper label="Adults" value={draft.adults} min={Math.max(1, offer.occupancyRules.minAdults)} max={offer.occupancyRules.maxAdults || 8} onChange={(adults) => setDraft((prev) => ({ ...prev, adults }))} />
              <Stepper
                label="Children"
                value={draft.childrenAges.length}
                min={offer.occupancyRules.minChildren ?? 0}
                max={offer.occupancyRules.maxChildren ?? 4}
                onChange={(count) =>
                  setDraft((prev) => ({
                    ...prev,
                    childrenAges: Array.from({ length: count }, (_, index) => prev.childrenAges[index] ?? Math.max(offer.occupancyRules.minChildAge ?? 2, 8)),
                  }))
                }
              />
              {draft.childrenAges.map((age, index) => (
                <label className="age-row" key={index}>
                  Child {index + 1} age
                  <select
                    value={age}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        childrenAges: prev.childrenAges.map((item, ageIndex) => (ageIndex === index ? Number(event.target.value) : item)),
                      }))
                    }
                  >
                    {Array.from({ length: (offer.occupancyRules.maxChildAge ?? 17) - (offer.occupancyRules.minChildAge ?? 2) + 1 }, (_, ageIndex) => (offer.occupancyRules.minChildAge ?? 2) + ageIndex).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button
                className="button button-primary button-small"
                onClick={() => {
                  setOccupancyOpen(false)
                  onTravellers(draft)
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="dropdown">
          <button className="field-button" onClick={() => setAirportOpen((open) => !open)}>
            <Plane size={18} />
            {selectedAirport ? `${selectedAirport.city} (${selectedAirport.code})` : 'Departure airport'}
            <ChevronDown size={16} />
          </button>
          {airportOpen && (
            <div className="dropdown-panel">
              {calendar.airports.map((airport) => (
                <button
                  key={airport.code}
                  className={clsx('dropdown-option', airport.code === selectedAirport?.code && 'selected')}
                  onClick={() => {
                    setAirportOpen(false)
                    onAirport(airport.code)
                  }}
                >
                  <span>{airport.city} ({airport.code})</span>
                  <small>{money(airport.price, offer.currency, true)}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {calendar.packageGroups.length > 0 && (
        <div className="section-block">
          <h2>Package style</h2>
          <div className="package-grid">
            {calendar.packageGroups.map((group) => (
              <button key={group.id} className={clsx('package-card', group.id === (payload.packageGroup ?? '') && 'selected')} onClick={() => onPackage(group.id)}>
                {group.imageUrl && <img src={group.imageUrl} alt="" />}
                <span>{group.name || 'All packages'}</span>
                <strong>{money(group.price, offer.currency, true)}</strong>
                {group.description && <small>{stripMarkdown(group.description)}</small>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="section-block">
        <h2>Length of stay</h2>
        <div className="chip-row">
          {calendar.nights.map((night) => (
            <button
              key={String(night.nights)}
              className={clsx('chip', selectedNightsFilter === night.nights && 'selected')}
              onClick={() => onNights(night.nights)}
            >
              {night.nights == null ? 'All nights' : `${night.nights} nights`}
              <span>{money(night.price, offer.currency, true)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section-block">
        <div className="calendar-head">
          <button className="icon-button" onClick={() => setMonth((value) => Math.max(0, value - 1))} disabled={month === 0}>
            <ChevronLeft size={18} />
          </button>
          <h2>{formatMonth(monthDates.key)}</h2>
          <button className="icon-button" onClick={() => setMonth((value) => value + 1)} disabled={!calendar.dates.some((date) => date.date.startsWith(nextMonthKey(monthDates.key)))}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="calendar-grid" onClick={(event) => event.currentTarget === event.target && setFlexStart(null)}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div className="weekday" key={day}>
              {day}
            </div>
          ))}
          {calendarCells(monthDates.key, monthDates.dates).map((cell, index) => {
            if (!cell) return <div key={index} className="calendar-empty" />
            const unavailable = !cell.quantity || (typeof selectedNightsFilter === 'number' && !cell.nights.some((night) => night.nights === selectedNightsFilter))
            const matchingCheckout = flexStartDate?.nights.find((night) => addDays(flexStartDate.date, night.nights) === cell.date)
            const selected = payload.selectedDate === cell.date || flexStart === cell.date
            return (
              <button
                key={cell.date}
                className={clsx('date-cell', unavailable && !matchingCheckout && 'unavailable', selected && 'selected', matchingCheckout && 'checkout-date')}
                disabled={unavailable && !matchingCheckout}
                title={flexStart === cell.date ? 'Check-in' : matchingCheckout ? 'Check-out' : undefined}
                onClick={() => {
                  if (flexibleMode) {
                    if (!flexStart) {
                      setFlexStart(cell.date)
                      return
                    }
                    if (matchingCheckout) {
                      void onStay(flexStart, matchingCheckout.nights)
                    } else {
                      setFlexStart(cell.date)
                    }
                    return
                  }
                  const chosenNight = selectedNightsFilter
                  if (typeof chosenNight === 'number') void onStay(cell.date, chosenNight)
                }}
              >
                <span>{Number(cell.date.slice(8, 10))}</span>
                <small>{matchingCheckout && flexStartDate ? money(matchingCheckout.price - flexStartDate.price, offer.currency, true) : money(cell.price, offer.currency)}</small>
              </button>
            )
          })}
        </div>
        {flexStart && (
          <button className="text-action" onClick={() => setFlexStart(null)}>
            Clear selection
          </button>
        )}
        <p className="disclaimer">Prices are estimates per person based on your selected travellers, with at least two adults. Included-flight prices may still change during booking.</p>
      </div>

      {(loading || receiptLoading) && (
        <div className="inline-loader">
          <span className="loader-spinner" />
          {loading ? 'Refreshing availability' : 'Updating live price'}
        </div>
      )}
    </div>
  )
}

function RoomsStep({ offer, payload, accommodations, receipt, loading, onSelect, onDetails }: { offer: Offer; payload: BookingPayload; accommodations: Accommodation[]; receipt: Receipt | null; loading?: string; onSelect: (prefixes: string[], products: Array<{ id: string; group?: number }>) => void; onDetails: (hotel: Accommodation) => void }) {
  if (loading) return <PanelLoader label={loading} />
  if (!accommodations.length) return <EmptyState title="No rooms loaded" action="Try another stay from the Dates step." />

  const activeA = payload.products.find((product) => product.id.startsWith('A:'))?.id
  const baseline = defaultAccommodation(accommodations)

  return (
    <div className="option-list">
      {accommodations.map((hotel) => {
        const unit = activeA
          ? hotel.units.find((candidate) => candidate.id === activeA || candidate.boards.some((board) => board.id === activeA))
          : defaultUnit(hotel)
        const chosenUnit = unit ?? defaultUnit(hotel)
        const board = chosenUnit?.boards.find((candidate) => candidate.id === activeA) ?? defaultBoard(chosenUnit)
        const selected =
          Boolean(activeA && chosenUnit && (chosenUnit.id === activeA || chosenUnit.boards.some((candidate) => candidate.id === activeA))) ||
          (!activeA && hotel.id === baseline.hotel?.id)
        return (
          <article className={clsx('option-card', selected && 'selected')} key={hotel.id}>
            {hotel.imageUrl && <img src={hotel.imageUrl} alt="" className="option-media" />}
            <div className="option-body">
              <div className="option-copy">
                <h2>{hotel.name}</h2>
                <p>{hotel.subtitle || hotel.address}</p>
                <p className="truncate">{stripMarkdown(hotel.description)}</p>
                <button className="text-action" onClick={() => onDetails(hotel)}>
                  View hotel details
                </button>
              </div>
              <PriceBlock price={hotel.price} baseline={baseline.price} total={receipt?.totalPrice} currency={offer.currency} selected={selected} />
              <div className="room-config">
                <section className="choice-section">
                  <h3>Room type</h3>
                  <div className="subchoice-grid">
                    {hotel.units.map((room) => (
                      <button
                        key={room.id}
                        className={clsx('subchoice', chosenUnit?.id === room.id && 'selected')}
                        onClick={() => onSelect(['A:'], [{ id: accommodationProductId(room, defaultBoard(room)), group: 0 }])}
                      >
                        <strong>{room.name}</strong>
                        {room.subtitle && <small>{room.subtitle}</small>}
                        <span>{money(room.price - (baseline.unit?.price ?? 0), offer.currency, true)}</span>
                      </button>
                    ))}
                  </div>
                </section>
                {chosenUnit && chosenUnit.boards.length > 0 && (
                  <section className="choice-section">
                    <h3>Meal plan for this room</h3>
                    <div className="subchoice-grid mealplan-grid">
                      {chosenUnit.boards.map((candidate) => {
                        const mealBaseline = defaultBoard(chosenUnit)
                        return (
                          <button
                            key={candidate.id}
                            className={clsx('subchoice', board?.id === candidate.id && 'selected')}
                            onClick={() => onSelect(['A:'], [{ id: accommodationProductId(chosenUnit, candidate), group: 0 }])}
                          >
                            <strong>{candidate.name}</strong>
                            {candidate.description && <small>{stripMarkdown(candidate.description)}</small>}
                            <span>{money(candidate.price - (mealBaseline?.price ?? 0), offer.currency, true)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ActivitiesStep({ offer, payload, activities, basePrice, receipt, loading, onSelect, onDetails }: { offer: Offer; payload: BookingPayload; activities: Activity[]; basePrice: number; receipt: Receipt | null; loading?: string; onSelect: (prefixes: string[], products: Array<{ id: string }>) => void; onDetails: (activity: Activity) => void }) {
  if (loading) return <PanelLoader label={loading} />
  if (!activities.length) return <EmptyState title="No activities available" action="Continue to the next step." />
  const grouped = groupBy(activities, (activity) => activity.optional ? activity.name : activity.parentId)
  const selectedIds = new Set(payload.products.filter((product) => product.id.startsWith('L:')).map((product) => product.id))

  return (
    <div className="option-list">
      {Array.from(grouped.entries()).map(([group, items]) => {
        const optional = items[0]?.optional
        const active = items.find((item) => selectedIds.has(item.id)) ?? items.find((item) => item.selected)
        const keepOtherLeisure = payload.products
          .filter((product) => product.id.startsWith('L:') && !items.some((item) => item.id === product.id))
          .map((product) => ({ id: product.id }))
        return (
          <section className="activity-group" key={group}>
            <div className="group-heading">
              <h2>{items[0]?.name}</h2>
              {optional && (
                <button className={clsx('chip', !active && 'selected')} onClick={() => onSelect(['L:'], keepOtherLeisure)}>
                  No thanks
                </button>
              )}
            </div>
            {items.map((activity) => (
              <article className={clsx('option-card compact', active?.id === activity.id && 'selected')} key={activity.id} onClick={() => onSelect(['L:'], [...keepOtherLeisure, { id: activity.id }])}>
                {activity.imageUrl && <img src={activity.imageUrl} alt="" className="option-media" />}
                <div className="option-body">
                  <div className="option-copy">
                    <h3>{activity.name}</h3>
                    <p>{[activity.date, formatDuration(activity.duration), labelGroupType(activity.groupType)].filter(Boolean).join(' · ')}</p>
                    <p className="truncate">{stripMarkdown(activity.description)}</p>
                    <button className="text-action" onClick={(event) => { event.stopPropagation(); onDetails(activity) }}>
                      View activity details
                    </button>
                  </div>
                  <PriceBlock price={activity.price} baseline={basePrice} total={receipt?.totalPrice} currency={offer.currency} selected={active?.id === activity.id && !optional} />
                </div>
              </article>
            ))}
          </section>
        )
      })}
    </div>
  )
}

function FlightsStep({ offer, payload, flights, receipt, loading, notice, onSelect, onDetails, onReset }: { offer: Offer; payload: BookingPayload; flights: Flight[]; receipt: Receipt | null; loading?: string; notice?: string; onSelect: (prefixes: string[], products: Array<{ id: string }>) => void; onDetails: (flight: Flight) => void; onReset: () => void }) {
  if (loading) return <PanelLoader label={loading} />
  if (!flights.length) return <EmptyState title="No flights available" action="Choose different dates to see other options." onAction={onReset} />
  const selectedId = payload.products.find((product) => product.id.startsWith('F:'))?.id ?? flights.find((flight) => flight.selected)?.id ?? flights[0]?.id
  const baseline = flights.find((flight) => flight.selected) ?? flights[0]
  return (
    <div className="option-list">
      {notice && <div className="notice">{notice}</div>}
      {flights.map((flight) => (
        <article className={clsx('option-card compact', selectedId === flight.id && 'selected')} key={flight.id} onClick={() => onSelect(['F:'], [{ id: flight.id }])}>
          <div className="airline-block">
            {flight.legs[0]?.segments[0]?.logo ? <img src={flight.legs[0].segments[0].logo} alt="" /> : <Plane size={28} />}
            <span>{flight.legs[0]?.segments[0]?.airline ?? 'Flight'}</span>
          </div>
          <div className="option-body">
            <div className="option-copy">
              <h2>{flight.legs.map((leg) => leg.label).join(' / ') || 'Flight option'}</h2>
              {flight.legs.map((leg) => (
                <p key={leg.label}>
                  {leg.label}: {leg.segments[0]?.from} to {leg.segments.at(-1)?.to}
                </p>
              ))}
              <button className="text-action" onClick={(event) => { event.stopPropagation(); onDetails(flight) }}>
                View flight details
              </button>
            </div>
            <PriceBlock price={flight.price} baseline={baseline?.price ?? 0} total={receipt?.totalPrice} currency={offer.currency} selected={flight.id === baseline?.id} />
          </div>
        </article>
      ))}
    </div>
  )
}

function CarsStep({ offer, payload, cars, extras, receipt, loading, onSelect, onExtra, onReset }: { offer: Offer; payload: BookingPayload; cars: Car[]; extras: Record<string, CarExtra[]>; receipt: Receipt | null; loading?: string; onSelect: (id: string) => void; onExtra: (prefixes: string[], products: Array<{ id: string }>) => void; onReset: () => void }) {
  if (loading) return <PanelLoader label={loading} />
  if (!cars.length) return <EmptyState title="No car-hire options available" action="Choose different dates to see other options." onAction={onReset} />
  const selectedCarId = payload.products.find((product) => product.id.startsWith('C:'))?.id ?? cars.find((car) => car.selected)?.id ?? cars[0]?.id
  const selectedExtras = new Set(payload.products.filter((product) => product.id.startsWith('CE:')).map((product) => product.id))
  const baseline = cars.find((car) => car.selected) ?? cars[0]
  return (
    <div className="option-list">
      {cars.map((car) => (
        <article className={clsx('option-card', selectedCarId === car.id && 'selected')} key={car.id}>
          {car.imageUrl && <img src={car.imageUrl} alt="" className="option-media" />}
          <div className="option-body">
            <div className="option-copy">
              <h2>{car.name}</h2>
              <p>{[car.category, car.transmission, car.seats ? `${car.seats} seats` : '', car.airConditioning ? 'Air conditioning' : ''].filter(Boolean).join(' · ')}</p>
              <p>{car.pickup} to {car.dropoff}</p>
              {car.termsUrl && <a className="text-action" href={car.termsUrl} target="_blank">View rental terms</a>}
            </div>
            <PriceBlock price={car.price} baseline={baseline?.price ?? 0} total={receipt?.totalPrice} currency={offer.currency} selected={car.id === baseline?.id} />
            <button className="button button-secondary button-small" onClick={() => onSelect(car.id)}>
              Select car
            </button>
            {selectedCarId === car.id && extras[car.id]?.length > 0 && (
              <div className="extras-grid">
                {extras[car.id].map((extra) => (
                  <button
                    key={extra.id}
                    className={clsx('subchoice', selectedExtras.has(extra.id) && 'selected')}
                    onClick={() => {
                      const activeCar = [{ id: car.id }]
                      const nextExtras = selectedExtras.has(extra.id)
                        ? payload.products.filter((product) => product.id.startsWith('CE:') && product.id !== extra.id).map((product) => ({ id: product.id }))
                        : [...payload.products.filter((product) => product.id.startsWith('CE:')).map((product) => ({ id: product.id })), { id: extra.id }]
                      onExtra(['C:', 'CE:'], [...activeCar, ...nextExtras])
                    }}
                  >
                    <strong>{extra.name}</strong>
                    <span>{money(extra.price, offer.currency, true)}</span>
                    <small>{[extra.extraType, extra.prePayable ? 'Pay now' : 'Pay locally'].filter(Boolean).join(' · ')}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function CheckoutStep({ checkout, form, receipt, payload, offer, loading, onForm, onInstalments, onSubmit }: { checkout: CheckoutData | null; form: Record<string, string>; receipt: Receipt | null; payload: BookingPayload; offer: Offer; loading?: string; onForm: (patch: Record<string, string>) => void; onInstalments: (count: number) => void; onSubmit: () => void }) {
  if (loading && !checkout) return <PanelLoader label={loading} />
  if (!checkout) return <EmptyState title="Checkout is loading" action="Passenger and payment details will appear here." />
  const fields = checkout.fields.length ? checkout.fields : ['firstName', 'lastName', 'email', 'phone']
  const instalments = Array.from({ length: Math.max(1, checkout.maxNrOfInstalments) }, (_, index) => index + 1)
  const schedule = receipt?.instalmentPayments[Math.max(0, (payload.numOfInstalments ?? 1) - 1)] ?? receipt?.instalmentPayments[0] ?? []
  return (
    <div className="checkout-flow">
      <section className="checkout-section">
        <h2>Lead passenger</h2>
        <div className="form-grid">
          {fields.map((field) => (
            <label key={field}>
              {fieldLabel(field)}
              <input value={form[field] ?? ''} type={field === 'email' ? 'email' : 'text'} onChange={(event) => onForm({ [field]: event.target.value })} />
            </label>
          ))}
        </div>
      </section>
      <section className="checkout-section">
        <h2>Payment</h2>
        <div className="payment-grid">
          {checkout.paymentMethods.map((method) => (
            <button key={method.id} className={clsx('payment-card', form.paymentMethodId === method.id && 'selected')} onClick={() => onForm({ paymentMethodId: method.id })}>
              {method.imageUrl && <img src={method.imageUrl} alt="" />}
              <span>{method.name}</span>
            </button>
          ))}
        </div>
        <div className="button-group">
          {instalments.map((count) => (
            <button key={count} className={clsx('chip', payload.numOfInstalments === count && 'selected')} onClick={() => onInstalments(count)}>
              {count === 1 ? 'Pay in full' : `${count} instalments`}
            </button>
          ))}
        </div>
        {schedule.length > 0 && (
          <div className="payment-schedule">
            {schedule.map((row, index) => (
              <div key={`${row.amount}-${row.payBeforeDate ?? index}`}>
                <span>{index === 0 ? 'Due now' : row.payBeforeDate ? `Due ${formatDate(row.payBeforeDate)}` : 'Due later'}</span>
                <strong>{money(row.amount, offer.currency)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="checkout-section markdown">
        <h2>Terms</h2>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{checkout.termsMarkdown || checkout.termsText || 'Please review the booking terms before payment.'}</ReactMarkdown>
        {checkout.euDirectiveText && <div className="directive" dangerouslySetInnerHTML={{ __html: checkout.euDirectiveText }} />}
        <label className="terms-check">
          <input type="checkbox" checked={form.acceptedTerms === 'yes'} onChange={(event) => onForm({ acceptedTerms: event.target.checked ? 'yes' : '' })} />
          I accept the booking terms and conditions.
        </label>
      </section>
      <button className="button button-primary checkout-submit" disabled={loading === 'Creating order' || form.acceptedTerms !== 'yes'} onClick={onSubmit}>
        Confirm and pay
      </button>
    </div>
  )
}

function ReceiptPanel({ offer, payload, receipt, loading, onItinerary, onInfo }: { offer: Offer; payload: BookingPayload; receipt: Receipt | null; loading: boolean; onItinerary: () => void; onInfo: (title: string, content: string) => void }) {
  return (
    <div className={clsx('receipt-surface', loading && 'receipt-loading')}>
      {offer.imageUrl && <img src={offer.imageUrl} alt="" className="receipt-image" />}
      <div className="receipt-content">
        <p className="eyebrow">{offer.location}</p>
        <h2>{offer.shortTitle || offer.title}</h2>
        <div className="summary-actions">
          {offer.informationList.slice(0, 3).map((item) => (
            <button key={item.id} onClick={() => onInfo(item.label || 'Trip information', item.value)}>
              {item.label || 'Details'}
            </button>
          ))}
        </div>
        <div className="date-block">
          <CalendarDays size={18} />
          <div>
            <strong>{receipt?.startDate ? `${formatDate(receipt.startDate)} - ${formatDate(receipt.endDate ?? receipt.startDate)}` : payload.selectedDate ? formatDate(payload.selectedDate) : 'Choose travel dates'}</strong>
            <span>{receipt?.nights ? `${receipt.nights} nights` : typeof payload.nights === 'number' ? `${payload.nights} nights` : 'All nights'}</span>
          </div>
        </div>
        {receipt?.errors.length ? (
          <div className="alert compact">
            {receipt.errors.map((item) => (
              <span key={`${item.code}-${item.message}`}>{item.message}</span>
            ))}
          </div>
        ) : null}
        {receipt?.itinerary.length ? (
          <div className="timeline compact-timeline">
            {receipt.itinerary.slice(0, 3).map((event, index) => (
              <div className="timeline-event" key={`${event.label}-${index}`}>
                <span className="timeline-dot">{iconFor(event.components[0]?.type)}</span>
                <div>
                  <strong>{event.label}</strong>
                  <span>{event.date ? formatDate(event.date) : event.sublabel}</span>
                </div>
              </div>
            ))}
            <button className="text-action" onClick={onItinerary}>View full itinerary</button>
          </div>
        ) : null}
        <div className="price-lines">
          {(receipt?.lines ?? []).slice(0, 5).map((line, index) => (
            <div key={`${line.label}-${index}`}>
              <span>{line.label}</span>
              <strong>{typeof line.amount === 'number' ? money(line.amount, offer.currency) : line.text}</strong>
            </div>
          ))}
        </div>
        <div className="total-row">
          <span>Total</span>
          <strong>{money(receipt?.totalPrice ?? offer.price, offer.currency)}</strong>
        </div>
        {receipt?.perPersonPrice ? <p className="per-person">{money(receipt.perPersonPrice, offer.currency)} per person</p> : null}
      </div>
      {loading && <div className="receipt-overlay"><span className="loader-spinner" /> Updating price</div>}
    </div>
  )
}

function DetailModal({ modal, receipt, onClose }: { modal: ModalState; receipt: Receipt | null; onClose: () => void }) {
  if (!modal) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        {modal.kind === 'hotel' && (
          <>
            <Gallery images={modal.hotel.gallery} />
            <h2>{modal.hotel.name}</h2>
            <p>{stripMarkdown(modal.hotel.description)}</p>
            <div className="facility-grid">
              {modal.hotel.facilities.map((facility) => (
                <span key={`${facility.icon}-${facility.name}`}><FacilityIcon token={facility.icon} /> {facility.name}</span>
              ))}
            </div>
          </>
        )}
        {modal.kind === 'activity' && (
          <>
            <Gallery images={modal.activity.gallery} />
            <h2>{modal.activity.name}</h2>
            <p>{stripMarkdown(modal.activity.description)}</p>
            <p>{[formatDuration(modal.activity.duration), labelGroupType(modal.activity.groupType)].filter(Boolean).join(' · ')}</p>
          </>
        )}
        {modal.kind === 'flight' && (
          <>
            <h2>Flight details</h2>
            {modal.flight.legs.map((leg) => (
              <section className="modal-section" key={leg.label}>
                <h3>{leg.label}</h3>
                {leg.segments.map((segment, index) => (
                  <div className="segment-row" key={`${segment.flightNumber}-${index}`}>
                    <strong>{segment.from} to {segment.to}</strong>
                    <span>{segment.airline} {segment.flightNumber}</span>
                    <span>{formatDateTime(segment.departureAt)} - {formatDateTime(segment.arrivalAt)}</span>
                    <span>{[segment.cabin, segment.luggage].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
              </section>
            ))}
          </>
        )}
        {modal.kind === 'itinerary' && (
          <>
            <h2>Full itinerary</h2>
            <div className="timeline full-timeline">
              {(receipt?.itinerary ?? []).map((event, index) => (
                <div className="timeline-event" key={`${event.label}-${index}`}>
                  <span className="timeline-dot">{iconFor(event.components[0]?.type)}</span>
                  <div>
                    <strong>{event.label}</strong>
                    <span>{event.date ? formatDate(event.date) : event.sublabel}</span>
                    {event.components.map((component, componentIndex) => (
                      <p key={componentIndex}>{[component.accommodationName, component.unitName, component.boardName, component.carModel, component.label].filter(Boolean)[0]}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {modal.kind === 'info' && (
          <>
            <h2>{modal.title}</h2>
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{modal.content}</ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Gallery({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0)
  if (!images.length) return null
  return (
    <div className="gallery">
      <img src={images[index]} alt="" />
      {images.length > 1 && (
        <>
          <button className="gallery-prev" onClick={() => setIndex((value) => (value === 0 ? images.length - 1 : value - 1))}><ChevronLeft size={18} /></button>
          <button className="gallery-next" onClick={() => setIndex((value) => (value + 1) % images.length)}><ChevronRight size={18} /></button>
        </>
      )}
    </div>
  )
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="stepper-row">
      <span>{label}</span>
      <div>
        <button onClick={() => onChange(Math.max(min, value - 1))}>-</button>
        <strong>{value}</strong>
        <button onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  )
}

function PriceBlock({ price, baseline, total, currency, selected }: { price: number; baseline: number; total?: number; currency: string; selected?: boolean }) {
  const delta = price - baseline
  return (
    <div className="price-block">
      <strong>{selected && delta === 0 ? 'Included' : money(delta, currency, true)}</strong>
      {typeof total === 'number' && <span>{money(total + delta, currency)} total</span>}
    </div>
  )
}

function PanelLoader({ label }: { label: string }) {
  return <div className="panel-loader"><span className="loader-spinner" /> {label}</div>
}

function EmptyState({ title, action, onAction }: { title: string; action: string; onAction?: () => void }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{action}</p>
      {onAction && <button className="button button-secondary" onClick={onAction}>Return to Dates</button>}
    </div>
  )
}

function FullPageStatus({ title, message }: { title: string; message: string }) {
  return (
    <main className="landing">
      <div className="landing-card">
        <img src="/logo-light.svg" alt="Secret Escapes" className="landing-logo" />
        <span className="loader-spinner" />
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </main>
  )
}

function reconcilePayloadToCalendar(payload: BookingPayload, calendar: CalendarData): BookingPayload {
  const airport = payload.departureAirports?.[0]
  const validAirport = airport && calendar.airports.some((item) => item.code === airport) ? airport : calendar.airports[0]?.code
  const packageId = payload.packageGroup ?? ''
  const validPackage = calendar.packageGroups.some((item) => item.id === packageId) ? packageId : calendar.packageGroups[0]?.id
  const currentFilter = payload.nightsFilter !== undefined ? payload.nightsFilter : payload.nights
  const validNightsFilter =
    currentFilter !== undefined && calendar.nights.some((item) => item.nights === currentFilter)
      ? currentFilter
      : calendar.nights[0]?.nights
  return {
    ...payload,
    departureAirports: validAirport ? [validAirport] : undefined,
    packageGroup: validPackage,
    nightsFilter: validNightsFilter,
    nights: validNightsFilter === null ? (payload.selectedDate ? payload.nights : undefined) : validNightsFilter,
  }
}

function defaultAccommodation(accommodations: Accommodation[]) {
  const hotel = accommodations.find((item) => item.selected) ?? accommodations.find((item) => item.units.some((unit) => unit.selected)) ?? accommodations[0]
  const unit = hotel ? defaultUnit(hotel) : undefined
  const board = defaultBoard(unit)
  return { hotel, unit, board, price: board?.price ?? unit?.price ?? hotel?.price ?? 0 }
}

function defaultUnit(hotel?: Accommodation) {
  return hotel?.units.find((unit) => unit.selected) ?? hotel?.units[0]
}

function defaultBoard(unit?: Accommodation['units'][number]) {
  return unit?.boards.find((board) => board.selected) ?? unit?.boards[0]
}

function accommodationProductId(unit: Accommodation['units'][number], board?: Accommodation['units'][number]['boards'][number]) {
  return board?.id || unit.id
}

function calendarCells(monthKey: string | undefined, dates: CalendarData['dates']) {
  if (!monthKey) return []
  const [year, month] = monthKey.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const days = new Date(year, month, 0).getDate()
  const offset = (first.getDay() + 6) % 7
  const byDate = new Map(dates.map((date) => [date.date, date]))
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, index) => {
      const date = `${monthKey}-${String(index + 1).padStart(2, '0')}`
      return byDate.get(date) ?? { date, price: 0, quantity: 0, nights: [] }
    }),
  ]
}

function nextMonthKey(key?: string) {
  if (!key) return ''
  const [year, month] = key.split('-').map(Number)
  const next = new Date(year, month, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatDateTime(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatMonth(key?: string) {
  if (!key) return 'Available dates'
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(`${key}-01T00:00:00`))
}

function formatDuration(value?: string | null) {
  if (!value) return ''
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(value)
  if (!match) return value
  return [match[1] ? `${match[1]} hours` : '', match[2] ? `${match[2]} mins` : ''].filter(Boolean).join(' ')
}

function labelGroupType(value?: string | null) {
  return value ? GROUP_TYPE_LABELS[value] ?? '' : ''
}

function stripMarkdown(value?: string) {
  return (value ?? '').replace(/[#*_`[\]()]/g, '').replace(/\s+/g, ' ').trim()
}

function fieldLabel(value: string) {
  const labels: Record<string, string> = { firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone', birthDate: 'Birth date' }
  return labels[value] ?? value
}

function groupBy<T>(items: T[], keyer: (item: T) => string) {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = keyer(item)
    map.set(key, [...(map.get(key) ?? []), item])
  }
  return map
}

function iconFor(type?: string) {
  if (type === 'flight') return <Plane size={14} />
  if (type === 'car') return <CarFront size={14} />
  if (type === 'accommodation') return <Building2 size={14} />
  if (type === 'activity') return <ActivityIcon size={14} />
  return <Clock size={14} />
}

function FacilityIcon({ token }: { token?: string | null }) {
  if (token === 'wifi') return <Wifi size={15} />
  if (token === 'parking') return <CarFront size={15} />
  if (token === 'restaurant') return <ReceiptText size={15} />
  if (token === 'private-bathroom') return <BedDouble size={15} />
  return <Check size={15} />
}
