import { OfferMeta, StepDefinition } from './types'

export function buildSteps(meta: OfferMeta): StepDefinition[] {
  const steps: StepDefinition[] = [{ id: 'dates', label: 'Dates' }]

  if (!meta.isLeisureOnly) {
    steps.push({ id: 'rooms', label: 'Rooms' })
  }

  steps.push({ id: 'activities', label: 'Activities' })

  if (meta.hasFlights) {
    steps.push({ id: 'flights', label: 'Flights' })
  }
  if (meta.hasCars) {
    steps.push({ id: 'cars', label: 'Cars' })
  }

  steps.push({ id: 'checkout', label: 'Confirm & pay' })

  return steps
}
