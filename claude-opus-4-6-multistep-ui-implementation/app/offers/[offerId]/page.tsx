import { loadBootstrapData } from '@/lib/booking/bootstrap'
import { getGraphQLUrl } from '@/lib/server-env'
import BookingShell from '@/components/BookingShell'

function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default async function OfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>
}) {
  const { offerId } = await params
  const graphqlUrl = getGraphQLUrl()
  const sessionId = generateSessionId()

  const bootstrap = await loadBootstrapData(offerId, graphqlUrl, sessionId)

  return <BookingShell bootstrap={bootstrap} />
}
