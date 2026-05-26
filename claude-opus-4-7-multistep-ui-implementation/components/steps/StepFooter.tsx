"use client";

import { useBooking } from "@/lib/booking/context";

export function StepFooter({
  onContinue,
  continueDisabled = false,
  continueLabelOverride,
}: {
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabelOverride?: string;
}) {
  const { state, actions } = useBooking();
  const isFirst = state.stepIndex === 0;
  const isLast = state.stepIndex === state.steps.length - 1;
  const nextStep = state.steps[state.stepIndex + 1];

  if (isLast) return null;

  const label =
    continueLabelOverride ??
    (nextStep ? `Step ${state.stepIndex + 2}. ${nextStep.label}` : "Continue");

  return (
    <div className="step-footer">
      {!isFirst ? (
        <button className="btn btn--tertiary" onClick={actions.back}>
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        className="btn btn--primary"
        disabled={continueDisabled}
        onClick={onContinue ?? actions.next}
      >
        {label}
      </button>
    </div>
  );
}
