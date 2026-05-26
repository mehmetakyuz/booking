import {
  ArrowLeftRight,
  ArrowUpDown,
  Bath,
  BedDouble,
  Building2,
  Car,
  CigaretteOff,
  Clock,
  Coffee,
  ConciergeBell,
  LucideIcon,
  MapPin,
  ParkingSquare,
  Plane,
  Sparkles,
  Utensils,
  Wifi,
} from "lucide-react";
import { ItineraryComponentType } from "@/lib/booking/types";

// Itinerary / product-type icons. Never render the raw __typename.
const ITINERARY_ICON: Record<ItineraryComponentType, LucideIcon> = {
  accommodation: Building2,
  flight: Plane,
  car: Car,
  activity: Clock,
  transfer: ArrowLeftRight,
};

export function ItineraryIcon({
  type,
  size = 16,
}: {
  type: ItineraryComponentType;
  size?: number;
}) {
  const Cmp = ITINERARY_ICON[type] ?? Clock;
  return <Cmp size={size} strokeWidth={1.75} />;
}

// Facility icons keyed off stable backend `icon` tokens (not translated labels).
const FACILITY_ICON: Record<string, LucideIcon> = {
  wifi: Wifi,
  restaurant: Utensils,
  lift: ArrowUpDown,
  "front-desk": ConciergeBell,
  "private-bathroom": Bath,
  "tea-facilities": Coffee,
  "coffee-machine": Coffee,
  parking: ParkingSquare,
  spa: Sparkles,
  "smoking-no": CigaretteOff,
  bed: BedDouble,
  location: MapPin,
};

export function FacilityIcon({
  token,
  size = 16,
}: {
  token: string | null;
  size?: number;
}) {
  const Cmp = (token && FACILITY_ICON[token]) || Sparkles;
  return <Cmp size={size} strokeWidth={1.75} />;
}

export function hasFacilityIcon(token: string | null): boolean {
  return !!token && token in FACILITY_ICON;
}
