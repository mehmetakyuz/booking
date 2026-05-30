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
  CalendarData,
  CalendarDate,
  Car,
  CarExtra,
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
import { addDays, monthDateRange, pickInitialMonth, todayString } from "./dates";

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
  calendar: CalendarData | null;        // facets + current month's dates
  calendarLoading: boolean;             // true during filter-driven refetch
  calendarMonth: string | null;         // currently displayed YYYY-MM
  calendarMonthLoading: boolean;        // true while fetching a new month
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
    calendarMonth: null,
    calendarMonthLoading: false,
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
  setPackageType: (type: string) => Promise<void>;
  setPackageGroup: (id: string) => Promise<void>;
  setNightsFilter: (n: number | null) => Promise<void>;
  selectDate: (date: string) => Promise<void>;
  clearFlexSelection: () => void;
  navigateCalendarMonth: (yearMonth: string) => Promise<void>;
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
  // Per-month date cache. Keyed by YYYY-MM. Cleared on every filter change.
  const calendarCacheRef = useRef<Map<string, CalendarDate[]>>(new Map());

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
  // Fetches facets (airports, packageGroups, etc.) plus the dates for a single
  // month, using a per-session in-memory cache for the date payloads.
  //
  // minDateHint — when provided (e.g. from the boot's pre-flight facets call)
  // the internal facets sub-call is skipped and the first API call goes
  // straight to the month; the month response itself supplies the facets.
  const loadCalendar = useCallback(
    async (
      nightsFilter: number | null,
      minDateHint?: string | null,
    ): Promise<CalendarData | null> => {
      patch({ calendarLoading: true });
      // Track startMonth outside the try so the catch can still set calendarMonth
      // and render the calendar shell with navigation even when a fetch fails.
      let startMonth: string | null = null;
      try {
        let facets: CalendarData | null = null;
        let minDate: string | null = minDateHint ?? null;

        if (minDate == null) {
          // Fetch facets first to discover minDate and airport availability.
          facets = await api.fetchCalendar(
            payloadRef.current,
            nightsFilter,
            undefined,
            sid(),
          );
          minDate = facets.minDate;
          // Auto-correct when nightsFilter is null but the offer requires a
          // specific nights value. Only switch to 1 if 1 is actually a valid
          // option. If the offer has [3,5,7] but not 1, leave null so we fetch
          // without constraint — forcing 1 would be an invalid argument.
          if (nightsFilter === null) {
            const hasFlexible = facets.nightsOptions.some((n) => n.nights === null);
            const hasOne = facets.nightsOptions.some((n) => n.nights === 1);
            const hasAny = facets.nightsOptions.length > 0;
            if (!hasFlexible && (hasOne || !hasAny)) {
              nightsFilter = 1;
              patch({ nightsFilter: 1 });
            }
            // Else: other nights exist but not 1 — leave nightsFilter as null.
          }
        }

        startMonth = pickInitialMonth(minDate, payloadRef.current.selectedDate);

        let monthDates = calendarCacheRef.current.get(startMonth);
        if (!monthDates) {
          const monthData = await api.fetchCalendar(
            payloadRef.current,
            nightsFilter,
            monthDateRange(startMonth),
            sid(),
          );
          monthDates = monthData.dates;
          calendarCacheRef.current.set(startMonth, monthDates);
          // When minDateHint was provided we skipped the facets call; use the
          // month response for facets instead.
          if (!facets) facets = monthData;
        }

        // Edge case: minDateHint provided AND the month was already cached —
        // we have dates but no facets. Fetch facets now.
        if (!facets) {
          facets = await api.fetchCalendar(
            payloadRef.current,
            nightsFilter,
            undefined,
            sid(),
          );
        }

        patch({
          calendar: { ...facets, dates: monthDates },
          calendarLoading: false,
          calendarMonth: startMonth,
        });
        return facets;
      } catch {
        // Always set calendarMonth so the calendar shell and navigation render.
        // The user can navigate to future months that may have availability.
        patch({
          calendarLoading: false,
          calendarMonth:
            startMonth ?? pickInitialMonth(minDateHint ?? null, payloadRef.current.selectedDate),
        });
        return null;
      }
    },
    [patch],
  );

  // Navigate to a different month, serving from cache when available.
  const navigateCalendarMonth = useCallback(
    async (targetMonth: string) => {
      const cached = calendarCacheRef.current.get(targetMonth);
      if (cached) {
        patch({
          calendar: { ...stateRef.current.calendar!, dates: cached },
          calendarMonth: targetMonth,
        });
        return;
      }
      patch({ calendarMonthLoading: true });
      try {
        const monthData = await api.fetchCalendar(
          payloadRef.current,
          stateRef.current.nightsFilter,
          monthDateRange(targetMonth),
          sid(),
        );
        calendarCacheRef.current.set(targetMonth, monthData.dates);
        patch({
          calendar: { ...stateRef.current.calendar!, dates: monthData.dates },
          calendarMonth: targetMonth,
          calendarMonthLoading: false,
        });
      } catch {
        patch({ calendarMonthLoading: false });
      }
    },
    [patch],
  );

  // After a first-step filter change: clear downstream + date, reload calendar,
  // then reconcile departureAirports based on what the calendar returns.
  //
  // Package-type reconciliation rules:
  //   - calendar returns no airports → hotel-only package; commit [] so every
  //     subsequent dynamicPackage call explicitly passes departureAirports: []
  //   - calendar returns airports → hotel + flight; if the currently selected
  //     airport is absent from the new list, promote the best available one and
  //     re-fetch the calendar so dates are filtered correctly
  const refreshFirstStep = useCallback(
    async (nightsFilter: number | null) => {
      commitPayload({ products: [], selectedDate: undefined, nights: null });
      calendarCacheRef.current.clear(); // filter changed — all cached months are stale
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
      const cal = await loadCalendar(nightsFilter);
      if (!cal) return;
      const pType = payloadRef.current.packageType;
      const isHotelOnly =
        pType === "EXCLUDING_FLIGHTS" || (pType == null && cal.airports.length === 0);
      if (isHotelOnly) {
        commitPayload({ departureAirports: [] });
      } else {
        const current = payloadRef.current.departureAirports?.[0];
        const valid = current ? cal.airports.some((a) => a.iataCode === current) : false;
        if (!valid) {
          const def = cal.airports.find((a) => a.selected) ?? cal.airports[0];
          if (def) {
            commitPayload({ departureAirports: [def.iataCode] });
            // Airport changed — cached month data is for the wrong airport.
            calendarCacheRef.current.clear();
            await loadCalendar(nightsFilter);
          }
        }
      }
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
        await loadCalendar(nightsFilter);
      } catch {
        /* non-fatal */
      }
      if (payloadRef.current.selectedDate && payloadRef.current.nights != null) {
        await reprice({ showSpinner: true });
      }
      await loadStepData(step);
    },
    [loadCalendar, reprice, loadStepData],
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
          packageType: restored.packageType,
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

      // Fetch facets for the next 30 days with nights:1 as a safe default.
      // Passing an explicit date window avoids errors on offers that require
      // both nights and a date range. If globalMinDate is beyond this window,
      // loadCalendar (via minDateHint) will navigate to and fetch the correct
      // month automatically.
      const today = todayString();
      const initialWindow = { dateFrom: today, dateTo: addDays(today, 30) };
      const facets = await api.fetchCalendar(base, 1, initialWindow, sid());
      const leadingAirport =
        facets.airports.find((a) => a.selected) ?? facets.airports[0];
      const leadingGroup = facets.packageGroups[0];
      // Default to hotel-only when available; fall back to first available type.
      const leadingPackageType =
        facets.packageTypes.find((t) => t.type === "EXCLUDING_FLIGHTS") ??
        facets.packageTypes[0];
      const isExcludingFlights = leadingPackageType?.type === "EXCLUDING_FLIGHTS";

      // Determine the correct initial nights filter from the returned facets.
      // - Flexible (null) option present → keep null
      // - 1-night option present → use 1 (matches the facets call we just made)
      // - Other options present but NOT 1 → the initial nights:1 call was
      //   misaligned; default to null and reload so the calendar is not
      //   constrained to an invalid nights value
      // - No options at all → use 1 for the synthetic selector
      const hasFlexibleNights = facets.nightsOptions.some((n) => n.nights === null);
      const hasOneNight = facets.nightsOptions.some((n) => n.nights === 1);
      const hasAnyNights = facets.nightsOptions.length > 0;

      const initialNightsFilter: number | null =
        hasFlexibleNights || hasOneNight ? (hasFlexibleNights ? null : 1)
        : hasAnyNights ? null   // has options but not 1 — reload without constraint
        : 1;                    // no options — synthetic range, default to 1
      const needsNightsReload = hasAnyNights && !hasFlexibleNights && !hasOneNight;

      commitPayload({
        packageType: leadingPackageType?.type,
        // [] = hotel-only signal to the API. For INCLUDING_FLIGHTS with no
        // airport yet, use undefined (omit) so the second calendar fetch
        // returns the full available airport list for reconciliation.
        departureAirports: isExcludingFlights
          ? []
          : leadingAirport
            ? [leadingAirport.iataCode]
            : undefined,
        packageGroup: leadingGroup ? leadingGroup.id : undefined,
      });
      patch({ nightsFilter: initialNightsFilter });

      // Always pass facets.minDate so loadCalendar jumps to the right month.
      // When 1 night was not a valid option, initialNightsFilter is already null
      // so the month fetch runs without a nights constraint.
      await loadCalendar(initialNightsFilter, facets.minDate);
      patch({ booting: false });
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

  const setPackageType = useCallback(
    async (type: string) => {
      const update: Partial<BookingPayload> = { packageType: type };
      if (type === "EXCLUDING_FLIGHTS") {
        // Hotel-only: pass explicit [] so the API filters out flights.
        update.departureAirports = [];
      } else {
        // Hotel + flight: clear airports to undefined so the calendar fetch
        // runs without an airport filter and returns the full available list.
        // refreshFirstStep will reconcile to the first valid airport afterwards.
        // Using [] here would signal hotel-only to the API and return no airports.
        update.departureAirports = undefined;
      }
      commitPayload(update);
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

  // Commit a stay (date + nights), pre-select the default accommodation product
  // via a dynamicPackage call, then reprice. Pre-selecting the A: product before
  // the receipt call ensures the receipt is priced against a real room/board
  // rather than the backend having to guess a default.
  const commitStayAndPrice = useCallback(
    async (selectedDate: string, nights: number) => {
      commitPayload({ selectedDate, nights, products: [] });
      patch({ flexStartDate: null, receiptLoading: true, receiptError: null });

      // Leisure-only offers have no accommodation step; skip the pre-selection.
      if (!stateRef.current.offerMeta?.isLeisureOnly) {
        try {
          const accommodations = await api.fetchAccommodations(payloadRef.current, sid());
          const hotel = accommodations.find((a) => a.selected) ?? accommodations[0];
          if (hotel) {
            const unit = hotel.units.find((u) => u.selected) ?? hotel.units[0];
            const board = unit?.boards.find((b) => b.selected) ?? unit?.boards[0];
            const productId = board ? board.id : unit?.id;
            if (productId) {
              commitPayload({
                products: replaceProductFamily(payloadRef.current.products, "A:", {
                  id: productId,
                }),
              });
            }
          }
        } catch {
          // Non-fatal — proceed to reprice without a pre-selected accommodation.
        }
      }

      // receiptLoading is already true; skip the redundant patch inside reprice.
      await reprice({ showSpinner: false });
    },
    [patch, commitPayload, reprice],
  );

  const selectDate = useCallback(
    async (date: string) => {
      const s = stateRef.current;
      const filter = s.nightsFilter;

      if (filter != null) {
        await commitStayAndPrice(date, filter);
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
      await commitStayAndPrice(startDate, match.nights);
    },
    [patch, commitStayAndPrice],
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
      setPackageType,
      setPackageGroup,
      setNightsFilter,
      selectDate,
      clearFlexSelection,
      navigateCalendarMonth,
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
      setPackageType,
      setPackageGroup,
      setNightsFilter,
      selectDate,
      clearFlexSelection,
      navigateCalendarMonth,
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
