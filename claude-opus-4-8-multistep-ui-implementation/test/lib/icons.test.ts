import { describe, expect, it } from "vitest";
import { Bed, Plane, Car, Clock, Bus, MapPin, Wifi, Building2 } from "lucide-react";
import { facilityIcon, itineraryIcon } from "@/lib/booking/icons";
import { ItineraryType } from "@/lib/booking/types";

describe("itineraryIcon", () => {
  it("maps each known itinerary type", () => {
    expect(itineraryIcon("accommodation")).toBe(Bed);
    expect(itineraryIcon("flight")).toBe(Plane);
    expect(itineraryIcon("car")).toBe(Car);
    expect(itineraryIcon("activity")).toBe(Clock);
    expect(itineraryIcon("transfer")).toBe(Bus);
    expect(itineraryIcon("other")).toBe(MapPin);
  });

  it("falls back to MapPin for an unmapped type", () => {
    expect(itineraryIcon("mystery" as ItineraryType)).toBe(MapPin);
  });
});

describe("facilityIcon", () => {
  it("returns Building2 for a null token", () => {
    expect(facilityIcon(null)).toBe(Building2);
  });

  it("maps known facility tokens", () => {
    expect(facilityIcon("wifi")).toBe(Wifi);
  });

  it("falls back to Building2 for unknown tokens", () => {
    expect(facilityIcon("teleporter")).toBe(Building2);
  });
});
