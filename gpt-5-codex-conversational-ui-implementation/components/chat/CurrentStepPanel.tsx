'use client'

import { AccommodationStep } from '@/components/steps/AccommodationStep'
import { ActivityStep } from '@/components/steps/ActivityStep'
import { CarStep } from '@/components/steps/CarStep'
import { CheckoutStep } from '@/components/steps/CheckoutStep'
import { FlightStep } from '@/components/steps/FlightStep'
import { OccupancyStep } from '@/components/steps/OccupancyStep'
import { useBooking } from '@/lib/booking/context'

export function CurrentStepPanel() {
  const {
    state: { steps, currentStepIndex },
  } = useBooking()

  const step = steps[currentStepIndex]
  if (!step) {
    return null
  }

  return (
    <div className="message assistant current-step-message">
      <div className="assistant-label">Booking assistant</div>
      <div className="bubble assistant current-step-bubble">
        {step.id === 'occupancy' ? <OccupancyStep /> : null}
        {step.id === 'accommodation' ? <AccommodationStep /> : null}
        {step.id === 'activities' ? <ActivityStep /> : null}
        {step.id === 'flights' ? <FlightStep /> : null}
        {step.id === 'cars' ? <CarStep /> : null}
        {step.id === 'checkout' ? <CheckoutStep /> : null}
      </div>
    </div>
  )
}
