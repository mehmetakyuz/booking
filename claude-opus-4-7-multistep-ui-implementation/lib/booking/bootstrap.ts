import * as api from "./api";
import { BookingInit } from "./context";
import { buildSteps } from "./steps";
import { BookingPayload } from "./types";
import { Snapshot } from "./url-state";

// Two-stage boot (spec-api §Bootstrap convention):
//  1. fetch offer + unfiltered calendar facets for the default party (2 adults)
//  2. pick the leading airport + package group, refetch the filtered calendar
export async function bootstrap(
  offerId: string,
  sessionId: string,
  snapshot: Snapshot | null,
): Promise<BookingInit> {
  const offer = await api.fetchOffer(offerId, sessionId);
  const steps = buildSteps(offer);

  if (snapshot) {
    return restoreFrom(offer, steps, offerId, sessionId, snapshot);
  }

  // Phase 1: default party, no airport/package filter, "All nights".
  const basePayload: BookingPayload = {
    offerId,
    sessionId,
    people: [{}, {}],
    groups: [{ people: [0, 1] }],
    products: [],
    numOfInstalments: 1,
  };
  const facets = await api.fetchCalendar(basePayload, null, undefined, sessionId);

  const leadingAirport =
    facets.airports.find((a) => a.selected) ?? facets.airports[0];
  const leadingGroup = facets.packageGroups[0];

  const payload: BookingPayload = {
    ...basePayload,
    departureAirports: leadingAirport ? [leadingAirport.iataCode] : undefined,
    packageGroup: leadingGroup ? leadingGroup.id : undefined,
  };

  // Phase 2: filtered calendar so the UI doesn't visibly jump.
  const nightsFilter: number | null = null;
  const calendar = await api.fetchCalendar(
    payload,
    nightsFilter,
    undefined,
    sessionId,
  );

  return {
    offer,
    sessionId,
    steps,
    payload,
    calendar,
    nightsFilter,
    stepIndex: 0,
    receipt: null,
  };
}

async function restoreFrom(
  offer: BookingInit["offer"],
  steps: BookingInit["steps"],
  offerId: string,
  sessionId: string,
  snap: Snapshot,
): Promise<BookingInit> {
  const payload: BookingPayload = {
    offerId,
    sessionId,
    people: snap.people,
    groups: snap.groups,
    departureAirports: snap.departureAirports,
    packageGroup: snap.packageGroup,
    nights: snap.nights ?? null,
    selectedDate: snap.selectedDate,
    products: snap.products ?? [],
    coupons: snap.coupons,
    numOfInstalments: snap.numOfInstalments ?? 1,
  };
  const nightsFilter = snap.nightsFilter ?? snap.nights ?? null;

  const calendar = await api.fetchCalendar(
    payload,
    nightsFilter,
    undefined,
    sessionId,
  );

  let receipt = null;
  if (payload.selectedDate) {
    try {
      receipt = await api.fetchReceipt(payload, sessionId);
    } catch {
      receipt = null;
    }
  }

  return {
    offer,
    sessionId,
    steps,
    payload,
    calendar,
    nightsFilter,
    stepIndex: Math.min(snap.step ?? 0, steps.length - 1),
    receipt,
  };
}
