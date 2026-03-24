"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import type {
  BookingPayload,
  CalendarData,
  OfferData,
  ReceiptData,
  AccommodationsResult,
  LeisureResult,
  FlightOption,
  CarOption,
  CarExtraOption,
  CheckoutMeta,
  StepDefinition,
  ProductInput,
} from "@/lib/types";
import {
  buildPeople,
  buildSteps,
  newSessionId,
  replaceProduct,
  stripProductsByPrefix,
} from "@/lib/payload";
import {
  fetchCalendar,
  fetchReceipt,
  fetchAccommodations,
  fetchLeisures,
  runFlightSearch,
  fetchFlights,
  runCarSearch,
  fetchCars,
  fetchCarExtras,
  fetchCheckoutMeta,
} from "@/lib/api";
import { applySnapshot, buildSnapshot, decodeSnapshot, encodeSnapshot } from "@/lib/urlState";

interface State {
  offer: OfferData | null;
  steps: StepDefinition[];
  currentStepIdx: number;
  payload: BookingPayload;

  calendar: CalendarData | null;
  calendarLoading: boolean;

  receipt: ReceiptData | null;
  receiptLoading: boolean;
  receiptError: string | null;
  lastValidPayload: BookingPayload | null;

  accommodations: AccommodationsResult | null;
  accommodationsLoading: boolean;

  activities: LeisureResult | null;
  activitiesLoading: boolean;

  flights: FlightOption[] | null;
  flightsLoading: boolean;
  flightsStatus: "idle" | "searching" | "validating" | "done" | "empty" | "failed";
  flightsNotice: { kind: "increase" | "decrease"; delta: number } | null;

  cars: CarOption[] | null;
  carsLoading: boolean;
  carsStatus: "idle" | "searching" | "done" | "empty" | "failed";

  carExtras: CarExtraOption[] | null;
  carExtrasLoading: boolean;

  checkoutMeta: CheckoutMeta | null;
  checkoutMetaLoading: boolean;

  hydrated: boolean;
}

type Action =
  | { type: "set"; patch: Partial<State> }
  | { type: "patch-payload"; patch: Partial<BookingPayload> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set":
      return { ...state, ...action.patch };
    case "patch-payload":
      return { ...state, payload: { ...state.payload, ...action.patch } };
    default:
      return state;
  }
}

function initState(offer: OfferData, initialPayload: BookingPayload, stepIdx: number): State {
  return {
    offer,
    steps: buildSteps(offer.meta),
    currentStepIdx: stepIdx,
    payload: initialPayload,

    calendar: null,
    calendarLoading: false,

    receipt: null,
    receiptLoading: false,
    receiptError: null,
    lastValidPayload: null,

    accommodations: null,
    accommodationsLoading: false,

    activities: null,
    activitiesLoading: false,

    flights: null,
    flightsLoading: false,
    flightsStatus: "idle",
    flightsNotice: null,

    cars: null,
    carsLoading: false,
    carsStatus: "idle",

    carExtras: null,
    carExtrasLoading: false,

    checkoutMeta: null,
    checkoutMetaLoading: false,

    hydrated: false,
  };
}

export interface BookingContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;

  // payload mutators
  setOccupancy: (adults: number, childAges: number[]) => Promise<void>;
  setAirport: (iata: string | undefined) => Promise<void>;
  setPackageGroup: (id: string | undefined) => Promise<void>;
  setNights: (n: number | null) => Promise<void>;

  selectDate: (date: string, nights: number) => Promise<void>;
  confirmDates: () => void;

  loadCalendar: () => Promise<void>;
  reloadReceipt: (opts?: { silent?: boolean }) => Promise<void>;

  loadAccommodations: () => Promise<void>;
  setAccommodationSelection: (hotelId: string, unitId: string, boardId?: string) => Promise<void>;

  loadActivities: () => Promise<void>;
  toggleActivity: (leisureId: string, unitId: string | null) => Promise<void>;

  startFlights: () => Promise<void>;
  selectFlight: (flightId: string) => Promise<void>;

  startCars: () => Promise<void>;
  selectCar: (carId: string) => Promise<void>;
  toggleCarExtra: (extraId: string) => Promise<void>;

  loadCheckoutMeta: () => Promise<void>;
  setInstalments: (n: number) => Promise<void>;
  setPaymentMethod: (id: string) => void;

  goToStep: (idx: number) => void;
  goToStepById: (id: StepDefinition["id"]) => void;
  advance: () => void;
  goBack: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside BookingProvider");
  return ctx;
}

