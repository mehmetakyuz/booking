import { BookingClient } from '@/components/BookingClient'

export const dynamic = 'force-dynamic'

export default async function OfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params
  return <BookingClient offerId={offerId} />
}
