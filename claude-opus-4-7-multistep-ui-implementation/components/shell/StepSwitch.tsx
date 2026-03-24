'use client'

import { useBooking } from '@/lib/booking/context'
import { DatesStep } from '@/components/steps/DatesStep'
import { RoomsStep } from '@/components/steps/RoomsStep'
import { ActivitiesStep } from '@/components/steps/ActivitiesStep'
import { FlightsStep } from '@/components/steps/FlightsStep'
import { CarsStep } from '@/components/steps/CarsStep'
import { CheckoutStep } from '@/components/steps/CheckoutStep'

export function StepSwitch() {
  const { state } = useBooking()
  const def = state.steps[state.currentStep]
  if (!def) return null
  switch (def.id) {
    case 'dates':
      return <DatesStep />
    case 'rooms':
      return <RoomsStep />
    case 'activities':
      return <ActivitiesStep />
    case 'flights':
      return <FlightsStep />
    case 'cars':
      return <CarsStep />
    case 'checkout':
      return <CheckoutStep />
  }
}
