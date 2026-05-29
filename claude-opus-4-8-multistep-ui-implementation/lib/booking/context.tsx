"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  Accommodation,
  ActivityData,
  BookingPayload,
  Car,
  CarExtra,
  CalendarData,
  CheckoutMeta,
  Flight,
  OfferMeta,
  ReceiptData,
  StepDefinition,
  StepId,
} from "./types";
import { createSessionId } from "./session";
import { buildSteps } from "./steps";
import * as api from "./api";
import {
  findProductByPrefix,
  removeProductById,
  replaceProductFamily,
  upsertProduct,
} from "./products";
import {
  readSnapshotFromUrl,
  snapshotFromState,
  writeSnapshotToUrl,
} from "./url-state";
import { addDays } from "./dates";

/* eslint-disable @typescript-eslint/no-explicit-any */

type AsyncStatus = "idle" | "loading" | "ready" | "error";

interface State {
  payload: BookingPayload;
  offerMeta?: OfferMeta;
  steps: StepDefinition[];
  currentStep: StepId;

  booting: boolean;
  bootError?: string;
  hydrating: boolean;

  // dates
  calendar: CalendarData | null;
  calendarLoading: boolean;
  nightsFilter: number | null; // chip filter; null = "All nights"
  flexStartDate: string | null;

  // receipt
  receipt: ReceiptData | null;
  receiptLoading: boolean;
  receiptError: string | null;
  stayValid: boolean;

  // accommodation
  accommodations: Accommodation[] | null;
  accommodationsLoading: boolean;

  // activities
  activities: ActivityData | null;
  activitiesLoading: boolean;

  // flights
  flights: Flight[] | null;
  flightsStatus: AsyncStatus;
  flightPriceNotice: string | null;

  // cars
  cars: Car[] | null;
  carsStatus: AsyncStatus;
  carExtras: CarExtra[] | null;
  carExtrasLoading: boolean;

  // checkout
  checkoutMeta: CheckoutMeta | null;
  checkoutLoading: boolean;
}

type Action =
  | { type: "patch"; patch: Partial<State> }
  | { type: "setPayload"; payload: BookingPayload };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    case "setPayload":
      return { ...state, payload: action.payload };
    default:
      return state;
  }
}

function initialPayload(offerId: string, sessionId: string): BookingPayload {
  return {
    offerId,
    sessionId,
    people: [{}, {}], // default: 2 adults
    groups: [{ people: [0, 1] }],
    products: [],
    numOfInstalments: 1,
  };
}

function initialState(offerId: string, sessionId: string): State {
  return {
    payload: initialPayload(offerId, sessionId),
    steps: buildSteps(undefined),
    currentStep: "dates",
    booting: true,
    hydrating: false,
    calendar: null,
    calendarLoading: false,
    nightsFilter: null,
    flexStartDate: null,
    receipt: null,
    receiptLoading: false,
    receiptError: null,
    stayValid: false,
    accommodations: null,
    accommodationsLoading: false,
    activities: null,
    activitiesLoading: false,
    flights: null,
    flightsStatus: "idle",
    flightPriceNotice: null,
    cars: null,
    carsStatus: "idle",
    carExtras: null,
    carExtrasLoading: false,
    checkoutMeta: null,
    checkoutLoading: false,
  };
}

