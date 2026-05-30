import { describe, expect, it } from "vitest";
import { buildSteps } from "@/lib/booking/steps";
import { OfferMeta } from "@/lib/booking/types";

function meta(over: Partial<OfferMeta>): OfferMeta {
  return {
    id: "1",
    title: "t",
    shortTitle: "t",
    currency: "GBP",
    selectDate: true,
    isRoundtrip: true,
    hasFlights: false,
    hasCars: false,
    hasAccommodationUnits: true,
    isLeisureOnly: false,
    price: 0,
    oldPrice: 0,
    gallery: [],
    includedList: [],
    excludedList: [],
    informationList: [],
    occupancyRules: {
      minAdults: 1,
      maxAdults: 4,
      minChildren: 0,
      maxChildren: 4,
      minChildAge: 0,
      maxChildAge: 17,
    },
    ...over,
  };
}

describe("buildSteps", () => {
  it("defaults (undefined meta) to dates/rooms/activities/checkout", () => {
    const steps = buildSteps(undefined);
    expect(steps.map((s) => s.id)).toEqual([
      "dates",
      "rooms",
      "activities",
      "checkout",
    ]);
    expect(steps.map((s) => s.index)).toEqual([1, 2, 3, 4]);
    expect(steps[3].label).toBe("Confirm & pay");
  });

  it("omits rooms for leisure-only offers", () => {
    const steps = buildSteps(meta({ isLeisureOnly: true }));
    expect(steps.map((s) => s.id)).toEqual(["dates", "activities", "checkout"]);
  });

  it("includes flights and cars when the offer has them", () => {
    const steps = buildSteps(meta({ hasFlights: true, hasCars: true }));
    expect(steps.map((s) => s.id)).toEqual([
      "dates",
      "rooms",
      "activities",
      "flights",
      "cars",
      "checkout",
    ]);
    expect(steps[3].label).toBe("Flights");
    expect(steps[4].label).toBe("Cars");
  });
});
