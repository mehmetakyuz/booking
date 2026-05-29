"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useBooking } from "@/lib/booking/context";
import { StepDefinition } from "@/lib/booking/types";

export default function TopRail() {
  const { state, goToStep } = useBooking();
  const { steps, currentStep } = state;
  const [open, setOpen] = useState(false);

  const currentIdx = steps.findIndex((s) => s.id === currentStep);
  const current = steps[currentIdx];

  const stepState = (s: StepDefinition, i: number) => {
    if (s.id === currentStep) return "is-current";
    if (i < currentIdx) return "is-complete";
    return "is-future";
  };

  const clickable = (i: number) => i <= currentIdx;

  return (
    <header className="top-rail">
      <div className="top-rail-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="Secret Escapes" className="top-rail-logo" />

        <nav className="top-rail-steps top-rail-steps--desktop">
          {steps.map((s, i) => (
            <button
              key={s.id}
              className={`rail-step ${stepState(s, i)}`}
              onClick={() => clickable(i) && goToStep(s.id)}
              disabled={!clickable(i)}
            >
              <span className="rail-step-num">{s.index}.</span> {s.label}
            </button>
          ))}
        </nav>

        <button
          className="top-rail-mobile-trigger"
          onClick={() => setOpen((o) => !o)}
          aria-label="Steps"
        >
          <span>
            {current ? `${current.index}. ${current.label}` : "Steps"}
          </span>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open ? (
        <nav className="top-rail-steps top-rail-steps--mobile">
          {steps.map((s, i) => (
            <button
              key={s.id}
              className={`rail-step ${stepState(s, i)}`}
              onClick={() => {
                if (clickable(i)) {
                  goToStep(s.id);
                  setOpen(false);
                }
              }}
              disabled={!clickable(i)}
            >
              <span className="rail-step-num">{s.index}.</span> {s.label}
            </button>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
