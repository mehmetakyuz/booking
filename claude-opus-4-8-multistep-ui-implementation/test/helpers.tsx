import { vi } from "vitest";
import type { BookingContextValue } from "@/lib/booking/context";
import { buildSteps } from "@/lib/booking/steps";
import * as fx from "./fixtures";

// A complete, mutable booking state with sensible loaded defaults. Component
// tests override only the slice they care about.
export function makeState(over: Partial<BookingContextValue["state"]> = {}) {
  const meta = fx.offerMeta();
  return {
    payload: {
      offerId: "off-1",
      sessionId: "se-1",
      offerMeta: meta,
      people: [{}, {}],
      groups: [{ people: [0, 1] }],
      departureAirports: ["LHR"],
      packageGroup: "pg1",
      nights: 7,
      selectedDate: "2026-06-10",
      tourUnit: null,
      products: [{ id: "B:1" }],
      coupons: [],
      numOfInstalments: 1,
    },
    offerMeta: meta,
    steps: buildSteps(meta),
    currentStep: "dates" as const,
    booting: false,
    hydrating: false,
    calendar: fx.calendar(),
    calendarLoading: false,
    nightsFilter: null,
    flexStartDate: null,
    receipt: fx.receipt(),
    receiptLoading: false,
    receiptError: null,
    stayValid: true,
    accommodations: [fx.accommodation()],
    accommodationsLoading: false,
    activities: fx.activityData(),
    activitiesLoading: false,
    flights: [fx.flight(), fx.flight({ id: "F:2", selected: false, price: 109000 })],
    flightsStatus: "ready" as const,
    flightPriceNotice: null,
    cars: [fx.car(), fx.car({ id: "C:2", selected: false, price: 104000 })],
    carsStatus: "ready" as const,
    carExtras: [fx.carExtra()],
    carExtrasLoading: false,
    checkoutMeta: fx.checkoutMeta(),
    checkoutLoading: false,
    ...over,
  };
}

// Build a full context value with spy actions; override state or actions.
export function makeCtx(
  stateOver: Partial<BookingContextValue["state"]> = {},
  actionsOver: Partial<BookingContextValue> = {},
): BookingContextValue {
  return {
    state: makeState(stateOver) as BookingContextValue["state"],
    setOccupancy: vi.fn(),
    setAirport: vi.fn(),
    setPackageType: vi.fn(),
    setPackageGroup: vi.fn(),
    setNightsFilter: vi.fn(),
    selectDate: vi.fn(),
    clearFlexSelection: vi.fn(),
    navigateCalendarMonth: vi.fn(),
    goToStep: vi.fn(),
    continueFrom: vi.fn(),
    resetToDates: vi.fn(),
    selectHotel: vi.fn(),
    selectRoom: vi.fn(),
    selectBoard: vi.fn(),
    selectActivityUnit: vi.fn(),
    removeActivity: vi.fn(),
    selectFlight: vi.fn(),
    selectCar: vi.fn(),
    toggleCarExtra: vi.fn(),
    setInstalments: vi.fn(),
    setLeadPassenger: vi.fn(),
    submitOrder: vi.fn().mockResolvedValue({ ok: true }),
    ...actionsOver,
  };
}
