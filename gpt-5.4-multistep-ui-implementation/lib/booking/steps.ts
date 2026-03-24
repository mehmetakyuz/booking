import { OfferMeta, StepDefinition } from '@/lib/booking/types'

export function buildSteps(meta: OfferMeta): StepDefinition[] {
  return [
    { id: 'occupancy', label: 'Dates' },
    ...(!meta.isLeisureOnly ? [{ id: 'accommodation', label: 'Rooms' } satisfies StepDefinition] : []),
    { id: 'activities', label: 'Activities' },
    ...(meta.hasFlights ? [{ id: 'flights', label: 'Flights' } satisfies StepDefinition] : []),
    ...(meta.hasCars ? [{ id: 'cars', label: 'Cars' } satisfies StepDefinition] : []),
    { id: 'checkout', label: 'Confirm & pay' },
  ]
}
