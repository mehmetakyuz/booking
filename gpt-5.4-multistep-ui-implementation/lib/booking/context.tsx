'use client'

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createFlow, createInitialState } from '@/lib/booking/flow'
import { bookingReducer } from '@/lib/booking/reducer'
import { BookingUrlSnapshot, decodeBookingUrlSnapshot, encodeBookingUrlSnapshot } from '@/lib/booking/url-state'
import { BookingState, BootstrapData, CarExtra, ReceiptData, StepId } from '@/lib/booking/types'

interface BookingContextValue {
  state: BookingState
  actions: {
    goBack: () => void
    goToStep: (index: number) => void
    resetToCalendar: () => void
    toggleMobileReceipt: (value: boolean) => void
    hydrateFromSnapshot: (snapshot: BookingUrlSnapshot) => Promise<void>
    confirmOccupancy: (adults: number, childrenAges: number[]) => Promise<void>
    updateCalendarFilters: (filters: { airport?: string; packageGroup?: string; nights?: number | null }) => Promise<void>
    previewCalendarSelection: (input: {
      selectedDate: string
      nights: number
      airport?: string
      packageGroup?: string
    }) => Promise<ReceiptData | null>
    refreshCurrentReceipt: () => Promise<void>
    confirmCalendar: (input: { selectedDate: string; nights: number; airport?: string; packageGroup?: string }) => Promise<boolean>
    previewAccommodation: (input: {
      unitId: string
      boardId: string
      selectedValues: Record<string, string>
      availableOptions: BookingState['accommodations'][number]['units'][number]['options']
    }) => Promise<void>
    confirmAccommodation: (input: {
      unitId: string
      boardId: string
      selectedValues: Record<string, string>
      availableOptions: BookingState['accommodations'][number]['units'][number]['options']
    }) => Promise<void>
    previewActivities: (selectedIds: string[]) => Promise<void>
    confirmActivities: (selectedIds: string[]) => Promise<void>
    ensureFlightsLoaded: () => Promise<void>
    previewFlight: (input: {
      flightId: string
      selectedValues: Record<string, string>
      availableOptions: BookingState['flights'][number]['options']
    }) => Promise<void>
    confirmFlight: (input: {
      flightId: string
      selectedValues: Record<string, string>
      availableOptions: BookingState['flights'][number]['options']
    }) => Promise<void>
    ensureCarsLoaded: () => Promise<void>
    loadCarExtras: (carId: string) => Promise<void>
    confirmCar: (input: { carId?: string; selectedExtraIds: string[] }) => Promise<void>
    ensureCheckoutLoaded: () => Promise<void>
    submitOrder: (restoreUrl: string) => Promise<string>
    updateCheckoutField: (
      section: 'leadPassenger' | 'participants' | 'couponCodes',
      key: string,
      value: string,
      index?: number,
    ) => void
    updateCheckoutMeta: (patch: Partial<BookingState['checkoutForm']>) => void
    applyCoupon: (source: string) => Promise<void>
    updateInstalments: (numOfInstalments: number) => Promise<void>
  }
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({
  bootstrap,
  initialStateToken,
  children,
}: {
  bootstrap: BootstrapData
  initialStateToken?: string
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(bookingReducer, bootstrap, createInitialState)
  const stateRef = useRef(state)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [urlStateReady, setUrlStateReady] = useState(false)
  const lastTokenRef = useRef(initialStateToken ?? '')
  stateRef.current = state

  const actions = useMemo(
    () =>
      createFlow({
        getState: () => stateRef.current,
        patchState: (patch: Partial<BookingState>) => dispatch({ type: 'PATCH_STATE', patch }),
        setStepIndex: (index: number) => dispatch({ type: 'SET_STEP_INDEX', index }),
        completeStep: (stepId: StepId) => dispatch({ type: 'COMPLETE_STEP', stepId }),
        setReceipt: (receipt: ReceiptData | null) => dispatch({ type: 'SET_RECEIPT', receipt }),
        setReceiptLoading: (value: boolean) => dispatch({ type: 'SET_RECEIPT_LOADING', value }),
        setCarExtras: (carId: string, extras: CarExtra[]) => dispatch({ type: 'SET_CAR_EXTRAS', carId, extras }),
        setCheckout: (checkout) => dispatch({ type: 'SET_CHECKOUT', checkout }),
      }),
    [],
  )

  const value = useMemo(
    () => ({
      state,
      actions,
    }),
    [actions, state],
  )

  useEffect(() => {
    let cancelled = false

    async function hydrateFromUrl() {
      if (!initialStateToken) {
        setUrlStateReady(true)
        return
      }

      const snapshot = decodeBookingUrlSnapshot(initialStateToken)
      if (!snapshot) {
        setUrlStateReady(true)
        return
      }

      await actions.hydrateFromSnapshot(snapshot)
      if (!cancelled) {
        setUrlStateReady(true)
      }
    }

    void hydrateFromUrl()

    return () => {
      cancelled = true
    }
  }, [actions, initialStateToken])

  useEffect(() => {
    if (!urlStateReady) {
      return
    }

    const timeout = window.setTimeout(() => {
      const nextToken = encodeBookingUrlSnapshot(state)
      if (nextToken === lastTokenRef.current) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())
      params.set('state', nextToken)
      window.history.replaceState(window.history.state, '', `${pathname}?${params.toString()}`)
      lastTokenRef.current = nextToken
    }, 150)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [pathname, searchParams, state, urlStateReady])

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking must be used inside BookingProvider.')
  }
  return context
}
