import type { OfferMeta, StepDefinition } from './types'

export function buildSteps(offerMeta: OfferMeta): StepDefinition[] {
  const list: StepDefinition[] = []
  list.push({ id: 'dates', number: 1, label: 'Dates' })
  if (!offerMeta.isLeisureOnly) list.push({ id: 'rooms', number: 2, label: 'Rooms' })
  list.push({ id: 'activities', number: 3, label: 'Activities' })
  if (offerMeta.hasFlights) list.push({ id: 'flights', number: 4, label: 'Flights' })
  if (offerMeta.hasCars) list.push({ id: 'cars', number: 5, label: 'Cars' })
  list.push({ id: 'checkout', number: 6, label: 'Confirm & pay' })
  return list.map((s, i) => ({ ...s, number: i + 1 }))
}

export function sessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'ses-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
