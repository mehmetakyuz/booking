'use client'

import { BookingProvider, useBooking } from '@/lib/booking/context'
import { TopRail } from './TopRail'
import { StepSwitch } from './StepSwitch'
import { Summary } from '@/components/summary/Summary'
import { MobileSummaryBar } from '@/components/summary/MobileSummaryBar'
import { Spinner } from '@/components/ui/Spinner'

export function BookingShell({ offerId }: { offerId: string }) {
  return (
    <BookingProvider offerId={offerId}>
      <ShellInner />
    </BookingProvider>
  )
}

function ShellInner() {
  const { state } = useBooking()
  if (!state.bootstrapped) {
    return (
      <div className="bootstrap-loader">
        <Spinner />
        <p>Preparing your booking…</p>
      </div>
    )
  }
  return (
    <div className="booking-shell">
      <TopRail />
      <main className="booking-main">
        <section className="step-column">
          <StepSwitch />
        </section>
        <aside className="summary-column">
          <Summary />
        </aside>
      </main>
      <MobileSummaryBar />
    </div>
  )
}
