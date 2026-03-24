import {
  Wifi,
  Utensils,
  ArrowUpFromLine,
  ConciergeBell,
  Bath,
  Coffee,
  CupSoda,
  ParkingSquare,
  Sparkles,
  Ban,
  CheckCircle2,
} from 'lucide-react'

export function FacilityIcon({ icon, size = 16 }: { icon?: string | null; size?: number }) {
  switch (icon) {
    case 'wifi':
      return <Wifi size={size} />
    case 'restaurant':
      return <Utensils size={size} />
    case 'lift':
      return <ArrowUpFromLine size={size} />
    case 'front-desk':
      return <ConciergeBell size={size} />
    case 'private-bathroom':
      return <Bath size={size} />
    case 'tea-facilities':
      return <Coffee size={size} />
    case 'coffee-machine':
      return <CupSoda size={size} />
    case 'parking':
      return <ParkingSquare size={size} />
    case 'spa':
      return <Sparkles size={size} />
    case 'smoking-no':
      return <Ban size={size} />
    default:
      return <CheckCircle2 size={size} />
  }
}
