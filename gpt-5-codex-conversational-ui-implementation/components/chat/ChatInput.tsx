'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useBooking } from '@/lib/booking/context'

function currentStepId(state: ReturnType<typeof useBooking>['state']) {
  return state.steps[state.currentStepIndex]?.id ?? 'occupancy'
}

export function ChatInput() {
  const { actions, state } = useBooking()
  const [value, setValue] = useState('')

  const currentStep = currentStepId(state)
  const assistantOptions = useMemo(
    () => ({
      occupancy: {
        minAdults: state.offerMeta.occupancyRules.minAdults,
        maxAdults: state.offerMeta.occupancyRules.maxAdults,
        maxChildren: state.offerMeta.occupancyRules.maxChildren,
      },
      calendar: {
        airports: state.calendar.departureAirports.map((item) => item.iataCode),
        packageGroups: state.calendar.packageGroups.map((item) => item.id),
        nights: state.calendar.nights.map((item) => item.nights),
        dates: state.calendar.dates.map((item) => ({
          date: item.date,
          nights: item.nights.map((night) => night.nights),
        })),
      },
      accommodations: state.accommodations.map((accommodation) => ({
        id: accommodation.id,
        name: accommodation.name,
        units: accommodation.units.map((unit) => ({
          id: unit.id,
          name: unit.name,
          boards: unit.boards.map((board) => ({ id: board.id, name: board.name })),
        })),
      })),
      activities: state.activities.map((activity) => ({ id: activity.id, name: activity.name, date: activity.date })),
      flights: state.flights.map((flight) => ({ id: flight.id, label: flight.badges[0] || flight.id })),
      cars: state.cars.map((car) => ({ id: car.id, name: car.name })),
      checkout: {
        paymentMethods:
          [
            ...(state.checkout?.paymentMethods ?? []),
            ...(state.checkout?.paymentMethodGroups.flatMap((group) => group.paymentMethods) ?? []),
          ].map((method) => ({ id: method.id, name: method.name })),
      },
    }),
    [state],
  )

  async function handleAssistantAction(result: any) {
    const action = result.action
    if (!action) {
      actions.appendAssistantMessage(result.reply || 'Please use the visible booking controls.')
      return
    }

    if (result.reply) {
      actions.appendAssistantMessage(result.reply)
    }

    if (action.type === 'select_occupancy') {
      const adults = Number(action.arguments.adults ?? 0)
      const childrenAges = Array.isArray(action.arguments.childrenAges) ? action.arguments.childrenAges.map(Number).filter(Number.isFinite) : []
      if (adults >= state.offerMeta.occupancyRules.minAdults && adults <= state.offerMeta.occupancyRules.maxAdults) {
        await actions.confirmOccupancy(adults, childrenAges)
        return
      }
    }

    if (action.type === 'set_airport') {
      const airport = String(action.arguments.airport ?? '')
      if (state.calendar.departureAirports.some((item) => item.iataCode === airport)) {
        await actions.updateCalendarFilters({ airport })
        return
      }
    }

    if (action.type === 'set_package_group') {
      const packageGroup = action.arguments.packageGroup ? String(action.arguments.packageGroup) : undefined
      if (!packageGroup || state.calendar.packageGroups.some((item) => item.id === packageGroup)) {
        await actions.updateCalendarFilters({ packageGroup })
        return
      }
    }

    if (action.type === 'set_nights_filter') {
      const nights = action.arguments.nights === null ? null : Number(action.arguments.nights)
      if (nights === null || state.calendar.nights.some((item) => item.nights === nights)) {
        await actions.updateCalendarFilters({ nights })
        return
      }
    }

    if (action.type === 'select_stay') {
      const selectedDate = String(action.arguments.startDate ?? '')
      const nights = Number(action.arguments.nights ?? 0)
      const airport = state.payload.departureAirports?.[0]
      const packageGroup = state.payload.packageGroup
      if (selectedDate && nights > 0 && airport) {
        await actions.confirmCalendar({ selectedDate, nights, airport, packageGroup })
        return
      }
    }

    if (action.type === 'select_flexible_stay') {
      const startDate = String(action.arguments.startDate ?? '')
      const endDate = String(action.arguments.endDate ?? '')
      const start = state.calendar.dates.find((item) => item.date === startDate)
      const diff =
        startDate && endDate
          ? Math.round((Date.parse(`${endDate}T00:00:00`) - Date.parse(`${startDate}T00:00:00`)) / 86400000)
          : 0
      if (start && diff > 0 && start.nights.some((night) => night.nights === diff)) {
        const airport = state.payload.departureAirports?.[0]
        if (airport) {
          await actions.confirmCalendar({
            selectedDate: startDate,
            nights: diff,
            airport,
            packageGroup: state.payload.packageGroup,
          })
          return
        }
      }
    }

    if (action.type === 'select_activities') {
      const leisureIds: string[] = Array.isArray(action.arguments.leisureIds) ? action.arguments.leisureIds.map(String) : []
      const validIds = leisureIds.filter((id) => state.activities.some((activity) => activity.id === id))
      await actions.confirmActivities(validIds)
      return
    }

    if (action.type === 'select_flight') {
      const flightId = String(action.arguments.flightId ?? '')
      const flight = state.flights.find((item) => item.id === flightId)
      if (flight) {
        await actions.confirmFlight({
          flightId,
          selectedValues: {},
          availableOptions: [...flight.options, ...(flight.luggageOption ? [flight.luggageOption] : [])],
        })
        return
      }
    }

    if (action.type === 'select_car') {
      const carId = String(action.arguments.carId ?? '')
      if (state.cars.some((item) => item.id === carId)) {
        const selectedExtraIds: string[] = Array.isArray(action.arguments.extraIds) ? action.arguments.extraIds.map(String) : []
        await actions.confirmCar({ carId, selectedExtraIds })
        return
      }
    }

    if (action.type === 'skip_step') {
      if (currentStep === 'activities') {
        await actions.confirmActivities([])
        return
      }
      if (currentStep === 'flights') {
        const current = state.flights.find((item) => item.id === (state.payload.products.find((product) => product.id.startsWith('F:'))?.id ?? item.id))
        if (current) {
          await actions.confirmFlight({
            flightId: current.id,
            selectedValues: {},
            availableOptions: [...current.options, ...(current.luggageOption ? [current.luggageOption] : [])],
          })
          return
        }
      }
    }

    actions.appendAssistantMessage('I could not apply that request to the current booking state. Please use the visible options or rephrase it.')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!value.trim()) {
      return
    }

    const submitted = value.trim()
    setValue('')
    actions.appendUserMessage(submitted)
    actions.setAssistantBusy(true)

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: submitted,
          currentStep,
          payload: state.payload,
          options: assistantOptions,
          messages: state.messages.slice(-10),
        }),
      })

      const result = await response.json()
      await handleAssistantAction(result)
    } catch {
      actions.appendAssistantMessage('I could not process that message right now. Please use the visible booking controls.')
    } finally {
      actions.setAssistantBusy(false)
    }
  }

  return (
    <form className="conversation-chat-input" onSubmit={handleSubmit}>
      <textarea
        aria-label="Chat input"
        disabled={state.assistantBusy}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask the booking assistant or use the visible controls."
        value={value}
      />
      <button className="button button-primary" disabled={state.assistantBusy} type="submit">
        {state.assistantBusy ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}
