'use client'

import { createContext, useContext, useMemo, useReducer, useRef } from 'react'
import { createFlow, createInitialState } from './flow'
import { bookingReducer } from './reducer'
import type { BookingState, BootstrapData, CarExtra, CheckoutData, ReceiptData, StepId } from './types'

type Actions = ReturnType<typeof createFlow>

interface BookingContextValue {
  state: BookingState
  actions: Actions
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({
  bootstrap,
  children,
}: {
  bootstrap: BootstrapData
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(bookingReducer, bootstrap, createInitialState)
  const stateRef = useRef(state)
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
        setCarExtras: (carId: string, extras: CarExtra[]) =>
          dispatch({ type: 'SET_CAR_EXTRAS', carId, extras }),
        setCheckout: (checkout: CheckoutData | null) =>
          dispatch({ type: 'SET_CHECKOUT', checkout }),
      }),
    [],
  )

  const value = useMemo(() => ({ state, actions }), [actions, state])

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be inside BookingProvider')
  return ctx
}
