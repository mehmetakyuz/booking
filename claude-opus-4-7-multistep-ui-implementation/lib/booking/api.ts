import { gql } from "../graphql/client";
import {
  ACCOMMODATION_QUERY,
  CALENDAR_QUERY,
  CARS_QUERY,
  CAR_EXTRAS_QUERY,
  CHECKOUT_META_QUERY,
  CREATE_ORDER,
  FLIGHTS_QUERY,
  LEISURE_QUERY,
  OFFER_QUERY,
  POLL_TASK_GROUP,
  RECEIPT_QUERY,
  START_TASK_GROUP,
} from "../graphql/queries";
import {
  checkoutPaymentMethods,
  normalizeAccommodations,
  normalizeCalendar,
  normalizeCarExtras,
  normalizeCars,
  normalizeCheckoutMeta,
  normalizeFlights,
  normalizeLeisure,
  normalizeOffer,
  normalizeReceipt,
} from "./normalize";
import { stripProductsByPrefix } from "./products";
import {
  Accommodation,
  BookingPayload,
  Car,
  CarExtraOption,
  CalendarData,
  CheckoutMeta,
  Flight,
  LeisureData,
  OfferMeta,
  PaymentMethod,
  ReceiptData,
} from "./types";
import {
  calendarVariables,
  dynamicPackageVariables,
  receiptVariables,
} from "./variables";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function fetchOffer(
  offerId: string,
  sessionId: string,
): Promise<OfferMeta> {
  const data = await gql<any>(OFFER_QUERY, { id: offerId }, sessionId);
  if (!data.offer) throw new Error("Offer not found");
  return normalizeOffer(data.offer);
}

export async function fetchCalendar(
  payload: BookingPayload,
  nightsFilter: number | null,
  range: { dateFrom?: string; dateTo?: string } | undefined,
  sessionId: string,
): Promise<CalendarData> {
  const data = await gql<any>(
    CALENDAR_QUERY,
    calendarVariables(payload, nightsFilter, range),
    sessionId,
  );
  return normalizeCalendar(data.offer);
}

export async function fetchReceipt(
  payload: BookingPayload,
  sessionId: string,
): Promise<ReceiptData> {
  const data = await gql<any>(
    RECEIPT_QUERY,
    receiptVariables(payload),
    sessionId,
  );
  return normalizeReceipt(data.dynamicPackageReceipt ?? {});
}

export async function fetchAccommodations(
  payload: BookingPayload,
  sessionId: string,
): Promise<Accommodation[]> {
  // Strip own family so the API returns all options, not just the current pick.
  const stripped: BookingPayload = {
    ...payload,
    products: stripProductsByPrefix(payload.products, "A:"),
  };
  const data = await gql<any>(
    ACCOMMODATION_QUERY,
    dynamicPackageVariables(stripped),
    sessionId,
  );
  return normalizeAccommodations(data.dynamicPackage ?? {});
}

export async function fetchLeisure(
  payload: BookingPayload,
  sessionId: string,
): Promise<LeisureData> {
  const stripped: BookingPayload = {
    ...payload,
    products: stripProductsByPrefix(payload.products, "L:"),
  };
  const data = await gql<any>(
    LEISURE_QUERY,
    dynamicPackageVariables(stripped),
    sessionId,
  );
  return normalizeLeisure(data.dynamicPackage ?? {});
}

// ---------------------------------------------------------------------------
// Task-group polling (flights and cars)
// ---------------------------------------------------------------------------

type TaskStatus = "PROCESSING" | "FINISHED" | "FAILED";

async function startTaskGroup(
  key: string,
  payload: BookingPayload,
  sessionId: string,
): Promise<string> {
  const data = await gql<any>(
    START_TASK_GROUP,
    { tasks: [{ key, dynamicPackage: dynamicPackageVariables(payload) }] },
    sessionId,
  );
  const id = data.startTaskGroup?.taskGroupId;
  if (!id) throw new Error("Task group did not start");
  return id;
}

