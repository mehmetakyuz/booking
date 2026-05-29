import BookingApp from "@/components/BookingApp";

// Server boot: read offerId from the route, hand it to the client booking shell
// which generates the session, fetches live data, and restores URL state.
export default async function OfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  return <BookingApp offerId={offerId} />;
}
