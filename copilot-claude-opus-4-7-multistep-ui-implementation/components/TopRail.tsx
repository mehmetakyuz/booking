"use client";

import { useState } from "react";
import { useBooking } from "./BookingContext";

export function TopRail() {
  const { state, goToStep } = useBooking();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="top-rail" style={{ position: "relative" }}>
      <a href="/" className="top-rail-logo" aria-label="Secret Escapes">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="Secret Escapes" />
      </a>
      <nav>
        <ol className="top-rail-steps">
          {state.steps.map((s, idx) => {
            const isCurrent = idx === state.currentStepIdx;
            const isPast = idx < state.currentStepIdx;
            const className = ["top-rail-step", isCurrent && "active", isPast && "clickable"]
              .filter(Boolean)
              .join(" ");
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={className}
                  disabled={!isPast && !isCurrent}
                  onClick={() => isPast && goToStep(idx)}
                >
                  {s.number}. {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <button
        type="button"
        className="top-rail-mobile-trigger"
        onClick={() => setMobileOpen(o => !o)}
        aria-expanded={mobileOpen}
      >
        Step {state.currentStepIdx + 1}/{state.steps.length}: {state.steps[state.currentStepIdx]?.label} ▾
      </button>
      <div className={`top-rail-mobile-panel ${mobileOpen ? "open" : ""}`}>
        <ul>
          {state.steps.map((s, idx) => {
            const isCurrent = idx === state.currentStepIdx;
            const isPast = idx < state.currentStepIdx;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`top-rail-step ${isCurrent ? "active" : ""} ${isPast ? "clickable" : ""}`}
                  disabled={!isPast && !isCurrent}
                  onClick={() => { if (isPast) { goToStep(idx); setMobileOpen(false); } }}
                >
                  {s.number}. {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
