import {
  Bed,
  Plane,
  Car,
  Clock,
  Bus,
  MapPin,
  Wifi,
  Utensils,
  ArrowUpDown,
  ConciergeBell,
  Bath,
  Coffee,
  CupSoda,
  ParkingCircle,
  Flower2,
  CigaretteOff,
  Dumbbell,
  Waves,
  Wind,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { ItineraryType } from "./types";

// Itinerary component-type → icon. Never render raw __typename to users.
const ITINERARY_ICON: Record<ItineraryType, LucideIcon> = {
  accommodation: Bed,
  flight: Plane,
  car: Car,
  activity: Clock,
  transfer: Bus,
  other: MapPin,
};

export function itineraryIcon(type: ItineraryType): LucideIcon {
  return ITINERARY_ICON[type] ?? MapPin;
}

// Backend facility `icon` token → icon. Stable mapping off backend tokens, not
// string heuristics on translated labels.
const FACILITY_ICON: Record<string, LucideIcon> = {
  wifi: Wifi,
  restaurant: Utensils,
  lift: ArrowUpDown,
  "front-desk": ConciergeBell,
  "private-bathroom": Bath,
  "tea-facilities": Coffee,
  "coffee-machine": CupSoda,
  parking: ParkingCircle,
  spa: Flower2,
  "smoking-no": CigaretteOff,
  gym: Dumbbell,
  pool: Waves,
  "air-conditioning": Wind,
  facilities: Building2,
};

export function facilityIcon(token: string | null): LucideIcon {
  if (!token) return Building2;
  return FACILITY_ICON[token] ?? Building2;
}
