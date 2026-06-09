'use client'

import React from 'react'
import {
  Bath, Bus, Building2, CarFront, Check, CigaretteOff, Clock, Coffee, ConciergeBell,
  CupSoda, Flower2, MapPin, Plane, SquareParking, UtensilsCrossed, Wifi, ArrowUpDown,
} from 'lucide-react'
import type { ItineraryComponent } from '@/lib/types'

// Facility icons key off stable backend `icon` tokens, never label heuristics.
const FACILITY_ICONS: Record<string, React.ComponentType<{ size?: number | string }>> = {
  wifi: Wifi,
  restaurant: UtensilsCrossed,
  lift: ArrowUpDown,
  'front-desk': ConciergeBell,
  'private-bathroom': Bath,
  'tea-facilities': CupSoda,
  'coffee-machine': Coffee,
  parking: SquareParking,
  spa: Flower2,
  'smoking-no': CigaretteOff,
}

export function FacilityIcon({ token, size = 16 }: { token: string | null; size?: number }) {
  const Icon = (token && FACILITY_ICONS[token]) || Check
  return <Icon size={size} />
}

// Itinerary component-type icons. Raw __typename values are never rendered.
const COMPONENT_ICONS: Record<ItineraryComponent['type'], React.ComponentType<{ size?: number | string }>> = {
  accommodation: Building2,
  flight: Plane,
  car: CarFront,
  activity: Clock,
  transfer: Bus,
  other: MapPin,
}

export function ComponentTypeIcon({ type, size = 16 }: { type: ItineraryComponent['type']; size?: number }) {
  const Icon = COMPONENT_ICONS[type] ?? MapPin
  return <Icon size={size} />
}
