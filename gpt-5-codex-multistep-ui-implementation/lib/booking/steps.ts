import { OfferMeta, StepDefinition } from '@/lib/booking/types'

export function buildSteps(meta: OfferMeta): StepDefinition[] {
  return [
    { id: 'occupancy', label: 'Travellers and dates' },
    ...(!meta.isLeisureOnly ? [{ id: 'accommodation', label: 'Your room' } satisfies StepDefinition] : []),
    { id: 'activities', label: 'Activities' },
    ...(meta.hasFlights ? [{ id: 'flights', label: 'Flights' } satisfies StepDefinition] : []),
    ...(meta.hasCars ? [{ id: 'cars', label: 'Car hire' } satisfies StepDefinition] : []),
    { id: 'checkout', label: 'Checkout' },
  ]
}
