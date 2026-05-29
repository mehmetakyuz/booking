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
  Accommodation,
  ActivityData,
  BookingPayload,
  Car,
  CarExtra,
  CheckoutMeta,
  Flight,
  OfferMeta,
  CalendarData,
  ReceiptData,
} from "./types";
import {
  calendarVariables,
  dynamicPackageVariables,
  receiptVariables,
  taskDynamicPackage,
} from "./variables";
import {
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

/* eslint-disable @typescript-eslint/no-explicit-any */

// --------------------------------------------------------------------------
// Offer + calendar
// --------------------------------------------------------------------------

export async function fetchOffer(
  offerId: string,
  sessionId: string,
): Promise<OfferMeta> {
  const data = await gql<any>(OFFER_QUERY, { id: offerId }, sessionId);
  return normalizeOffer(data);
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
  return normalizeCalendar(data);
}

// --------------------------------------------------------------------------
// Receipt
// --------------------------------------------------------------------------

export async function fetchReceipt(
  payload: BookingPayload,
  sessionId: string,
): Promise<ReceiptData> {
  const data = await gql<any>(RECEIPT_QUERY, receiptVariables(payload), sessionId);
  return normalizeReceipt(data.dynamicPackageReceipt ?? {});
}

// --------------------------------------------------------------------------
// Accommodation / leisure (strip own family before fetching options)
// --------------------------------------------------------------------------

export async function fetchAccommodations(
  payload: BookingPayload,
  sessionId: string,
): Promise<Accommodation[]> {
  const stripped: BookingPayload = {
    ...payload,
    products: stripProductsByPrefix(payload.products, "A:"),
  };
  const data = await gql<any>(
    ACCOMMODATION_QUERY,
    dynamicPackageVariables(stripped),
    sessionId,
  );
  return normalizeAccommodations(data);
}

export async function fetchActivities(
  payload: BookingPayload,
  sessionId: string,
): Promise<ActivityData> {
  const stripped: BookingPayload = {
    ...payload,
    products: stripProductsByPrefix(payload.products, "L:"),
  };
  const data = await gql<any>(
    LEISURE_QUERY,
    dynamicPackageVariables(stripped),
    sessionId,
  );
  return normalizeLeisure(data);
}

// --------------------------------------------------------------------------
// Task-group async orchestration
// --------------------------------------------------------------------------

type TaskKey = "FLIGHT_SEARCH" | "FLIGHT_PRICE_VALIDATION" | "CAR_SEARCH";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class TaskGroupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskGroupError";
  }
}

async function runTaskGroup(
  key: TaskKey,
  payload: BookingPayload,
  sessionId: string,
): Promise<void> {
  const startData = await gql<any>(
    START_TASK_GROUP,
    {
      tasks: [{ key, dynamicPackage: taskDynamicPackage(payload) }],
    },
    sessionId,
  );
  const taskGroupId = startData?.startTaskGroup?.taskGroupId;
  if (!taskGroupId) {
    throw new TaskGroupError(`Failed to start ${key}`);
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pollData = await gql<any>(
      POLL_TASK_GROUP,
      { taskGroupId },
      sessionId,
    );
    const status = pollData?.pollTaskGroup?.status;
    if (status === "FINISHED") return;
    if (status === "FAILED") throw new TaskGroupError(`${key} failed`);
    if (Date.now() > deadline) throw new TaskGroupError(`${key} timed out`);
    await sleep(POLL_INTERVAL_MS);
  }
}

// --------------------------------------------------------------------------
// Flights
// --------------------------------------------------------------------------

export async function searchFlights(
  payload: BookingPayload,
  sessionId: string,
): Promise<Flight[]> {
  await runTaskGroup("FLIGHT_SEARCH", payload, sessionId);
  await runTaskGroup("FLIGHT_PRICE_VALIDATION", payload, sessionId);
  const data = await gql<any>(
    FLIGHTS_QUERY,
    dynamicPackageVariables({
      ...payload,
      products: stripProductsByPrefix(payload.products, "F:"),
    }),
    sessionId,
  );
  return normalizeFlights(data);
}

// --------------------------------------------------------------------------
// Cars
// --------------------------------------------------------------------------

export async function searchCars(
  payload: BookingPayload,
  sessionId: string,
): Promise<Car[]> {
  await runTaskGroup("CAR_SEARCH", payload, sessionId);
  const data = await gql<any>(
    CARS_QUERY,
    dynamicPackageVariables({
      ...payload,
      products: stripProductsByPrefix(payload.products, "C:"),
    }),
    sessionId,
  );
  return normalizeCars(data);
}

export async function fetchCarExtras(
  carProductSetId: string,
  sessionId: string,
): Promise<CarExtra[]> {
  const data = await gql<any>(
    CAR_EXTRAS_QUERY,
    { carProductSetId },
    sessionId,
  );
  return normalizeCarExtras(data);
}

// --------------------------------------------------------------------------
// Checkout metadata
// --------------------------------------------------------------------------

export async function fetchCheckoutMeta(
  payload: BookingPayload,
  sessionId: string,
): Promise<CheckoutMeta> {
  const data = await gql<any>(
    CHECKOUT_META_QUERY,
    dynamicPackageVariables(payload),
    sessionId,
  );
  return normalizeCheckoutMeta(data);
}

// --------------------------------------------------------------------------
// Order creation
// --------------------------------------------------------------------------

export interface CreateOrderResult {
  continueUrl?: string;
  errors: { code?: string; field?: string; message?: string }[];
  restoreUrl?: string;
}

export async function createOrder(
  payload: BookingPayload,
  opts: { paymentMethod?: string; totalPrice: number; restoreUrl: string },
  sessionId: string,
): Promise<CreateOrderResult> {
  const properties = [
    ...(payload.properties ?? []),
    { key: "restore_url", value: opts.restoreUrl },
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
      paymentMethod: opts.paymentMethod,
      totalPrice: opts.totalPrice,
      properties,
      priceSeen: payload.priceSeen ?? undefined,
    },
    sessionId,
  );
  const result = data?.createOrder?.result ?? {};
  return {
    continueUrl: result.paymentResult?.continueUrl ?? undefined,
    errors: Array.isArray(result.errors) ? result.errors : [],
    restoreUrl: result.order?.restoreUrl ?? undefined,
  };
}
