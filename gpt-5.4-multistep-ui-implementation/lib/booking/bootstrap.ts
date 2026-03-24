import { loadBootstrapDataServer } from '@/lib/booking/api'
import { requireServerEnv } from '@/lib/server-env'
import { BootstrapData } from '@/lib/booking/types'

export async function loadBootstrapData(offerId: string, sessionId: string): Promise<BootstrapData> {

  if (!offerId) {
    throw new Error('No offer ID is available for bootstrap.')
  }

  return loadBootstrapDataServer(offerId, requireServerEnv('GRAPHQL_URL'), sessionId)
}
