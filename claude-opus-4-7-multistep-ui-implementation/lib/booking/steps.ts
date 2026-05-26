import { OfferMeta, StepDefinition } from "./types";

// Step inclusion follows offer flags (spec-multistep §Step set).
export function buildSteps(offer: OfferMeta): StepDefinition[] {
  const steps: StepDefinition[] = [{ key: "dates", label: "Dates" }];
  if (!offer.isLeisureOnly) steps.push({ key: "rooms", label: "Rooms" });
  steps.push({ key: "activities", label: "Activities" });
  if (offer.hasFlights) steps.push({ key: "flights", label: "Flights" });
  if (offer.hasCars) steps.push({ key: "cars", label: "Cars" });
  steps.push({ key: "checkout", label: "Confirm & pay" });
  return steps;
}

export function buildPeople(adults: number, childAges: number[]) {
  const people = [
    ...Array.from({ length: adults }, () => ({})),
    ...childAges.map((age) => ({ age })),
  ];
  const groups = [{ people: people.map((_, i) => i) }];
  return { people, groups };
}

export function countAdults(people: { age?: number }[]): number {
  return people.filter((p) => p.age == null).length;
}

export function childAges(people: { age?: number }[]): number[] {
  return people.filter((p) => p.age != null).map((p) => p.age as number);
}
