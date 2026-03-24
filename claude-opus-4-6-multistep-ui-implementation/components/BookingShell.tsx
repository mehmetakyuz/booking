'use client'

import { useEffect, useState } from 'react'
import { BookingProvider, useBooking } from '@/lib/booking/context'
import type { BootstrapData, StepId } from '@/lib/booking/types'

import DatesStep from '@/components/steps/DatesStep'
import RoomsStep from '@/components/steps/RoomsStep'
import ActivitiesStep from '@/components/steps/ActivitiesStep'
import FlightsStep from '@/components/steps/FlightsStep'
import CarsStep from '@/components/steps/CarsStep'
import CheckoutStep from '@/components/steps/CheckoutStep'
import ReceiptPanel from '@/components/receipt/ReceiptPanel'

/* ────────────────────────────────────────────
   Step component map
   ──────────────────────────────────────────── */

const STEP_COMPONENTS: Record<StepId, React.ComponentType> = {
  dates: DatesStep,
  rooms: RoomsStep,
  activities: ActivitiesStep,
  flights: FlightsStep,
  cars: CarsStep,
  checkout: CheckoutStep,
}

/* ────────────────────────────────────────────
   Currency helper
   ──────────────────────────────────────────── */

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

/* ────────────────────────────────────────────
   Inner shell (consumes context)
   ──────────────────────────────────────────── */

function BookingShellInner() {
  const { state, actions } = useBooking()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  /* Scroll to top on step change */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [state.currentStepIndex])

  /* Close mobile nav when step changes */
  useEffect(() => {
    setMobileNavOpen(false)
  }, [state.currentStepIndex])

  const activeStep = state.steps[state.currentStepIndex]
  const ActiveStepComponent = activeStep ? STEP_COMPONENTS[activeStep.id] : null

  const totalPrice = state.receipt?.totalPrice ?? 0
  const currency = state.offer.currency ?? 'EUR'

  return (
    <>
      {/* ── Top Rail ── */}
      <header className="top-rail">
        <div className="top-rail-logo">
          <img src="/logo-light.svg" alt="Secret Escapes" />
        </div>

        {/* Desktop step navigation */}
        <nav className="step-nav">
          {state.steps.map((step, index) => {
            const isActive = index === state.currentStepIndex
            const isCompleted = state.completedStepIds.includes(step.id)

            let className = 'step-nav-item'
            if (isActive) className += ' active'
            else if (isCompleted) className += ' completed'

            if (isCompleted && !isActive) {
              return (
                <button
                  key={step.id}
                  className={className}
                  onClick={() => actions.goToStep(index)}
                  type="button"
                >
                  {index + 1}. {step.label}
                </button>
              )
            }

            return (
              <span key={step.id} className={className}>
                {index + 1}. {step.label}
              </span>
            )
          })}
        </nav>

        {/* Mobile step navigation */}
        <div className="step-nav-mobile">
          <button
            className="step-nav-mobile-trigger"
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-step-list"
          >
            <span className="step-nav-mobile-label">
              {state.currentStepIndex + 1}. {activeStep?.label}
            </span>
            <span
              className={`step-nav-mobile-chevron ${mobileNavOpen ? 'open' : ''}`}
              aria-hidden="true"
            />
          </button>

          {mobileNavOpen && (
            <ul className="step-nav-mobile-dropdown" id="mobile-step-list">
              {state.steps.map((step, index) => {
                const isActive = index === state.currentStepIndex
                const isCompleted = state.completedStepIds.includes(step.id)

                let className = 'step-nav-item'
                if (isActive) className += ' active'
                else if (isCompleted) className += ' completed'

                return (
                  <li key={step.id}>
                    {isCompleted && !isActive ? (
                      <button
                        className={className}
                        onClick={() => actions.goToStep(index)}
                        type="button"
                      >
                        {index + 1}. {step.label}
                      </button>
                    ) : (
                      <span className={className}>
                        {index + 1}. {step.label}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="page-canvas">
        <div className="booking-layout">
          <main className="step-column">
            {ActiveStepComponent && <ActiveStepComponent />}
          </main>

          <aside className="summary-panel">
            <ReceiptPanel />
          </aside>
        </div>
      </div>

      {/* ── Mobile Summary Bar ── */}
      <div className="mobile-summary-bar">
        <button
          className="mobile-summary-bar-price"
          type="button"
          onClick={() =>
            actions.toggleMobileReceipt(!state.mobileReceiptOpen)
          }
        >
          {state.receipt ? formatPrice(totalPrice, currency) : 'View summary'}
        </button>
      </div>

      {/* ── Mobile Receipt Drawer ── */}
      {state.mobileReceiptOpen && (
        <>
          <div
            className="mobile-drawer-overlay open"
            onClick={() => actions.toggleMobileReceipt(false)}
          />
          <div className="mobile-drawer open">
            <ReceiptPanel />
          </div>
        </>
      )}
    </>
  )
}

/* ────────────────────────────────────────────
   Public shell component
   ──────────────────────────────────────────── */

export default function BookingShell({ bootstrap }: { bootstrap: BootstrapData }) {
  return (
    <BookingProvider bootstrap={bootstrap}>
      <BookingShellInner />
    </BookingProvider>
  )
}
