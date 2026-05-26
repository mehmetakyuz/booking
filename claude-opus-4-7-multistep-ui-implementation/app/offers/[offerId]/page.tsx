import { BookingApp } from "@/components/BookingApp";

// Route-driven offer ID. All live data is fetched client-side so the session
// header is generated once and reused (and restored from URL state on refresh).
export default async function OfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  return <BookingApp offerId={offerId} />;
}
