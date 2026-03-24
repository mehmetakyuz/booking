import { Plane, Building2, Car, Clock3 } from 'lucide-react'

export function ItineraryIcon({ type, size = 16 }: { type?: string; size?: number }) {
  const t = (type ?? '').toLowerCase()
  if (t.includes('flight')) return <Plane size={size} />
  if (t.includes('accommodation') || t.includes('hotel')) return <Building2 size={size} />
  if (t.includes('car')) return <Car size={size} />
  return <Clock3 size={size} />
}

export function typeFromTypename(typename?: string): string {
  if (!typename) return 'activity'
  const s = typename.toLowerCase()
  if (s.includes('flight')) return 'flight'
  if (s.includes('accommodation')) return 'accommodation'
  if (s.includes('car')) return 'car'
  if (s.includes('leisure') || s.includes('activity')) return 'activity'
  return 'activity'
}