export interface BookingContextValue {
  state: State;
  // dates
  setOccupancy: (adults: number, childrenAges: number[]) => Promise<void>;
  setAirport: (iata: string) => Promise<void>;
  setPackageGroup: (id: string) => Promise<void>;
  setNightsFilter: (n: number | null) => Promise<void>;
  selectDate: (date: string) => Promise<void>;
  clearFlexSelection: () => void;
  // navigation
  goToStep: (id: StepId) => void;
  continueFrom: (id: StepId) => void;
  resetToDates: () => void;
  // rooms
  selectHotel: (hotelId: string) => Promise<void>;
  selectRoom: (hotelId: string, unitId: string) => Promise<void>;
  selectBoard: (boardId: string) => Promise<void>;
  // activities
  selectActivityUnit: (groupId: string, unitId: string) => Promise<void>;
  removeActivity: (groupId: string) => Promise<void>;
  // flights / cars
  selectFlight: (id: string) => Promise<void>;
  selectCar: (id: string) => Promise<void>;
  toggleCarExtra: (extraId: string) => Promise<void>;
  // checkout
  setInstalments: (n: number) => Promise<void>;
  setLeadPassenger: (patch: Record<string, unknown>) => void;
  submitOrder: (opts: {
    paymentMethod?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}

export function BookingProvider({
  offerId,
  children,
}: {
  offerId: string;
  children: React.ReactNode;
}) {
  const firstSession = useRef<string>(createSessionId());
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(offerId, firstSession.current),
  );

  // Always-current refs for async thunks (avoids React batching staleness).
  const stateRef = useRef(state);
  stateRef.current = state;
  const payloadRef = useRef<BookingPayload>(state.payload);

  const patch = useCallback(
    (p: Partial<State>) => dispatch({ type: "patch", patch: p }),
    [],
  );

  // Single source of truth for payload mutation: updates the ref synchronously
  // and dispatches so React state stays in sync.
  const commitPayload = useCallback(
    (p: Partial<BookingPayload>): BookingPayload => {
      const next = { ...payloadRef.current, ...p };
      payloadRef.current = next;
      dispatch({ type: "setPayload", payload: next });
      return next;
    },
    [],
  );

  const sid = () => payloadRef.current.sessionId;

  // ---- receipt repricing -------------------------------------------------
  const reprice = useCallback(
    async (opts: { showSpinner?: boolean } = {}): Promise<ReceiptData | null> => {
      const showSpinner = opts.showSpinner ?? true;
      if (showSpinner) patch({ receiptLoading: true });
      patch({ receiptError: null });
      try {
        const receipt = await api.fetchReceipt(payloadRef.current, sid());
        if (receipt.errors.length > 0) {
          patch({
            receipt,
            receiptLoading: false,
            receiptError:
              receipt.errors[0]?.message ||
              "This combination is no longer available.",
            stayValid: false,
          });
          return receipt;
        }
        patch({
          receipt,
          receiptLoading: false,
          receiptError: null,
          stayValid: true,
        });
        return receipt;
      } catch {
        patch({
          receiptLoading: false,
          receiptError: "We couldn't price this booking. Please try again.",
          stayValid: false,
        });
        return null;
      }
    },
    [patch],
  );

  const handleDownstreamInvalid = useCallback(() => {
    commitPayload({ products: [], selectedDate: undefined, nights: null });
    patch({
      currentStep: "dates",
      stayValid: false,
      receipt: null,
      flexStartDate: null,
      accommodations: null,
      activities: null,
      flights: null,
      flightsStatus: "idle",
      cars: null,
      carsStatus: "idle",
      carExtras: null,
      checkoutMeta: null,
      receiptError:
        "That combination is no longer available. Please choose a new stay.",
    });
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [commitPayload, patch]);

  // Reprice; if a downstream step yields a receipt error, reset to Dates.
  const repriceGuarded = useCallback(async () => {
    const receipt = await reprice({ showSpinner: true });
    if (
      receipt &&
      receipt.errors.length > 0 &&
      stateRef.current.currentStep !== "dates"
    ) {
      handleDownstreamInvalid();
    }
  }, [reprice, handleDownstreamInvalid]);

  // ---- calendar ----------------------------------------------------------
  const loadCalendar = useCallback(
    async (nightsFilter: number | null) => {
      patch({ calendarLoading: true });
      try {
        const calendar = await api.fetchCalendar(
          payloadRef.current,
          nightsFilter,
          undefined,
          sid(),
        );
        patch({ calendar, calendarLoading: false });
        return calendar;
      } catch {
        patch({ calendarLoading: false });
        return null;
      }
    },
    [patch],
  );

  // After a first-step filter change: clear downstream + date, reload calendar.
  const refreshFirstStep = useCallback(
    async (nightsFilter: number | null) => {
      commitPayload({ products: [], selectedDate: undefined, nights: null });
      patch({
        receipt: null,
        stayValid: false,
        receiptError: null,
        flexStartDate: null,
        accommodations: null,
        activities: null,
        flights: null,
        flightsStatus: "idle",
        cars: null,
        carsStatus: "idle",
        carExtras: null,
      });
      await loadCalendar(nightsFilter);
    },
    [commitPayload, loadCalendar, patch],
  );

  // ---- step data loaders -------------------------------------------------
  const ensureDefaultAccommodation = useCallback(
    (accommodations: Accommodation[]) => {
      if (findProductByPrefix(payloadRef.current.products, "A:")) return;
      const hotel = accommodations.find((a) => a.selected) ?? accommodations[0];
      if (!hotel) return;
      const unit = hotel.units.find((u) => u.selected) ?? hotel.units[0];
      if (!unit) return;
      const board = unit.boards.find((b) => b.selected) ?? unit.boards[0];
      const productId = board ? board.id : unit.id;
      commitPayload({
        products: replaceProductFamily(payloadRef.current.products, "A:", {
          id: productId,
        }),
      });
    },
    [commitPayload],
  );

  const loadAccommodations = useCallback(async () => {
    patch({ accommodationsLoading: true });
    try {
      const accommodations = await api.fetchAccommodations(payloadRef.current, sid());
      patch({ accommodations, accommodationsLoading: false });
      ensureDefaultAccommodation(accommodations);
      await reprice({ showSpinner: true });
    } catch {
      patch({ accommodationsLoading: false });
    }
  }, [patch, ensureDefaultAccommodation, reprice]);

  const loadActivities = useCallback(async () => {
    patch({ activitiesLoading: true });
    try {
      const activities = await api.fetchActivities(payloadRef.current, sid());
      patch({ activities, activitiesLoading: false });
    } catch {
      patch({ activitiesLoading: false });
    }
  }, [patch]);

  const loadCarExtrasFor = useCallback(
    async (carProductId: string) => {
      patch({ carExtrasLoading: true });
      try {
        const carExtras = await api.fetchCarExtras(carProductId, sid());
        patch({ carExtras, carExtrasLoading: false });
      } catch {
        patch({ carExtras: [], carExtrasLoading: false });
      }
    },
    [patch],
  );

  const loadFlights = useCallback(async () => {
    patch({ flightsStatus: "loading", flightPriceNotice: null, flights: null });
    const totalBefore = stateRef.current.receipt?.totalPrice ?? null;
    try {
      const flights = await api.searchFlights(payloadRef.current, sid());
      if (!flights.length) {
        patch({ flightsStatus: "error", flights: [] });
        return;
      }
      patch({ flights, flightsStatus: "ready" });
      if (!findProductByPrefix(payloadRef.current.products, "F:")) {
        const def = flights.find((f) => f.selected) ?? flights[0];
        commitPayload({
          products: replaceProductFamily(payloadRef.current.products, "F:", {
            id: def.id,
          }),
        });
      }
      const after = await reprice({ showSpinner: false });
      if (totalBefore != null && after && after.totalPrice !== totalBefore) {
        const diff = after.totalPrice - totalBefore;
        patch({
          flightPriceNotice:
            diff > 0
              ? "Flight prices have been confirmed and your total has increased."
              : "Good news — your total has decreased after confirming flight prices.",
        });
      }
    } catch {
      patch({ flightsStatus: "error", flights: [] });
    }
  }, [patch, commitPayload, reprice]);

  const loadCars = useCallback(async () => {
    patch({ carsStatus: "loading", cars: null, carExtras: null });
    try {
      const cars = await api.searchCars(payloadRef.current, sid());
      if (!cars.length) {
        patch({ carsStatus: "error", cars: [] });
        return;
      }
      patch({ cars, carsStatus: "ready" });
      const existing = findProductByPrefix(payloadRef.current.products, "C:");
      if (!existing) {
        const def = cars.find((c) => c.selected) ?? cars[0];
        commitPayload({
          products: replaceProductFamily(payloadRef.current.products, "C:", {
            id: def.id,
          }),
        });
        await reprice({ showSpinner: false });
        await loadCarExtrasFor(def.id);
      } else {
        await loadCarExtrasFor(existing.id);
      }
    } catch {
      patch({ carsStatus: "error", cars: [] });
    }
  }, [patch, commitPayload, reprice, loadCarExtrasFor]);

  const loadCheckout = useCallback(async () => {
    patch({ checkoutLoading: true });
    try {
      const checkoutMeta = await api.fetchCheckoutMeta(payloadRef.current, sid());
      patch({ checkoutMeta, checkoutLoading: false });
      await reprice({ showSpinner: false });
    } catch {
      patch({ checkoutLoading: false });
    }
  }, [patch, reprice]);

  const loadStepData = useCallback(
    (id: StepId) => {
      if (id === "rooms") return loadAccommodations();
      if (id === "activities") return loadActivities();
      if (id === "flights") return loadFlights();
      if (id === "cars") return loadCars();
      if (id === "checkout") return loadCheckout();
    },
    [loadAccommodations, loadActivities, loadFlights, loadCars, loadCheckout],
  );

  // ---- boot --------------------------------------------------------------
  const hydrateRestoredStep = useCallback(
    async (step: StepId) => {
      const nightsFilter = stateRef.current.nightsFilter;
      try {
        const calendar = await api.fetchCalendar(
          payloadRef.current,
          nightsFilter,
          undefined,
          sid(),
        );
        patch({ calendar });
      } catch {
        /* non-fatal */
      }
      if (payloadRef.current.selectedDate && payloadRef.current.nights != null) {
        await reprice({ showSpinner: true });
      }
      await loadStepData(step);
    },
    [patch, reprice, loadStepData],
  );

  const boot = useCallback(async () => {
    patch({ booting: true, bootError: undefined });
    try {
      const restored = readSnapshotFromUrl();
      const meta = await api.fetchOffer(offerId, firstSession.current);

      if (restored) {
        const restoredPayload: BookingPayload = {
          offerId,
          sessionId: restored.sid,
          offerMeta: meta,
          people: restored.people?.length ? restored.people : [{}, {}],
          groups: restored.groups?.length ? restored.groups : [{ people: [0, 1] }],
          departureAirports: restored.departureAirports,
          packageGroup: restored.packageGroup,
          nights: restored.nights ?? null,
          selectedDate: restored.selectedDate,
          tourUnit: restored.tourUnit ?? null,
          products: restored.products ?? [],
          coupons: restored.coupons,
          numOfInstalments: restored.numOfInstalments ?? 1,
        };
        payloadRef.current = restoredPayload;
        dispatch({ type: "setPayload", payload: restoredPayload });
        patch({
          offerMeta: meta,
          steps: buildSteps(meta),
          currentStep: restored.step,
          nightsFilter: restored.nightsFilter ?? restored.nights ?? null,
          booting: false,
          hydrating: true,
        });
        await hydrateRestoredStep(restored.step);
        patch({ hydrating: false });
        return;
      }

      // Fresh boot: two-stage calendar.
      const base = initialPayload(offerId, firstSession.current);
      base.offerMeta = meta;
      payloadRef.current = base;
      dispatch({ type: "setPayload", payload: base });
      patch({ offerMeta: meta, steps: buildSteps(meta) });

      const facets = await api.fetchCalendar(base, null, undefined, sid());
      const leadingAirport =
        facets.airports.find((a) => a.selected) ?? facets.airports[0];
      const leadingGroup = facets.packageGroups[0];

      commitPayload({
        departureAirports: leadingAirport ? [leadingAirport.iataCode] : undefined,
        packageGroup: leadingGroup ? leadingGroup.id : undefined,
      });

      const calendar = await api.fetchCalendar(payloadRef.current, null, undefined, sid());
      patch({ calendar, booting: false });
    } catch (e: any) {
      patch({
        booting: false,
        bootError: e?.message || "We couldn't load this offer. Please try again.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patch, commitPayload, hydrateRestoredStep]);

  // ---- dates actions -----------------------------------------------------
  const setOccupancy = useCallback(
    async (adults: number, childrenAges: number[]) => {
      const people: BookingPayload["people"] = [];
      const idx: number[] = [];
      for (let i = 0; i < adults; i++) {
        idx.push(people.length);
        people.push({});
      }
      childrenAges.forEach((age) => {
        idx.push(people.length);
        people.push({ birthDate: ageToBirthDate(age) });
      });
      commitPayload({ people, groups: [{ people: idx }] });
      await refreshFirstStep(stateRef.current.nightsFilter);
    },
    [commitPayload, refreshFirstStep],
  );

  const setAirport = useCallback(
    async (iata: string) => {
      commitPayload({ departureAirports: [iata] });
      await refreshFirstStep(stateRef.current.nightsFilter);
    },
    [commitPayload, refreshFirstStep],
  );

  const setPackageGroup = useCallback(
    async (id: string) => {
      commitPayload({ packageGroup: id });
      await refreshFirstStep(stateRef.current.nightsFilter);
    },
    [commitPayload, refreshFirstStep],
  );

  const setNightsFilter = useCallback(
    async (n: number | null) => {
      patch({ nightsFilter: n });
      await refreshFirstStep(n);
    },
    [patch, refreshFirstStep],
  );

  const selectDate = useCallback(
    async (date: string) => {
      const s = stateRef.current;
      const filter = s.nightsFilter;

      if (filter != null) {
        commitPayload({ selectedDate: date, nights: filter, products: [] });
        patch({ flexStartDate: null });
        await reprice({ showSpinner: true });
        return;
      }

      // Flexible (All nights) flow.
      if (!s.flexStartDate) {
        patch({ flexStartDate: date });
        return;
      }
      const startDate = s.flexStartDate;
      const startEntry = s.calendar?.dates.find((d) => d.date === startDate);
      const match = startEntry?.nights.find(
        (n) => addDays(startDate, n.nights) === date,
      );
      if (!match) {
        patch({ flexStartDate: date });
        return;
      }
      commitPayload({ selectedDate: startDate, nights: match.nights, products: [] });
      await reprice({ showSpinner: true });
    },
    [patch, commitPayload, reprice],
  );

  const clearFlexSelection = useCallback(() => {
    commitPayload({ selectedDate: undefined, nights: null, products: [] });
    patch({ flexStartDate: null, receipt: null, stayValid: false });
  }, [commitPayload, patch]);

  // ---- navigation --------------------------------------------------------
  const scrollTop = () => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  };

  const goToStep = useCallback(
    (id: StepId) => {
      patch({ currentStep: id });
      scrollTop();
      const s = stateRef.current;
      const needs =
        (id === "rooms" && !s.accommodations) ||
        (id === "activities" && !s.activities) ||
        (id === "flights" && s.flightsStatus === "idle") ||
        (id === "cars" && s.carsStatus === "idle") ||
        (id === "checkout" && !s.checkoutMeta);
      if (needs) void loadStepData(id);
    },
    [patch, loadStepData],
  );

  const continueFrom = useCallback(
    (id: StepId) => {
      const steps = stateRef.current.steps;
      const idx = steps.findIndex((s) => s.id === id);
      const next = steps[idx + 1];
      if (next) goToStep(next.id);
    },
    [goToStep],
  );

  const resetToDates = useCallback(() => {
    commitPayload({ products: [], selectedDate: undefined, nights: null });
    patch({
      currentStep: "dates",
      stayValid: false,
      receipt: null,
      receiptError: null,
      flexStartDate: null,
      accommodations: null,
      activities: null,
      flights: null,
      flightsStatus: "idle",
      cars: null,
      carsStatus: "idle",
      carExtras: null,
      checkoutMeta: null,
    });
    scrollTop();
  }, [commitPayload, patch]);

  // ---- rooms actions -----------------------------------------------------
  const selectHotel = useCallback(
    async (hotelId: string) => {
      const hotel = stateRef.current.accommodations?.find((a) => a.id === hotelId);
      if (!hotel) return;
      const unit = hotel.units.find((u) => u.selected) ?? hotel.units[0];
      const board = unit?.boards.find((b) => b.selected) ?? unit?.boards[0];
      const productId = board ? board.id : unit?.id;
      if (!productId) return;
      commitPayload({
        products: replaceProductFamily(payloadRef.current.products, "A:", {
          id: productId,
        }),
      });
      await repriceGuarded();
    },
    [commitPayload, repriceGuarded],
  );

  const selectRoom = useCallback(
    async (hotelId: string, unitId: string) => {
      const hotel = stateRef.current.accommodations?.find((a) => a.id === hotelId);
      const unit = hotel?.units.find((u) => u.id === unitId);
      if (!unit) return;
      const board = unit.boards.find((b) => b.selected) ?? unit.boards[0];
      const productId = board ? board.id : unit.id;
      commitPayload({
        products: replaceProductFamily(payloadRef.current.products, "A:", {
          id: productId,
        }),
      });
      await repriceGuarded();
    },
    [commitPayload, repriceGuarded],
  );

  const selectBoard = useCallback(
    async (boardId: string) => {
      commitPayload({
        products: replaceProductFamily(payloadRef.current.products, "A:", {
          id: boardId,
        }),
      });
      await repriceGuarded();
    },
    [commitPayload, repriceGuarded],
  );

  // ---- activities actions ------------------------------------------------
  const selectActivityUnit = useCallback(
    async (groupId: string, unitId: string) => {
      const group = stateRef.current.activities?.groups.find((g) => g.id === groupId);
      if (!group) return;
      let products = payloadRef.current.products ?? [];
      for (const u of group.units) products = removeProductById(products, u.id);
      products = upsertProduct(products, { id: unitId });
      commitPayload({ products });
      await repriceGuarded();
    },
    [commitPayload, repriceGuarded],
  );

  const removeActivity = useCallback(
    async (groupId: string) => {
      const group = stateRef.current.activities?.groups.find((g) => g.id === groupId);
      if (!group) return;
      let products = payloadRef.current.products ?? [];
      for (const u of group.units) products = removeProductById(products, u.id);
      commitPayload({ products });
      await repriceGuarded();
    },
    [commitPayload, repriceGuarded],
  );

  // ---- flights / cars actions -------------------------------------------
  const selectFlight = useCallback(
    async (id: string) => {
      commitPayload({
        products: replaceProductFamily(payloadRef.current.products, "F:", { id }),
      });
      await repriceGuarded();
    },
    [commitPayload, repriceGuarded],
  );

  const selectCar = useCallback(
    async (id: string) => {
      commitPayload({
        products: replaceProductFamily(payloadRef.current.products, "C:", { id }),
      });
      await repriceGuarded();
      await loadCarExtrasFor(id);
    },
    [commitPayload, repriceGuarded, loadCarExtrasFor],
  );

  const toggleCarExtra = useCallback(
    async (extraId: string) => {
      const car = findProductByPrefix(payloadRef.current.products, "C:");
      if (!car) return;
      const options = car.options ?? [];
      const has = options.some((o) => o.id === extraId);
      const nextOptions = has
        ? options.filter((o) => o.id !== extraId)
        : [...options, { id: extraId }];
      commitPayload({
        products: replaceProductFamily(payloadRef.current.products, "C:", {
          id: car.id,
          options: nextOptions,
        }),
      });
      await repriceGuarded();
    },
    [commitPayload, repriceGuarded],
  );

  // ---- checkout actions --------------------------------------------------
  const setInstalments = useCallback(
    async (n: number) => {
      commitPayload({ numOfInstalments: n });
      await reprice({ showSpinner: false });
    },
    [commitPayload, reprice],
  );

  const setLeadPassenger = useCallback(
    (patchData: Record<string, unknown>) => {
      const people = [...payloadRef.current.people];
      people[0] = { ...people[0], ...patchData };
      commitPayload({ people });
    },
    [commitPayload],
  );

  const submitOrder = useCallback(async (opts: { paymentMethod?: string }) => {
    const total = stateRef.current.receipt?.totalPrice;
    if (total == null) return { ok: false, error: "No receipt total available." };
    const restoreUrl = typeof window !== "undefined" ? window.location.href : "";
    try {
      const result = await api.createOrder(
        payloadRef.current,
        { paymentMethod: opts.paymentMethod, totalPrice: total, restoreUrl },
        sid(),
      );
      if (result.errors.length) {
        return { ok: false, error: result.errors[0]?.message || "Order failed." };
      }
      if (result.continueUrl) {
        window.location.href = result.continueUrl;
        return { ok: true };
      }
      return { ok: false, error: "No payment continuation URL returned." };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Order failed." };
    }
  }, []);

  // ---- boot on mount -----------------------------------------------------
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- URL sync (history.replaceState only) ------------------------------
  useEffect(() => {
    if (state.booting) return;
    writeSnapshotToUrl(
      snapshotFromState(state.payload, state.currentStep, state.nightsFilter),
    );
  }, [state.booting, state.payload, state.currentStep, state.nightsFilter]);

  const value = useMemo<BookingContextValue>(
    () => ({
      state,
      setOccupancy,
      setAirport,
      setPackageGroup,
      setNightsFilter,
      selectDate,
      clearFlexSelection,
      goToStep,
      continueFrom,
      resetToDates,
      selectHotel,
      selectRoom,
      selectBoard,
      selectActivityUnit,
      removeActivity,
      selectFlight,
      selectCar,
      toggleCarExtra,
      setInstalments,
      setLeadPassenger,
      submitOrder,
    }),
    [
      state,
      setOccupancy,
      setAirport,
      setPackageGroup,
      setNightsFilter,
      selectDate,
      clearFlexSelection,
      goToStep,
      continueFrom,
      resetToDates,
      selectHotel,
      selectRoom,
      selectBoard,
      selectActivityUnit,
      removeActivity,
      selectFlight,
      selectCar,
      toggleCarExtra,
      setInstalments,
      setLeadPassenger,
      submitOrder,
    ],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

// ---- helpers ------------------------------------------------------------

function ageToBirthDate(age: number): string {
  const now = new Date();
  const year = now.getFullYear() - age;
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${year}-${m}-${d}`;
}
