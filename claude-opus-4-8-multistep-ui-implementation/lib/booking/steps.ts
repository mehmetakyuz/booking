import { OfferMeta, StepDefinition, StepId } from "./types";

// Build the visible step list from offer flags.
//   1 Dates          - always
//   2 Rooms          - !isLeisureOnly
//   3 Activities     - always
//   4 Flights        - hasFlights
//   5 Cars           - hasCars
//   6 Confirm & pay  - always
export function buildSteps(meta: OfferMeta | undefined): StepDefinition[] {
  const ids: StepId[] = ["dates"];
  if (!meta?.isLeisureOnly) ids.push("rooms");
  ids.push("activities");
  if (meta?.hasFlights) ids.push("flights");
  if (meta?.hasCars) ids.push("cars");
  ids.push("checkout");

  const labels: Record<StepId, string> = {
    dates: "Dates",
    rooms: "Rooms",
    activities: "Activities",
    flights: "Flights",
    cars: "Cars",
    checkout: "Confirm & pay",
  };

  return ids.map((id, i) => ({ id, label: labels[id], index: i + 1 }));
}
