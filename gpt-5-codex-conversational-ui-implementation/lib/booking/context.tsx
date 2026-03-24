'use client'

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createFlow, createInitialState } from '@/lib/booking/flow'
import { bookingReducer } from '@/lib/booking/reducer'
import { BookingUrlSnapshot, decodeBookingUrlSnapshot, encodeBookingUrlSnapshot } from '@/lib/booking/url-state'
import { BookingState, BootstrapData, CarExtra, Message, ReceiptData, StepId } from '@/lib/booking/types'

function createMessage(role: 'assistant' | 'user', content: string, type: Message['type'] = 'text'): Message {
  return {
    id: `${role}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    type,
    content,
    createdAt: new Date().toISOString(),
  }
}

function currentStepId(state: BookingState) {
  return state.steps[state.currentStepIndex]?.id ?? 'occupancy'
}

function buildStepPrompt(stepId: StepId, state: BookingState) {
  if (stepId === 'occupancy') return 'Start with your travellers and dates.'
  if (stepId === 'accommodation') return 'Choose your hotel, room, and board basis.'
  if (stepId === 'activities') return 'Choose any activities you would like to add to your trip.'
  if (stepId === 'flights') return 'Choose your preferred flight option.'
  if (stepId === 'cars') return 'Choose your car hire and any extras.'
  if (stepId === 'checkout') return 'Complete the booking details and confirm your payment.'
  return 'Continue with your booking.'
}

function buildMessagesFromState(state: BookingState): Message[] {
  const messages: Message[] = [createMessage('assistant', 'Let’s plan your trip.')]

  if (state.payload.selectedDate && state.payload.nights != null) {
    messages.push(
      createMessage(
        'user',
        `${state.payload.selectedDate}, ${state.payload.nights} nights${state.payload.departureAirports?.[0] ? ` from ${state.payload.departureAirports[0]}` : ''}.`,
        'selection',
      ),
    )
  }

  const unitProduct = state.payload.products.find((product) => product.group === 0)
  if (unitProduct) {
    for (const accommodation of state.accommodations) {
      const unit = accommodation.units.find((item) => item.id === unitProduct.id)
      if (!unit) continue
      const boardProduct = state.payload.products.find((product) => unit.boards.some((board) => board.id === product.id))
      const board = unit.boards.find((item) => item.id === boardProduct?.id)
      messages.push(
        createMessage(
          'user',
          [accommodation.name, unit.name, board?.name].filter(Boolean).join(', '),
          'selection',
        ),
      )
      break
    }
  }

  const leisureProducts = state.payload.products.filter((product) => product.id.startsWith('L:'))
  if (leisureProducts.length) {
    messages.push(createMessage('user', `${leisureProducts.length} activities selected.`, 'selection'))
  }

  const flightProduct = state.payload.products.find((product) => product.id.startsWith('F:'))
  if (flightProduct) {
    messages.push(createMessage('user', 'Flight selected.', 'selection'))
  }

  const carProduct = state.payload.products.find((product) => product.id.startsWith('C:'))
  if (carProduct) {
    messages.push(createMessage('user', 'Car hire selected.', 'selection'))
  }

  messages.push(createMessage('assistant', buildStepPrompt(currentStepId(state), state)))
  return messages
}

interface BookingContextValue {
  state: BookingState
  actions: ReturnType<typeof createFlow> & {
    toggleMobileReceipt: (value: boolean) => void
    appendUserMessage: (content: string) => void
    appendAssistantMessage: (content: string) => void
    replaceMessages: (messages: Message[]) => void
    setAssistantBusy: (value: boolean) => void
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
  const lastPromptedStepRef = useRef<number>(state.currentStepIndex)
  stateRef.current = state

  const baseActions = useMemo(
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

  const actions = useMemo(() => {
    const appendUserMessage = (content: string) => dispatch({ type: 'APPEND_MESSAGE', message: createMessage('user', content, 'selection') })
    const appendAssistantMessage = (content: string) => dispatch({ type: 'APPEND_MESSAGE', message: createMessage('assistant', content) })
    const replaceMessages = (messages: Message[]) => dispatch({ type: 'SET_MESSAGES', messages })
    const setAssistantBusy = (value: boolean) => dispatch({ type: 'SET_ASSISTANT_BUSY', value })

    return {
      ...baseActions,
      toggleMobileReceipt: (value: boolean) => dispatch({ type: 'SET_MOBILE_RECEIPT', value }),
      appendUserMessage,
      appendAssistantMessage,
      replaceMessages,
      setAssistantBusy,
      async hydrateFromSnapshot(snapshot: BookingUrlSnapshot) {
        await baseActions.hydrateFromSnapshot(snapshot)
        replaceMessages(buildMessagesFromState(stateRef.current))
      },
      async confirmOccupancy(adults: number, childrenAges: number[]) {
        appendUserMessage(
          `${adults} adult${adults === 1 ? '' : 's'}${childrenAges.length ? `, ${childrenAges.length} child${childrenAges.length === 1 ? '' : 'ren'}` : ''}.`,
        )
        await baseActions.confirmOccupancy(adults, childrenAges)
      },
      async confirmCalendar(input: Parameters<typeof baseActions.confirmCalendar>[0]) {
        const success = await baseActions.confirmCalendar(input)
        if (success) {
          appendUserMessage(
            `${input.selectedDate}, ${input.nights} nights${input.airport ? ` from ${input.airport}` : ''}.`,
          )
        }
        return success
      },
      async confirmAccommodation(input: Parameters<typeof baseActions.confirmAccommodation>[0]) {
        const current = stateRef.current
        let summary = 'Room selection updated.'
        for (const accommodation of current.accommodations) {
          const unit = accommodation.units.find((item) => item.id === input.unitId)
          if (!unit) continue
          const board = unit.boards.find((item) => item.id === input.boardId)
          summary = [accommodation.name, unit.name, board?.name].filter(Boolean).join(', ')
          break
        }
        appendUserMessage(summary)
        await baseActions.confirmAccommodation(input)
      },
      async confirmActivities(selectedIds: string[]) {
        appendUserMessage(selectedIds.length ? `${selectedIds.length} activities selected.` : 'No additional activities.')
        await baseActions.confirmActivities(selectedIds)
      },
      async confirmFlight(input: Parameters<typeof baseActions.confirmFlight>[0]) {
        const current = stateRef.current
        const flight = current.flights.find((item) => item.id === input.flightId)
        appendUserMessage(flight ? flight.badges[0] || 'Flight selected.' : 'Flight selected.')
        await baseActions.confirmFlight(input)
      },
      async confirmCar(input: Parameters<typeof baseActions.confirmCar>[0]) {
        const current = stateRef.current
        const car = current.cars.find((item) => item.id === input.carId)
        appendUserMessage(car ? `${car.name}.` : 'Car hire updated.')
        await baseActions.confirmCar(input)
      },
    }
  }, [baseActions])

  useEffect(() => {
    let cancelled = false

    async function hydrateFromUrl() {
      if (!initialStateToken) {
        dispatch({ type: 'SET_MESSAGES', messages: buildMessagesFromState(stateRef.current) })
        setUrlStateReady(true)
        return
      }

      const snapshot = decodeBookingUrlSnapshot(initialStateToken)
      if (!snapshot) {
        dispatch({ type: 'SET_MESSAGES', messages: buildMessagesFromState(stateRef.current) })
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

  useEffect(() => {
    if (!urlStateReady) {
      return
    }

    if (state.currentStepIndex !== lastPromptedStepRef.current) {
      dispatch({ type: 'APPEND_MESSAGE', message: createMessage('assistant', buildStepPrompt(currentStepId(state), state)) })
      lastPromptedStepRef.current = state.currentStepIndex
    }
  }, [state, urlStateReady])

  const value = useMemo(
    () => ({
      state,
      actions,
    }),
    [actions, state],
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking must be used inside BookingProvider.')
  }
  return context
}
