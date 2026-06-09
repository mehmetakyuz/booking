'use client'

import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useBookingActions, useBookingState } from '@/lib/store'

export function TopRail() {
  const { steps, currentStepIndex, maxReachedIndex } = useBookingState()
  const { goToStep } = useBookingActions()
  const [mobileOpen, setMobileOpen] = useState(false)

  const current = steps[currentStepIndex]

  return (
    <header className="top-rail">
      <div className="top-rail-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="Secret Escapes" className="top-rail-logo" />

        {steps.length > 0 ? (
          <>
            <nav className="rail-steps-desktop" aria-label="Booking steps">
              {steps.map((step, i) => {
                const isCurrent = i === currentStepIndex
                const isCompleted = i <= maxReachedIndex && !isCurrent
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`rail-step${isCurrent ? ' is-current' : isCompleted ? ' is-completed' : ' is-future'}`}
                    disabled={i > maxReachedIndex}
                    onClick={() => goToStep(i)}
                  >
                    {step.number}. {step.label}
                  </button>
                )
              })}
            </nav>

            <button
              type="button"
              className="rail-mobile-trigger"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
            >
              <span>{current ? `${current.number}. ${current.label}` : ''}</span>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </>
        ) : null}
      </div>

      {mobileOpen ? (
        <nav className="rail-steps-mobile" aria-label="Booking steps">
          {steps.map((step, i) => {
            const isCurrent = i === currentStepIndex
            const isCompleted = i <= maxReachedIndex && !isCurrent
            return (
              <button
                key={step.id}
                type="button"
                className={`rail-step${isCurrent ? ' is-current' : isCompleted ? ' is-completed' : ' is-future'}`}
                disabled={i > maxReachedIndex}
                onClick={() => {
                  goToStep(i)
                  setMobileOpen(false)
                }}
              >
                {step.number}. {step.label}
              </button>
            )
          })}
        </nav>
      ) : null}
    </header>
  )
}
