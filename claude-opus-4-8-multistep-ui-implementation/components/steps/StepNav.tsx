"use client";

import { ArrowLeft } from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import { StepId } from "@/lib/booking/types";

export default function StepNav({
  stepId,
  canContinue,
  onContinue,
}: {
  stepId: StepId;
  canContinue: boolean;
  onContinue?: () => void;
}) {
  const { state, goToStep, continueFrom } = useBooking();
  const { steps } = state;
  const idx = steps.findIndex((s) => s.id === stepId);
  const prev = steps[idx - 1];
  const next = steps[idx + 1];

  return (
    <div className="step-nav">
      {prev ? (
        <button className="btn btn--tertiary" onClick={() => goToStep(prev.id)}>
          <ArrowLeft size={16} /> Back
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button
          className="btn btn--primary"
          disabled={!canContinue}
          onClick={() => {
            if (onContinue) onContinue();
            else continueFrom(stepId);
          }}
        >
          Step {next.index}. {next.label}
        </button>
      ) : null}
    </div>
  );
}