async function pollUntilDone(
  taskGroupId: string,
  sessionId: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<TaskStatus> {
  const timeoutMs = opts.timeoutMs ?? 60000;
  const intervalMs = opts.intervalMs ?? 1500;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const data = await gql<any>(POLL_TASK_GROUP, { taskGroupId }, sessionId);
    const status: TaskStatus = data.pollTaskGroup?.status ?? "PROCESSING";
    if (status === "FINISHED") return "FINISHED";
    if (status === "FAILED") return "FAILED";
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return "FAILED";
}

export type FlightStage = "searching" | "validating";

export async function searchFlights(
  payload: BookingPayload,
  sessionId: string,
  onStage?: (stage: FlightStage) => void,
): Promise<Flight[]> {
  onStage?.("searching");
  const searchId = await startTaskGroup("FLIGHT_SEARCH", payload, sessionId);
  if ((await pollUntilDone(searchId, sessionId)) === "FAILED") {
    throw new Error("FLIGHT_SEARCH_FAILED");
  }

  onStage?.("validating");
  const valId = await startTaskGroup(
    "FLIGHT_PRICE_VALIDATION",
    payload,
    sessionId,
  );
  if ((await pollUntilDone(valId, sessionId)) === "FAILED") {
    throw new Error("FLIGHT_VALIDATION_FAILED");
  }

  const data = await gql<any>(
    FLIGHTS_QUERY,
    dynamicPackageVariables(payload),
    sessionId,
  );
  const flights = normalizeFlights(data.dynamicPackage ?? {});
  if (!flights.length) throw new Error("FLIGHT_NO_RESULTS");
  return flights;
}

export async function searchCars(
  payload: BookingPayload,
  sessionId: string,
): Promise<Car[]> {
  const searchId = await startTaskGroup("CAR_SEARCH", payload, sessionId);
  if ((await pollUntilDone(searchId, sessionId)) === "FAILED") {
    throw new Error("CAR_SEARCH_FAILED");
  }
  const data = await gql<any>(
    CARS_QUERY,
    dynamicPackageVariables(payload),
    sessionId,
  );
  const cars = normalizeCars(data.dynamicPackage ?? {});
  if (!cars.length) throw new Error("CAR_NO_RESULTS");
  return cars;
}

export async function fetchCarExtras(
  carProductSetId: string,
  payload: BookingPayload,
  sessionId: string,
): Promise<CarExtraOption[]> {
  // Extras are produced by an async task group keyed on the selected car.
  const groupId = await startTaskGroup("CAR_EXTRAS", payload, sessionId);
  await pollUntilDone(groupId, sessionId, { timeoutMs: 30000 });
  const data = await gql<any>(CAR_EXTRAS_QUERY, { carProductSetId }, sessionId);
  return normalizeCarExtras(data);
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export async function fetchCheckoutMeta(
  payload: BookingPayload,
  sessionId: string,
): Promise<{ meta: CheckoutMeta; paymentMethods: PaymentMethod[] }> {
  const data = await gql<any>(
    CHECKOUT_META_QUERY,
    dynamicPackageVariables(payload),
    sessionId,
  );
  return {
    meta: normalizeCheckoutMeta(data),
    paymentMethods: checkoutPaymentMethods(data),
  };
}

export interface CreateOrderArgs {
  payload: BookingPayload;
  totalPrice: number;
  paymentMethod: string | null;
  restoreUrl: string;
}

export async function createOrder(
  args: CreateOrderArgs,
  sessionId: string,
): Promise<{ continueUrl: string | null; errors: any[] }> {
  const { payload, totalPrice, paymentMethod, restoreUrl } = args;
  const properties = [
    ...(payload.properties ?? []),
    { name: "restore_url", value: restoreUrl },
  ];
  const data = await gql<any>(
    CREATE_ORDER,
    {
      offerId: payload.offerId,
      customer: 0,
      people: payload.people,
      groups: payload.groups,
      date: payload.selectedDate,
      nights: payload.nights ?? undefined,
      departureAirports:
        payload.departureAirports && payload.departureAirports.length
          ? payload.departureAirports
          : undefined,
      tourUnit: payload.tourUnit ?? undefined,
      packageGroup: payload.packageGroup ? payload.packageGroup : undefined,
      products: payload.products,
      coupons: payload.coupons,
      numOfInstalments: payload.numOfInstalments ?? 1,
      deferred: payload.deferred ?? false,
      paymentMethod: paymentMethod ?? undefined,
      totalPrice,
      properties,
      priceSeen: payload.priceSeen ?? undefined,
    },
    sessionId,
  );
  const result = data.createOrder?.result ?? {};
  return {
    continueUrl: result.paymentResult?.continueUrl ?? null,
    errors: result.errors ?? [],
  };
}
