import ClientPage from './ClientPage';

export default async function OfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const resolvedParams = await params;
  return <ClientPage offerId={resolvedParams.offerId} />;
}
