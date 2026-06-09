'use client'

import React from 'react'
import { useBookingActions, useBookingState } from '@/lib/store'

// Shared step navigation: Back (never on the first step) and a forward CTA
// that names the destination step, e.g. "Step 2. Rooms".
export function StepFooter({
  continueDisabled,
  onContinue,
}: {
  continueDisabled?: boolean
  onContinue?: () => void
}) {
  const { steps, currentStepIndex } = useBookingState()
  const { goBack, goNext } = useBookingActions()

  const next = steps[currentStepIndex + 1]
  if (!next) return null

  return (
    <div className="step-footer">
      {currentStepIndex > 0 ? (
        <button type="button" className="btn btn-tertiary" onClick={goBack}>
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        className="btn btn-primary"
        disabled={continueDisabled}
        onClick={onContinue ?? goNext}
      >
        Step {next.number}. {next.label}
      </button>
    </div>
  )
}
