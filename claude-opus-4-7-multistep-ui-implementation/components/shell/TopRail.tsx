"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useBooking } from "@/lib/booking/context";

export function TopRail() {
  const { state, actions } = useBooking();
  const { steps, stepIndex } = state;
  const [menuOpen, setMenuOpen] = useState(false);

  const stepClass = (i: number) => {
    if (i === stepIndex) return "rail-step rail-step--current";
    if (i < stepIndex) return "rail-step rail-step--done";
    return "rail-step rail-step--future";
  };

  const onStepClick = (i: number) => {
    if (i <= stepIndex) actions.goToStep(i);
    setMenuOpen(false);
  };

  return (
    <header className="top-rail">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="top-rail__logo" src="/logo-light.svg" alt="Secret Escapes" />

      <ol className="top-rail__steps">
        {steps.map((s, i) => (
          <li key={s.key}>
            <button className={stepClass(i)} onClick={() => onStepClick(i)}>
              <span className="rail-step__num">{i + 1}</span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="rail-mobile">
        <span className="rail-mobile__current">
          {stepIndex + 1}. {steps[stepIndex]?.label}
        </span>
        <button
          className="rail-mobile__toggle"
          aria-label="Steps"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        {menuOpen && (
          <div className="mobile-step-menu">
            {steps.map((s, i) => (
              <button key={s.key} className={stepClass(i)} onClick={() => onStepClick(i)}>
                <span className="rail-step__num">{i + 1}</span>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
