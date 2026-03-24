import { gql } from '@/lib/graphql/client'
import { GET_OFFER, GET_OFFER_CALENDAR } from '@/lib/graphql/queries'
import { normalizeOffer, normalizeCalendar } from './normalize'
import type { BootstrapData, PersonInput } from './types'

/**
 * Server-side boot: fetch the offer and calendar, derive leading airport + package group,
 * then re-fetch calendar with those defaults applied.
 */
export async function loadBootstrapData(
  offerId: string,
  graphqlUrl: string,
  sessionId: string,
): Promise<BootstrapData> {
  const headers = { 'x-tb-sessionid': sessionId }
  const people: PersonInput[] = [{}, {}]
  const groups = [{ people: [0, 1] }]

  async function serverGql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ query, variables }),
    })
    const json = await res.json()
    if (json.errors?.length) {
      const msg = json.errors.map((e: any) => e.message).join(' | ')
      console.error('[Bootstrap GQL error]', msg)
      if (!json.data) throw new Error(msg)
    }
    if (!json.data) throw new Error('No data in bootstrap response')
    return json.data
  }

  // Phase 1: offer + unfiltered calendar in parallel
  const [offerData, calData1] = await Promise.all([
    serverGql<any>(GET_OFFER, { offerId }),
    serverGql<any>(GET_OFFER_CALENDAR, { offerId, people, groups }),
  ])

  const { offer, offerMeta } = normalizeOffer(offerData.offer)
  const initialCalendar = normalizeCalendar(calData1.offer.calendar)

  // Phase 2: derive leading airport + package group
  const leadingAirport = initialCalendar.departureAirports[0]?.iataCode
  const leadingPackageGroup = initialCalendar.packageGroups[0]?.id

  const initialCalendarSelection: BootstrapData['initialCalendarSelection'] = {}
  if (leadingAirport) initialCalendarSelection.departureAirports = [leadingAirport]
  if (leadingPackageGroup) initialCalendarSelection.packageGroup = leadingPackageGroup

  // Phase 3: re-fetch calendar with defaults applied (if any)
  let finalCalendar = initialCalendar
  if (leadingAirport || leadingPackageGroup) {
    const calData2 = await serverGql<any>(GET_OFFER_CALENDAR, {
      offerId,
      people,
      groups,
      departureAirports: leadingAirport ? [leadingAirport] : undefined,
      packageGroups: leadingPackageGroup ? [leadingPackageGroup] : undefined,
    })
    finalCalendar = normalizeCalendar(calData2.offer.calendar)
  }

  return {
    sessionId,
    offer,
    offerMeta,
    calendar: finalCalendar,
    initialCalendarSelection,
  }
}