export interface BookingProviderProps {
  offer: OfferData;
  offerId: string;
  initialSnapshot?: string | null;
  children: ReactNode;
}

export function BookingProvider({ offer, offerId, initialSnapshot, children }: BookingProviderProps) {
  // Build initial payload (bootstrap: 2 adults, no products, fresh session)
  const initial = useMemo(() => {
    const { people, groups } = buildPeople(2, []);
    let payload: BookingPayload = {
      offerId,
      sessionId: newSessionId(),
      offerMeta: offer.meta,
      people,
      groups,
      products: [],
      numOfInstalments: 1,
    };
    let stepIdx = 0;
    if (initialSnapshot) {
      const snap = decodeSnapshot(initialSnapshot);
      if (snap) {
        payload = applySnapshot(payload, snap);
        stepIdx = Math.max(0, Math.min(snap.step, 5));
      }
    }
    return { payload, stepIdx };
  }, [offer, offerId, initialSnapshot]);

  const [state, dispatch] = useReducer(reducer, initial, () => initState(offer, initial.payload, initial.stepIdx));

  // Refs for current state inside async callbacks (avoid stale closures)
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // --- URL sync (replace, no navigation) ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const snap = buildSnapshot(state.payload, state.currentStepIdx);
    const encoded = encodeSnapshot(snap);
    const url = new URL(window.location.href);
    url.searchParams.set("s", encoded);
    window.history.replaceState(null, "", url.toString());
  }, [state.payload, state.currentStepIdx]);

  // --- Derived helpers ---
  const reloadReceipt = useCallback(async (opts: { silent?: boolean } = {}) => {
    const current = stateRef.current.payload;
    if (!current.selectedDate || current.nights == null) return;
    if (!opts.silent) dispatch({ type: "set", patch: { receiptLoading: true, receiptError: null } });
    try {
      const receipt = await fetchReceipt(current);
      if (receipt.errors.length > 0) {
        dispatch({
          type: "set",
          patch: {
            receipt,
            receiptLoading: false,
            receiptError: receipt.errors.map(e => e.message).join("; "),
          },
        });
      } else {
        dispatch({
          type: "set",
          patch: {
            receipt,
            receiptLoading: false,
            receiptError: null,
            lastValidPayload: current,
          },
        });
      }
    } catch (e) {
      dispatch({
        type: "set",
        patch: {
          receiptLoading: false,
          receiptError: e instanceof Error ? e.message : "Unable to price",
        },
      });
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    dispatch({ type: "set", patch: { calendarLoading: true } });
    try {
      const calendar = await fetchCalendar(stateRef.current.payload);
      // Auto-derive defaults on initial load if unset
      const current = stateRef.current.payload;
      const patch: Partial<BookingPayload> = {};
      if (!current.departureAirports || current.departureAirports.length === 0) {
        const selectedAirport = calendar.airports.find(a => a.selected) || calendar.airports[0];
        if (selectedAirport) patch.departureAirports = [selectedAirport.iataCode];
      }
      if (current.packageGroup === undefined && calendar.packageGroups.length > 0) {
        patch.packageGroup = calendar.packageGroups[0].id;
      }
      if (current.nights === undefined && calendar.nights.length > 0) {
        // Prefer first positive nights entry
        const firstConcrete = calendar.nights.find(n => n.nights != null) ?? calendar.nights[0];
        patch.nights = firstConcrete.nights;
      }
      if (Object.keys(patch).length) {
        dispatch({ type: "patch-payload", patch });
      }
      dispatch({ type: "set", patch: { calendar, calendarLoading: false } });
      // If defaults just assigned, reload calendar once with filters for alignment.
      if (Object.keys(patch).length) {
        const calendar2 = await fetchCalendar(stateRef.current.payload);
        dispatch({ type: "set", patch: { calendar: calendar2 } });
      }
    } catch (e) {
      dispatch({ type: "set", patch: { calendarLoading: false } });
      console.error("calendar load failed", e);
    }
  }, []);

  const setOccupancy = useCallback(async (adults: number, childAges: number[]) => {
    const { people, groups } = buildPeople(adults, childAges);
    dispatch({ type: "patch-payload", patch: { people, groups, products: [], selectedDate: undefined } });
    dispatch({ type: "set", patch: { calendarLoading: true, receipt: null, receiptError: null, lastValidPayload: null } });
    try {
      const calendar = await fetchCalendar(stateRef.current.payload);
      dispatch({ type: "set", patch: { calendar, calendarLoading: false } });
    } catch {
      dispatch({ type: "set", patch: { calendarLoading: false } });
    }
  }, []);

  const setAirport = useCallback(async (iata: string | undefined) => {
    dispatch({ type: "patch-payload", patch: { departureAirports: iata ? [iata] : undefined, products: [], selectedDate: undefined } });
    dispatch({ type: "set", patch: { calendarLoading: true, receipt: null, receiptError: null, lastValidPayload: null } });
    try {
      const calendar = await fetchCalendar(stateRef.current.payload);
      dispatch({ type: "set", patch: { calendar, calendarLoading: false } });
    } catch { dispatch({ type: "set", patch: { calendarLoading: false } }); }
  }, []);

  const setPackageGroup = useCallback(async (id: string | undefined) => {
    dispatch({ type: "patch-payload", patch: { packageGroup: id, products: [], selectedDate: undefined } });
    dispatch({ type: "set", patch: { calendarLoading: true, receipt: null, receiptError: null, lastValidPayload: null } });
    try {
      const calendar = await fetchCalendar(stateRef.current.payload);
      dispatch({ type: "set", patch: { calendar, calendarLoading: false } });
    } catch { dispatch({ type: "set", patch: { calendarLoading: false } }); }
  }, []);

  const setNights = useCallback(async (n: number | null) => {
    dispatch({ type: "patch-payload", patch: { nights: n, products: [], selectedDate: undefined } });
    dispatch({ type: "set", patch: { calendarLoading: true, receipt: null, receiptError: null, lastValidPayload: null } });
    try {
      const calendar = await fetchCalendar(stateRef.current.payload);
      dispatch({ type: "set", patch: { calendar, calendarLoading: false } });
    } catch { dispatch({ type: "set", patch: { calendarLoading: false } }); }
  }, []);

  const selectDate = useCallback(async (date: string, nights: number) => {
    // New stay → clear downstream products
    dispatch({ type: "patch-payload", patch: { selectedDate: date, nights, products: [] } });
    await reloadReceipt();
  }, [reloadReceipt]);

  const confirmDates = useCallback(() => {
    // Handled by advance() — nothing extra here; receipt already valid.
  }, []);

  // --- Accommodations ---
  const loadAccommodations = useCallback(async () => {
    dispatch({ type: "set", patch: { accommodationsLoading: true } });
    try {
      const res = await fetchAccommodations(stateRef.current.payload);
      dispatch({ type: "set", patch: { accommodations: res, accommodationsLoading: false } });

      // Set backend-selected defaults if no accommodation product is yet selected
      const current = stateRef.current.payload;
      const hasA = current.products.some(p => p.id.startsWith("A:"));
      if (!hasA && res.accommodations.length) {
        const defaultHotel = res.accommodations.find(a => a.selected) || res.accommodations[0];
        const defaultUnit = defaultHotel.units.find(u => u.selected) || defaultHotel.units[0];
        if (defaultUnit) {
          const defaultBoard = defaultUnit.boards.find(b => b.selected) || defaultUnit.boards[0];
          const products: ProductInput[] = [{ id: defaultUnit.id }];
          if (defaultBoard && defaultBoard.id !== defaultUnit.id) products.push({ id: defaultBoard.id });
          dispatch({ type: "patch-payload", patch: { products: replaceProduct(current.products, "A:", products) } });
          await reloadReceipt();
        }
      }
    } catch (e) {
      dispatch({ type: "set", patch: { accommodationsLoading: false } });
      console.error(e);
    }
  }, [reloadReceipt]);

  const setAccommodationSelection = useCallback(async (hotelId: string, unitId: string, boardId?: string) => {
    const products: ProductInput[] = [{ id: unitId }];
    if (boardId && boardId !== unitId) products.push({ id: boardId });
    void hotelId;
    dispatch({ type: "patch-payload", patch: { products: replaceProduct(stateRef.current.payload.products, "A:", products) } });
    await reloadReceipt();
  }, [reloadReceipt]);

  // --- Activities ---
  const loadActivities = useCallback(async () => {
    dispatch({ type: "set", patch: { activitiesLoading: true } });
    try {
      const res = await fetchLeisures(stateRef.current.payload);
      dispatch({ type: "set", patch: { activities: res, activitiesLoading: false } });
      // Ensure included leisures' backend-selected variations are present in payload
      const current = stateRef.current.payload;
      const existingL = new Set(current.products.filter(p => p.id.startsWith("L:")).map(p => p.id));
      const toAdd: ProductInput[] = [];
      for (const l of res.leisures) {
        if (l.optional) continue;
        const sel = l.units.find(u => u.selected) || l.units[0];
        if (sel && !existingL.has(sel.id)) toAdd.push({ id: sel.id });
      }
      if (toAdd.length) {
        dispatch({ type: "patch-payload", patch: { products: [...current.products, ...toAdd] } });
        await reloadReceipt();
      }
    } catch (e) {
      dispatch({ type: "set", patch: { activitiesLoading: false } });
      console.error(e);
    }
  }, [reloadReceipt]);

  const toggleActivity = useCallback(async (leisureId: string, unitId: string | null) => {
    const activities = stateRef.current.activities;
    if (!activities) return;
    const leisure = activities.leisures.find(l => l.id === leisureId);
    if (!leisure) return;

    const current = stateRef.current.payload;
    const leisureUnitIds = new Set(leisure.units.map(u => u.id));
    const filtered = current.products.filter(p => !leisureUnitIds.has(p.id));
    const next = [...filtered];
    if (unitId) next.push({ id: unitId });
    dispatch({ type: "patch-payload", patch: { products: next } });
    await reloadReceipt();
  }, [reloadReceipt]);

  // --- Flights ---
  const startFlights = useCallback(async () => {
    dispatch({ type: "set", patch: { flightsLoading: true, flightsStatus: "searching", flights: null, flightsNotice: null } });
    const before = stateRef.current.receipt?.totalPrice ?? null;
    try {
      const search = await runFlightSearch(stateRef.current.payload);
      if (search !== "FINISHED") {
        dispatch({ type: "set", patch: { flightsLoading: false, flightsStatus: "failed" } });
        return;
      }
      dispatch({ type: "set", patch: { flightsStatus: "validating" } });
      const flights = await fetchFlights(stateRef.current.payload);
      if (!flights.length) {
        dispatch({ type: "set", patch: { flightsLoading: false, flightsStatus: "empty" } });
        return;
      }
      // Preselect the backend default if no F: product already
      const current = stateRef.current.payload;
      const hasF = current.products.some(p => p.id.startsWith("F:"));
      let nextProducts = current.products;
      if (!hasF) {
        const def = flights.find(f => f.selected) || flights[0];
        nextProducts = replaceProduct(current.products, "F:", { id: def.id });
        dispatch({ type: "patch-payload", patch: { products: nextProducts } });
      }
      dispatch({ type: "set", patch: { flights, flightsLoading: false, flightsStatus: "done" } });
      await reloadReceipt();
      const after = stateRef.current.receipt?.totalPrice ?? null;
      if (before != null && after != null && after !== before) {
        dispatch({ type: "set", patch: { flightsNotice: { kind: after > before ? "increase" : "decrease", delta: after - before } } });
      }
    } catch (e) {
      dispatch({ type: "set", patch: { flightsLoading: false, flightsStatus: "failed" } });
      console.error(e);
    }
  }, [reloadReceipt]);

  const selectFlight = useCallback(async (flightId: string) => {
    const current = stateRef.current.payload;
    dispatch({ type: "patch-payload", patch: { products: replaceProduct(current.products, "F:", { id: flightId }) } });
    await reloadReceipt();
  }, [reloadReceipt]);

  // --- Cars ---
  const startCars = useCallback(async () => {
    dispatch({ type: "set", patch: { carsLoading: true, carsStatus: "searching", cars: null, carExtras: null } });
    try {
      const status = await runCarSearch(stateRef.current.payload);
      if (status !== "FINISHED") {
        dispatch({ type: "set", patch: { carsLoading: false, carsStatus: "failed" } });
        return;
      }
      const cars = await fetchCars(stateRef.current.payload);
      if (!cars.length) {
        dispatch({ type: "set", patch: { carsLoading: false, carsStatus: "empty" } });
        return;
      }
      const current = stateRef.current.payload;
      const hasC = current.products.some(p => p.id.startsWith("C:"));
      if (!hasC) {
        const def = cars.find(c => c.selected) || cars[0];
        dispatch({ type: "patch-payload", patch: { products: replaceProduct(current.products, "C:", { id: def.id }) } });
      }
      dispatch({ type: "set", patch: { cars, carsLoading: false, carsStatus: "done" } });
      await reloadReceipt();
      // Load extras for the selected car
      const selectedCar = stateRef.current.payload.products.find(p => p.id.startsWith("C:"));
      if (selectedCar) {
        dispatch({ type: "set", patch: { carExtrasLoading: true } });
        try {
          const extras = await fetchCarExtras(selectedCar.id, stateRef.current.payload.sessionId);
          dispatch({ type: "set", patch: { carExtras: extras, carExtrasLoading: false } });
        } catch {
          dispatch({ type: "set", patch: { carExtrasLoading: false } });
        }
      }
    } catch {
      dispatch({ type: "set", patch: { carsLoading: false, carsStatus: "failed" } });
    }
  }, [reloadReceipt]);

  const selectCar = useCallback(async (carId: string) => {
    const current = stateRef.current.payload;
    dispatch({ type: "patch-payload", patch: { products: replaceProduct(current.products, "C:", { id: carId }) } });
    await reloadReceipt();
    dispatch({ type: "set", patch: { carExtrasLoading: true, carExtras: null } });
    try {
      const extras = await fetchCarExtras(carId, stateRef.current.payload.sessionId);
      dispatch({ type: "set", patch: { carExtras: extras, carExtrasLoading: false } });
    } catch { dispatch({ type: "set", patch: { carExtrasLoading: false } }); }
  }, [reloadReceipt]);

  const toggleCarExtra = useCallback(async (extraId: string) => {
    const current = stateRef.current.payload;
    const carIdx = current.products.findIndex(p => p.id.startsWith("C:"));
    if (carIdx < 0) return;
    const car = current.products[carIdx];
    const options = car.options || [];
    const has = options.some(o => o.id === extraId);
    const nextOptions = has ? options.filter(o => o.id !== extraId) : [...options, { id: extraId }];
    const nextProducts = [...current.products];
    nextProducts[carIdx] = { ...car, options: nextOptions };
    dispatch({ type: "patch-payload", patch: { products: nextProducts } });
    await reloadReceipt();
  }, [reloadReceipt]);

  // --- Checkout ---
  const loadCheckoutMeta = useCallback(async () => {
    dispatch({ type: "set", patch: { checkoutMetaLoading: true } });
    try {
      const meta = await fetchCheckoutMeta(stateRef.current.payload);
      dispatch({ type: "set", patch: { checkoutMeta: meta, checkoutMetaLoading: false } });
      const current = stateRef.current.payload;
      if (!current.paymentMethod) {
        const def = meta.paymentMethods.find(p => p.default) || meta.paymentMethods[0];
        if (def) dispatch({ type: "patch-payload", patch: { paymentMethod: def.id } });
      }
      if (!current.numOfInstalments) dispatch({ type: "patch-payload", patch: { numOfInstalments: 1 } });
      await reloadReceipt({ silent: true });
    } catch (e) {
      dispatch({ type: "set", patch: { checkoutMetaLoading: false } });
      console.error(e);
    }
  }, [reloadReceipt]);

  const setInstalments = useCallback(async (n: number) => {
    dispatch({ type: "patch-payload", patch: { numOfInstalments: n } });
    await reloadReceipt();
  }, [reloadReceipt]);

  const setPaymentMethod = useCallback((id: string) => {
    dispatch({ type: "patch-payload", patch: { paymentMethod: id } });
  }, []);

  // --- Navigation ---
  const goToStep = useCallback((idx: number) => {
    dispatch({ type: "set", patch: { currentStepIdx: idx } });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goToStepById = useCallback((id: StepDefinition["id"]) => {
    const idx = stateRef.current.steps.findIndex(s => s.id === id);
    if (idx >= 0) goToStep(idx);
  }, [goToStep]);

  const advance = useCallback(() => {
    const cur = stateRef.current;
    if (cur.currentStepIdx < cur.steps.length - 1) goToStep(cur.currentStepIdx + 1);
  }, [goToStep]);

  const goBack = useCallback(() => {
    if (stateRef.current.currentStepIdx > 0) goToStep(stateRef.current.currentStepIdx - 1);
  }, [goToStep]);

  // Handle receipt errors on downstream steps — treat as invalid package.
  useEffect(() => {
    if (!state.receiptError) return;
    if (state.currentStepIdx > 0) {
      dispatch({ type: "patch-payload", patch: { products: [] } });
      dispatch({ type: "set", patch: { currentStepIdx: 0 } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.receiptError]);

  const value: BookingContextValue = {
    state,
    dispatch,
    setOccupancy,
    setAirport,
    setPackageGroup,
    setNights,
    selectDate,
    confirmDates,
    loadCalendar,
    reloadReceipt,
    loadAccommodations,
    setAccommodationSelection,
    loadActivities,
    toggleActivity,
    startFlights,
    selectFlight,
    startCars,
    selectCar,
    toggleCarExtra,
    loadCheckoutMeta,
    setInstalments,
    setPaymentMethod,
    goToStep,
    goToStepById,
    advance,
    goBack,
  };

  // Kick off boot sequence once
  useEffect(() => {
    void (async () => {
      if (stateRef.current.hydrated) return;
      dispatch({ type: "set", patch: { hydrated: true } });
      // If we have an encoded snapshot with a selected date, restore data for that step.
      await loadCalendar();
      if (stateRef.current.payload.selectedDate && stateRef.current.payload.nights != null) {
        await reloadReceipt();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hooks-style step-data loaders: when entering a step, preload its data
  useEffect(() => {
    const step = state.steps[state.currentStepIdx];
    if (!step) return;
    void (async () => {
      if (step.id === "rooms" && !state.accommodations && state.payload.selectedDate) {
        await loadAccommodations();
      } else if (step.id === "activities" && !state.activities && state.payload.selectedDate) {
        await loadActivities();
      } else if (step.id === "flights" && !state.flights && state.flightsStatus === "idle" && state.payload.selectedDate) {
        await startFlights();
      } else if (step.id === "cars" && !state.cars && state.carsStatus === "idle" && state.payload.selectedDate) {
        await startCars();
      } else if (step.id === "checkout" && !state.checkoutMeta && state.payload.selectedDate) {
        await loadCheckoutMeta();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentStepIdx]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export { stripProductsByPrefix };
