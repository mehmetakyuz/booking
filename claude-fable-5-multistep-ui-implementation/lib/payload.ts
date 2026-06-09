import type { BookingPayload, PersonInput, PersonGroupsInput, ProductInput } from './types'

// Product IDs come back from the API with their family prefix already included
// (e.g. "A:386918317"). Helpers match by that prefix; never add another one.

export type ProductPrefix = 'A:' | 'C:' | 'F:' | 'L:' | 'S:'

export function stripProductsByPrefix(products: ProductInput[] | undefined, prefix: ProductPrefix): ProductInput[] {
  return (products ?? []).filter((p) => !p.id.startsWith(prefix))
}

// Replace the existing product of the same family with the new one.
export function replaceProduct(products: ProductInput[] | undefined, product: ProductInput): ProductInput[] {
  const prefix = product.id.slice(0, product.id.indexOf(':') + 1) as ProductPrefix
  return [...stripProductsByPrefix(products, prefix), product]
}

// Leisure products replace per group, not globally: remove only the unit IDs
// that belong to the given group, then add the new selection (if any).
export function replaceLeisureForGroup(
  products: ProductInput[] | undefined,
  groupUnitIds: string[],
  selectedUnitId: string | null,
): ProductInput[] {
  const ids = new Set(groupUnitIds)
  const rest = (products ?? []).filter((p) => !ids.has(p.id))
  if (selectedUnitId) rest.push({ id: selectedUnitId })
  return rest
}

export function getSelectedProductId(products: ProductInput[] | undefined, prefix: ProductPrefix): string | null {
  return (products ?? []).find((p) => p.id.startsWith(prefix))?.id ?? null
}

// ---- People ----

// Adults are empty PersonInput objects; children carry an age.
export function buildPeople(adults: number, childAges: number[]): PersonInput[] {
  const people: PersonInput[] = []
  for (let i = 0; i < adults; i++) people.push({})
  for (const age of childAges) people.push({ age })
  return people
}

export function buildGroups(people: PersonInput[]): PersonGroupsInput[] {
  return [{ people: people.map((_, i) => i) }]
}

export function describeParty(people: PersonInput[]): string {
  const adults = people.filter((p) => p.age == null).length
  const children = people.length - adults
  const parts = [`${adults} ${adults === 1 ? 'adult' : 'adults'}`]
  if (children > 0) parts.push(`${children} ${children === 1 ? 'child' : 'children'}`)
  return parts.join(', ')
}

export function partyComposition(people: PersonInput[]): { adults: number; childAges: number[] } {
  const adults = people.filter((p) => p.age == null).length
  const childAges = people.filter((p) => p.age != null).map((p) => p.age!)
  return { adults, childAges }
}

// A stay is fully defined once a date and concrete night count exist.
export function hasValidStay(payload: BookingPayload): boolean {
  return Boolean(payload.selectedDate && payload.nights != null)
}

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
