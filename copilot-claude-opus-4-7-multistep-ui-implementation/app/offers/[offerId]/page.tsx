import { fetchOffer } from "@/lib/api";
import { newSessionId } from "@/lib/payload";
import { BookingProvider } from "@/components/BookingContext";
import { BookingShell } from "@/components/BookingShell";

export const dynamic = "force-dynamic";

export default async function OfferPage({
  params,
  searchParams,
}: {
  params: { offerId: string };
  searchParams: { s?: string };
}) {
  const sessionId = newSessionId();
  const offer = await fetchOffer(params.offerId, sessionId);
  return (
    <BookingProvider offer={offer} offerId={params.offerId} initialSnapshot={searchParams.s ?? null}>
      <BookingShell />
    </BookingProvider>
  );
}
