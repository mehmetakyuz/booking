import { BookingWizard } from '@/components/booking/BookingWizard'
import { BookingProvider } from '@/lib/booking/context'
import { loadBootstrapData } from '@/lib/booking/bootstrap'
import { decodeBookingUrlSnapshot } from '@/lib/booking/url-state'

export const dynamic = 'force-dynamic'

export default async function OfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ offerId: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const { offerId } = await params
  const { state } = await searchParams
  const snapshot = state ? decodeBookingUrlSnapshot(state) : null
  const sessionId = snapshot?.payload.sessionId ?? crypto.randomUUID()
  const bootstrap = await loadBootstrapData(offerId, sessionId)

  return (
    <BookingProvider bootstrap={bootstrap} initialStateToken={state}>
      <BookingWizard />
    </BookingProvider>
  )
}
