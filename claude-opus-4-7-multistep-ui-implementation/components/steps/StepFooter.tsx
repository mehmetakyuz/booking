'use client'

import { useBooking } from '@/lib/booking/context'
import { Button } from '@/components/ui/Button'

interface Props {
  onContinue: () => void
  continueDisabled?: boolean
  continueLabel?: string
}

export function StepFooter({ onContinue, continueDisabled, continueLabel }: Props) {
  const { state, actions } = useBooking()
  const nextStep = state.steps[state.currentStep + 1]
  const prevStep = state.steps[state.currentStep - 1]
  const label = continueLabel ?? (nextStep ? `Step ${nextStep.number}. ${nextStep.label}` : 'Continue')
  return (
    <div className="step-footer">
      {prevStep ? (
        <Button variant="tertiary" onClick={() => actions.goToStep(state.currentStep - 1)}>
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button variant="primary" onClick={onContinue} disabled={continueDisabled}>
        {label}
      </Button>
    </div>
  )
}
