'use client'

import { useBooking } from '@/lib/booking/context'
import { OccupancyField } from './dates/OccupancyField'
import { AirportDropdown } from './dates/AirportDropdown'
import { PackageGroupCards } from './dates/PackageGroupCards'
import { NightsChips } from './dates/NightsChips'
import { Calendar } from './dates/Calendar'
import { StepFooter } from './StepFooter'

export function DatesStep() {
  const { state, actions } = useBooking()
  const cal = state.calendar
  const hasStay =
    state.payload.selectedDate !== undefined &&
    state.payload.nights !== undefined &&
    state.payload.nights !== null
  const hasReceiptError = (state.receipt?.errors?.length ?? 0) > 0
  const canContinue = hasStay && !!state.receipt && !hasReceiptError && !state.async.receiptLoading

  return (
    <div className="step-panel">
      <header className="step-panel-head">
        <h1 className="step-heading">Choose your stay</h1>
        <p className="step-subtitle">Travellers, airport, package, nights, and dates.</p>
      </header>

      <div className="dates-section">
        <div className="dates-section-label field-label">Travellers</div>
        <OccupancyField />
      </div>

      {cal?.departureAirports && cal.departureAirports.length > 0 ? (
        <div className="dates-section">
          <div className="dates-section-label field-label">Flying from</div>
          <AirportDropdown />
        </div>
      ) : null}

      {cal?.packageGroups && cal.packageGroups.length > 0 ? (
        <div className="dates-section">
          <div className="dates-section-label field-label">Package</div>
          <PackageGroupCards />
        </div>
      ) : null}

      {cal?.nights && cal.nights.length > 0 ? (
        <div className="dates-section">
          <div className="dates-section-label field-label">Nights</div>
          <NightsChips />
        </div>
      ) : null}

      <div className="dates-section dates-section--calendar">
        <Calendar />
      </div>

      <p className="dates-disclaimer">
        Prices are estimates, calculated per person based on the selected traveller count (or at
        least 2 adults). Included-flight prices may still change during booking.
      </p>

      <StepFooter
        onContinue={() => {
          if (canContinue) actions.goToStep(state.currentStep + 1)
        }}
        continueDisabled={!canContinue}
      />
    </div>
  )
}
