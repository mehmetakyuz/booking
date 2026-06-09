'use client'

import React, { useEffect, useState } from 'react'
import { BookingProvider, useBookingState } from '@/lib/store'
import { TopRail } from './TopRail'
import { SummaryPanel } from './SummaryPanel'
import { PanelLoader } from './Loading'
import { DatesStep } from './steps/DatesStep'
import { RoomsStep } from './steps/RoomsStep'
import { ActivitiesStep } from './steps/ActivitiesStep'
import { FlightsStep } from './steps/FlightsStep'
import { CarsStep } from './steps/CarsStep'
import { CheckoutStep } from './steps/CheckoutStep'
import { formatMoney } from '@/lib/format'

export function BookingApp({ offerId }: { offerId: string }) {
  return (
    <BookingProvider offerId={offerId}>
      <TopRail />
      <BookingBody />
    </BookingProvider>
  )
}

function BookingBody() {
  const state = useBookingState()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Each new panel opens from its start.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [state.currentStepIndex])

  if (state.bootStatus === 'loading' || state.bootStatus === 'restoring') {
    return (
      <main className="booking-main booking-main-boot">
        <PanelLoader label={state.bootStatus === 'restoring' ? 'Restoring your booking…' : 'Loading your offer…'} />
      </main>
    )
  }

  if (state.bootStatus === 'error') {
    return (
      <main className="booking-main booking-main-boot">
        <div className="boot-error">
          <h2>We couldn’t load this offer</h2>
          <p>{state.bootError}</p>
        </div>
      </main>
    )
  }

  const stepId = state.steps[state.currentStepIndex]?.id
  const currency = state.offerMeta?.currency ?? 'GBP'

  return (
    <>
      <main className="booking-main">
        <div className="booking-columns">
          <section className="step-column">
            {state.globalNotice ? <div className="global-notice">{state.globalNotice}</div> : null}
            {stepId === 'dates' ? <DatesStep /> : null}
            {stepId === 'rooms' ? <RoomsStep /> : null}
            {stepId === 'activities' ? <ActivitiesStep /> : null}
            {stepId === 'flights' ? <FlightsStep /> : null}
            {stepId === 'cars' ? <CarsStep /> : null}
            {stepId === 'checkout' ? <CheckoutStep /> : null}
          </section>
          <aside className="summary-column">
            <SummaryPanel />
          </aside>
        </div>
      </main>

      {/* Mobile: sticky bar with the live total + summary drawer */}
      <div className="mobile-summary-bar">
        <div className="mobile-summary-price">
          {state.receipt?.totalPrice != null ? (
            <>
              <span className="mobile-summary-label">Total</span>
              <strong>{formatMoney(state.receipt.totalPrice, currency)}</strong>
            </>
          ) : (
            <span className="mobile-summary-label">Your trip</span>
          )}
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setDrawerOpen(true)}>
          View summary
        </button>
      </div>
      {drawerOpen ? (
        <div className="mobile-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close summary" onClick={() => setDrawerOpen(false)}>
              ×
            </button>
            <SummaryPanel />
          </div>
        </div>
      ) : null}
    </>
  )
}
