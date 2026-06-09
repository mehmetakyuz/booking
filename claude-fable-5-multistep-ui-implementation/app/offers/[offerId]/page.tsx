import { BookingApp } from '@/components/BookingApp'

export default async function OfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params
  return <BookingApp offerId={offerId} />
}
