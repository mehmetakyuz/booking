'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '@/lib/booking/context'
import { ReceiptPanel } from '@/components/receipt/ReceiptPanel'
import { AccommodationStep } from '@/components/steps/AccommodationStep'
import { ActivityStep } from '@/components/steps/ActivityStep'
import { CarStep } from '@/components/steps/CarStep'
import { CheckoutStep } from '@/components/steps/CheckoutStep'
import { FlightStep } from '@/components/steps/FlightStep'
import { OccupancyStep } from '@/components/steps/OccupancyStep'
import { formatPrice } from '@/lib/utils/price'

export function BookingWizard() {
  const {
    state: { currentStepIndex, steps, completedStepIds, mobileReceiptOpen, receipt, receiptLoading },
    actions,
  } = useBooking()
  const [mobileStepsOpen, setMobileStepsOpen] = useState(false)

  const activeStep = steps[currentStepIndex]

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStepIndex])

  return (
    <div className="page-shell">
      <div className="booking-topbar">
        <div className="booking-topbar-inner">
          <div className="booking-brand" aria-label="Secret Escapes">
            <img alt="Secret Escapes" className="booking-brand-logo" src="/logo-light.svg" />
          </div>
          <button
            aria-controls="mobile-booking-steps"
            aria-expanded={mobileStepsOpen}
            className="booking-mobile-steps-trigger"
            onClick={() => setMobileStepsOpen((value) => !value)}
            type="button"
          >
            <span aria-hidden="true" className={`booking-mobile-hamburger${mobileStepsOpen ? ' is-open' : ''}`}>
              <span />
              <span />
              <span />
            </span>
            <span className="booking-mobile-steps-copy">
              <span className="booking-mobile-steps-meta">Step {currentStepIndex + 1} of {steps.length}</span>
              <strong>{activeStep.label}</strong>
            </span>
          </button>
          <nav aria-label="Booking steps" className="booking-step-nav">
            {steps.map((step, index) => {
              const isCurrent = index === currentStepIndex
              const isComplete = completedStepIds.includes(step.id)
              return (
                <div className="booking-step-nav-item" key={step.id}>
                  <button
                    className={`booking-step-link${isCurrent ? ' is-current' : ''}${isComplete ? ' is-complete' : ''}`}
                    onClick={() => actions.goToStep(index)}
                    type="button"
                  >
                    <span className="booking-step-number">{index + 1}.</span>
                    <span>{step.label}</span>
                  </button>
                  {index < steps.length - 1 ? <span className="booking-step-separator">›</span> : null}
                </div>
              )
            })}
          </nav>
          {mobileStepsOpen ? (
            <nav aria-label="Booking steps mobile" className="booking-mobile-steps-menu" id="mobile-booking-steps">
              {steps.map((step, index) => {
                const isCurrent = index === currentStepIndex
                const isComplete = completedStepIds.includes(step.id)

                return (
                  <button
                    className={`booking-mobile-step-link${isCurrent ? ' is-current' : ''}${isComplete ? ' is-complete' : ''}`}
                    key={step.id}
                    onClick={() => {
                      actions.goToStep(index)
                      setMobileStepsOpen(false)
                    }}
                    type="button"
                  >
                    <span className="booking-mobile-step-number">{index + 1}.</span>
                    <span className="booking-mobile-step-label">{step.label}</span>
                  </button>
                )
              })}
            </nav>
          ) : null}
        </div>
      </div>

      <div className="content-shell">
        <main className="layout-grid">
          <section className="step-panel">
            {activeStep.id === 'occupancy' ? <OccupancyStep /> : null}
            {activeStep.id === 'accommodation' ? <AccommodationStep /> : null}
            {activeStep.id === 'activities' ? <ActivityStep /> : null}
            {activeStep.id === 'flights' ? <FlightStep /> : null}
            {activeStep.id === 'cars' ? <CarStep /> : null}
            {activeStep.id === 'checkout' ? <CheckoutStep /> : null}
          </section>

          <aside className="receipt-column">
            <ReceiptPanel />
          </aside>
        </main>
      </div>

      <button className="mobile-summary-bar" onClick={() => actions.toggleMobileReceipt(true)} type="button">
        <span className="mobile-summary-copy">
          <span className="mobile-summary-label">View summary</span>
          <strong>{receipt ? 'Live total' : 'Your total'}</strong>
        </span>
        <span className="mobile-summary-value">
          {receiptLoading ? <span aria-label="Updating total" className="mobile-summary-spinner" /> : receipt ? formatPrice(receipt.totalPrice) : 'Select dates'}
        </span>
      </button>

      {mobileReceiptOpen ? (
        <div className="mobile-drawer">
          <div className="mobile-drawer-header">
            <strong>Booking summary</strong>
            <button className="button button-secondary" onClick={() => actions.toggleMobileReceipt(false)} type="button">
              Close
            </button>
          </div>
          <ReceiptPanel mobile />
        </div>
      ) : null}
    </div>
  )
}
