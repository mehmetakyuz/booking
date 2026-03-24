import { BookingShell } from '@/components/shell/BookingShell'

export default async function OfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params
  return <BookingShell offerId={offerId} />
}
