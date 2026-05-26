"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import * as api from "./api";
import {
  findProductByPrefix,
  replaceFamily,
  setLeisureForGroup,
} from "./products";
import { buildPeople } from "./steps";
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
  ProductInput,
  ReceiptData,
  StepDefinition,
} from "./types";
import { Snapshot, writeSnapshotToUrl } from "./url-state";

type AsyncStage = "idle" | "searching" | "validating" | "done" | "error";

export interface BookingState {
  offer: OfferMeta;
  sessionId: string;
  steps: StepDefinition[];
  stepIndex: number;

  payload: BookingPayload;
  nightsFilter: number | null;
  lastValidStay: {
    selectedDate?: string;
    nights?: number | null;
    products: ProductInput[];
  } | null;

  calendar: CalendarData | null;
  calendarLoading: boolean;

  receipt: ReceiptData | null;
  receiptLoading: boolean;
  receiptError: string | null;
  stayValid: boolean;

  accommodations: Accommodation[] | null;
  accommodationsLoading: boolean;

  leisure: LeisureData | null;
  leisureLoading: boolean;

  flights: Flight[] | null;
  flightStage: AsyncStage;
  flightPriceNotice: string | null;

  cars: Car[] | null;
  carStage: AsyncStage;
  carExtras: CarExtraOption[] | null;
  carExtrasLoading: boolean;

  checkoutMeta: CheckoutMeta | null;
  paymentMethods: PaymentMethod[];
  paymentMethod: string | null;
  checkoutLoading: boolean;

  submitting: boolean;
}

type Action = { type: "PATCH"; patch: Partial<BookingState> };

function reducer(state: BookingState, action: Action): BookingState {
  switch (action.type) {
    case "PATCH":
      return { ...state, ...action.patch };
    default:
      return state;
  }
}

export interface BookingInit {
  offer: OfferMeta;
  sessionId: string;
  steps: StepDefinition[];
  payload: BookingPayload;
  calendar: CalendarData;
  nightsFilter: number | null;
  stepIndex: number;
  receipt: ReceiptData | null;
}

interface BookingActions {
  // first step
  setOccupancy: (adults: number, childAges: number[]) => void;
  setAirport: (iata: string) => void;
  setPackageGroup: (id: string) => void;
  setNightsFilter: (n: number | null) => void;
  selectDate: (date: string, nights: number) => void;
  clearDate: () => void;
  // navigation
  goToStep: (index: number) => void;
  next: () => void;
  back: () => void;
  resetToDates: () => void;
  // products
  setAccommodationProduct: (product: ProductInput) => void;
  setLeisure: (group: string, product: ProductInput | null) => void;
  setFlight: (product: ProductInput) => void;
  setCar: (product: ProductInput) => void;
  setCarExtra: (carId: string, option: CarExtraOption, on: boolean) => void;
  // checkout
  setInstalments: (n: number) => void;
  setPaymentMethod: (id: string) => void;
  updatePerson: (index: number, patch: Record<string, unknown>) => void;
  submitOrder: () => Promise<string | null>;
  // data loaders (called on step entry)
  loadAccommodations: () => void;
  loadLeisure: () => void;
  loadFlights: () => void;
  loadCars: () => void;
  loadCarExtras: (carId: string) => void;
  loadCheckout: () => void;
}

const Ctx = createContext<{ state: BookingState; actions: BookingActions } | null>(
  null,
);

export function useBooking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}

function initialState(init: BookingInit): BookingState {
  return {
    offer: init.offer,
    sessionId: init.sessionId,
    steps: init.steps,
    stepIndex: init.stepIndex,
    payload: init.payload,
    nightsFilter: init.nightsFilter,
    lastValidStay:
      init.receipt && !init.receipt.errors.length && init.payload.selectedDate
        ? {
            selectedDate: init.payload.selectedDate,
            nights: init.payload.nights,
            products: init.payload.products,
          }
        : null,
    calendar: init.calendar,
    calendarLoading: false,
    receipt: init.receipt,
    receiptLoading: false,
    receiptError: null,
    stayValid: !!(init.receipt && !init.receipt.errors.length),
    accommodations: null,
    accommodationsLoading: false,
    leisure: null,
    leisureLoading: false,
    flights: null,
    flightStage: "idle",
    flightPriceNotice: null,
    cars: null,
    carStage: "idle",
    carExtras: null,
    carExtrasLoading: false,
    checkoutMeta: null,
    paymentMethods: [],
    paymentMethod: null,
    checkoutLoading: false,
    submitting: false,
  };
}

export function BookingProvider({
  init,
  children,
}: {
  init: BookingInit;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, init, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const patch = useCallback((p: Partial<BookingState>) => {
    dispatch({ type: "PATCH", patch: p });
  }, []);

  // Keep URL snapshot in sync (history.replaceState — no navigation).
  useEffect(() => {
    const s = stateRef.current;
    const snap: Snapshot = {
      sid: s.sessionId,
      step: s.stepIndex,
      people: s.payload.people,
      groups: s.payload.groups,
      departureAirports: s.payload.departureAirports,
      packageGroup: s.payload.packageGroup,
      nights: s.payload.nights,
      nightsFilter: s.nightsFilter,
      selectedDate: s.payload.selectedDate,
      products: s.payload.products,
      coupons: s.payload.coupons,
      numOfInstalments: s.payload.numOfInstalments,
    };
    writeSnapshotToUrl(snap);
  }, [
    state.stepIndex,
    state.payload,
    state.nightsFilter,
  ]);

  const sid = state.sessionId;

  // ---- receipt repricing ----------------------------------------------------
  const reprice = useCallback(
    async (payload: BookingPayload, opts?: { rollbackOnError?: boolean }) => {
      patch({ receiptLoading: true, receiptError: null });
      try {
        const receipt = await api.fetchReceipt(payload, sid);
        if (receipt.errors.length) {
          const msg =
            receipt.errors[0].message ?? "This combination is not available.";
          if (opts?.rollbackOnError) {
            const lv = stateRef.current.lastValidStay;
            const rolled: BookingPayload = lv
              ? {
                  ...payload,
                  selectedDate: lv.selectedDate,
                  nights: lv.nights ?? payload.nights,
                  products: lv.products,
                }
              : { ...payload, selectedDate: undefined, products: [] };
            patch({
              payload: rolled,
              receiptError: msg,
              receiptLoading: false,
              stayValid: !!lv,
            });
          } else {
            patch({ receiptError: msg, receiptLoading: false, stayValid: false });
          }
          return false;
        }
        patch({
          receipt,
          receiptLoading: false,
          stayValid: true,
          lastValidStay: {
            selectedDate: payload.selectedDate,
            nights: payload.nights,
            products: payload.products,
          },
        });
        return true;
      } catch (e) {
        patch({
          receiptError: (e as Error).message,
          receiptLoading: false,
        });
        return false;
      }
    },
    [patch, sid],
  );

  // ---- first step ------------------------------------------------------------
  const refetchCalendar = useCallback(
    async (payload: BookingPayload, nightsFilter: number | null) => {
      patch({ calendarLoading: true });
      try {
        const calendar = await api.fetchCalendar(
          payload,
          nightsFilter,
          undefined,
          sid,
        );
        // Reconcile: drop a selected date that no longer exists in the grid.
        let nextPayload = payload;
        let stillValid = false;
        if (payload.selectedDate) {
          const day = calendar.days.find((d) => d.date === payload.selectedDate);
          const ok =
            day &&
            (nightsFilter == null ||
              day.nights.some((n) => n.nights === payload.nights));
          if (!ok) {
            nextPayload = { ...payload, selectedDate: undefined };
          } else {
            stillValid = true;
          }
        }
        patch({
          calendar,
          calendarLoading: false,
          payload: nextPayload,
          receipt: stillValid ? stateRef.current.receipt : null,
          stayValid: stillValid && stateRef.current.stayValid,
          receiptError: null,
        });
        if (stillValid && nextPayload.selectedDate) {
          await reprice(nextPayload);
        }
      } catch (e) {
        patch({ calendarLoading: false, receiptError: (e as Error).message });
      }
    },
    [patch, reprice, sid],
  );

  const setOccupancy = useCallback(
    (adults: number, childAges: number[]) => {
      const { people, groups } = buildPeople(adults, childAges);
      const next: BookingPayload = {
        ...stateRef.current.payload,
        people,
        groups,
        products: [],
      };
      patch({ payload: next });
      refetchCalendar(next, stateRef.current.nightsFilter);
    },
    [patch, refetchCalendar],
  );

  const setAirport = useCallback(
    (iata: string) => {
      const next: BookingPayload = {
        ...stateRef.current.payload,
        departureAirports: [iata],
        products: [],
      };
      patch({ payload: next });
      refetchCalendar(next, stateRef.current.nightsFilter);
    },
    [patch, refetchCalendar],
  );

  const setPackageGroup = useCallback(
    (id: string) => {
      // "" is a valid ("All packages") selection, preserved internally.
      const next: BookingPayload = {
        ...stateRef.current.payload,
        packageGroup: id,
        products: [],
      };
      patch({ payload: next });
      refetchCalendar(next, stateRef.current.nightsFilter);
    },
    [patch, refetchCalendar],
  );

  const setNightsFilter = useCallback(
    (n: number | null) => {
      // Changing the length filter restarts date selection.
      const next: BookingPayload = {
        ...stateRef.current.payload,
        nights: n,
        selectedDate: undefined,
        products: [],
      };
      patch({
        payload: next,
        nightsFilter: n,
        receipt: null,
        stayValid: false,
        receiptError: null,
      });
      refetchCalendar(next, n);
    },
    [patch, refetchCalendar],
  );

  const selectDate = useCallback(
    (date: string, nights: number) => {
      // A new stay starts a fresh decision tree: clear downstream products.
      const next: BookingPayload = {
        ...stateRef.current.payload,
        selectedDate: date,
        nights,
        products: [],
      };
      patch({ payload: next });
      reprice(next, { rollbackOnError: true });
    },
    [patch, reprice],
  );

  const clearDate = useCallback(() => {
    const next: BookingPayload = {
      ...stateRef.current.payload,
      selectedDate: undefined,
    };
    patch({ payload: next, receipt: null, stayValid: false, receiptError: null });
  }, [patch]);

  // ---- navigation ------------------------------------------------------------
  const scrollTop = () => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  };

  const goToStep = useCallback(
    (index: number) => {
      patch({ stepIndex: index });
      scrollTop();
    },
    [patch],
  );

  const next = useCallback(() => {
    const s = stateRef.current;
    if (s.stepIndex < s.steps.length - 1) {
      patch({ stepIndex: s.stepIndex + 1 });
      scrollTop();
    }
  }, [patch]);

  const back = useCallback(() => {
    const s = stateRef.current;
    if (s.stepIndex > 0) {
      patch({ stepIndex: s.stepIndex - 1 });
      scrollTop();
    }
  }, [patch]);

  const resetToDates = useCallback(() => {
    // Downstream package became invalid: clear later state, return to Dates.
    const next: BookingPayload = {
      ...stateRef.current.payload,
      selectedDate: undefined,
      products: [],
    };
    patch({
      payload: next,
      stepIndex: 0,
      receipt: null,
      stayValid: false,
      receiptError: null,
      flights: null,
      flightStage: "idle",
      cars: null,
      carStage: "idle",
      accommodations: null,
      leisure: null,
    });
    scrollTop();
  }, [patch]);

  // ---- product selection (with immediate reprice) ----------------------------
  const setAccommodationProduct = useCallback(
    (product: ProductInput) => {
      const next: BookingPayload = {
        ...stateRef.current.payload,
        products: replaceFamily(stateRef.current.payload.products, "A:", product),
      };
      patch({ payload: next });
      reprice(next, { rollbackOnError: false });
    },
    [patch, reprice],
  );

  const setLeisure = useCallback(
    (group: string, product: ProductInput | null) => {
      const next: BookingPayload = {
        ...stateRef.current.payload,
        products: setLeisureForGroup(
          stateRef.current.payload.products,
          group,
          product,
        ),
      };
      patch({ payload: next });
      reprice(next, { rollbackOnError: false });
    },
    [patch, reprice],
  );

  const setFlight = useCallback(
    (product: ProductInput) => {
      const next: BookingPayload = {
        ...stateRef.current.payload,
        products: replaceFamily(stateRef.current.payload.products, "F:", product),
      };
      patch({ payload: next });
      reprice(next, { rollbackOnError: false });
    },
    [patch, reprice],
  );

  const setCar = useCallback(
    (product: ProductInput) => {
      const next: BookingPayload = {
        ...stateRef.current.payload,
        products: replaceFamily(stateRef.current.payload.products, "C:", product),
      };
      patch({ payload: next });
      reprice(next, { rollbackOnError: false });
    },
    [patch, reprice],
  );

  const setCarExtra = useCallback(
    (carId: string, option: CarExtraOption, on: boolean) => {
      const products = stateRef.current.payload.products.map((p) => {
        if (p.id !== carId) return p;
        const opts = p.options ?? [];
        const nextOpts = on
          ? [...opts.filter((o) => o.id !== option.id), { id: option.id }]
          : opts.filter((o) => o.id !== option.id);
        return { ...p, options: nextOpts };
      });
      const next: BookingPayload = { ...stateRef.current.payload, products };
      patch({ payload: next });
      reprice(next, { rollbackOnError: false });
    },
    [patch, reprice],
  );

  // ---- checkout --------------------------------------------------------------
  const setInstalments = useCallback(
    (n: number) => {
      const next: BookingPayload = {
        ...stateRef.current.payload,
        numOfInstalments: n,
      };
      patch({ payload: next });
      reprice(next, { rollbackOnError: false });
    },
    [patch, reprice],
  );

  const setPaymentMethod = useCallback(
    (id: string) => patch({ paymentMethod: id }),
    [patch],
  );

  const updatePerson = useCallback(
    (index: number, p: Record<string, unknown>) => {
      const people = stateRef.current.payload.people.map((person, i) =>
        i === index ? { ...person, ...p } : person,
      );
      patch({ payload: { ...stateRef.current.payload, people } });
    },
    [patch],
  );

  const submitOrder = useCallback(async () => {
    const s = stateRef.current;
    patch({ submitting: true });
    try {
      const restoreUrl =
        typeof window !== "undefined" ? window.location.href : "";
      const { continueUrl, errors } = await api.createOrder(
        {
          payload: s.payload,
          totalPrice: s.receipt?.totalPrice ?? 0,
          paymentMethod: s.paymentMethod,
          restoreUrl,
        },
        sid,
      );
      patch({ submitting: false });
      if (errors.length) {
        patch({ receiptError: errors[0].message ?? "Could not create order" });
        return null;
      }
      return continueUrl;
    } catch (e) {
      patch({ submitting: false, receiptError: (e as Error).message });
      return null;
    }
  }, [patch, sid]);

  // ---- step data loaders -----------------------------------------------------
  const loadAccommodations = useCallback(async () => {
    if (stateRef.current.accommodationsLoading) return;
    patch({ accommodationsLoading: true });
    try {
      const list = await api.fetchAccommodations(stateRef.current.payload, sid);
      patch({ accommodations: list, accommodationsLoading: false });
      // If no A: product yet, default to backend-selected hotel/unit/board.
      const s = stateRef.current;
      if (!findProductByPrefix(s.payload.products, "A:")) {
        const hotel = list.find((h) => h.selected) ?? list[0];
        if (hotel) {
          const unit = hotel.units.find((u) => u.selected) ?? hotel.units[0];
          const board = unit?.boards.find((b) => b.selected) ?? unit?.boards[0];
          const id = board?.id ?? unit?.id;
          if (id) setAccommodationProduct({ id });
        }
      }
    } catch (e) {
      patch({ accommodationsLoading: false, receiptError: (e as Error).message });
    }
  }, [patch, setAccommodationProduct, sid]);

  const loadLeisure = useCallback(async () => {
    if (stateRef.current.leisureLoading) return;
    patch({ leisureLoading: true });
    try {
      const leisure = await api.fetchLeisure(stateRef.current.payload, sid);
      patch({ leisure, leisureLoading: false });
    } catch (e) {
      patch({ leisureLoading: false, receiptError: (e as Error).message });
    }
  }, [patch, sid]);

  const loadFlights = useCallback(async () => {
    const s0 = stateRef.current;
    if (s0.flightStage === "searching" || s0.flightStage === "validating") return;
    const totalBefore = s0.receipt?.totalPrice ?? null;
    patch({ flightStage: "searching", flights: null, flightPriceNotice: null });
    try {
      const flights = await api.searchFlights(
        stateRef.current.payload,
        sid,
        (stage) => patch({ flightStage: stage }),
      );
      // Default to backend-selected flight unless payload already has one.
      let payload = stateRef.current.payload;
      if (!findProductByPrefix(payload.products, "F:")) {
        const def = flights.find((f) => f.selected) ?? flights[0];
        if (def) {
          payload = {
            ...payload,
            products: replaceFamily(payload.products, "F:", { id: def.id }),
          };
        }
      }
      patch({ flights, flightStage: "done", payload });
      const ok = await reprice(payload);
      if (ok && totalBefore != null) {
        const after = stateRef.current.receipt?.totalPrice ?? null;
        if (after != null && after !== totalBefore) {
          const diff = after - totalBefore;
          patch({
            flightPriceNotice:
              diff > 0
                ? "Your total has increased after confirming live flight prices."
                : "Good news — your total has decreased after confirming live flight prices.",
          });
        }
      }
    } catch {
      patch({ flightStage: "error", flights: null });
    }
  }, [patch, reprice, sid]);

  const loadCars = useCallback(async () => {
    const s0 = stateRef.current;
    if (s0.carStage === "searching") return;
    patch({ carStage: "searching", cars: null });
    try {
      const cars = await api.searchCars(stateRef.current.payload, sid);
      let payload = stateRef.current.payload;
      if (!findProductByPrefix(payload.products, "C:")) {
        const def = cars.find((c) => c.selected) ?? cars[0];
        if (def) {
          payload = {
            ...payload,
            products: replaceFamily(payload.products, "C:", { id: def.id }),
          };
        }
      }
      patch({ cars, carStage: "done", payload });
      await reprice(payload);
    } catch {
      patch({ carStage: "error", cars: null });
    }
  }, [patch, reprice, sid]);

  const loadCarExtras = useCallback(
    async (carId: string) => {
      patch({ carExtrasLoading: true, carExtras: null });
      try {
        const extras = await api.fetchCarExtras(
          carId,
          stateRef.current.payload,
          sid,
        );
        patch({ carExtras: extras, carExtrasLoading: false });
      } catch {
        patch({ carExtrasLoading: false, carExtras: [] });
      }
    },
    [patch, sid],
  );

  const loadCheckout = useCallback(async () => {
    if (stateRef.current.checkoutLoading) return;
    patch({ checkoutLoading: true });
    try {
      const { meta, paymentMethods } = await api.fetchCheckoutMeta(
        stateRef.current.payload,
        sid,
      );
      const def = paymentMethods.find((p) => p.default) ?? paymentMethods[0];
      patch({
        checkoutMeta: meta,
        paymentMethods,
        paymentMethod: stateRef.current.paymentMethod ?? def?.id ?? null,
        checkoutLoading: false,
      });
      await reprice(stateRef.current.payload);
    } catch (e) {
      patch({ checkoutLoading: false, receiptError: (e as Error).message });
    }
  }, [patch, reprice, sid]);

  const actions: BookingActions = useMemo(
    () => ({
      setOccupancy,
      setAirport,
      setPackageGroup,
      setNightsFilter,
      selectDate,
      clearDate,
      goToStep,
      next,
      back,
      resetToDates,
      setAccommodationProduct,
      setLeisure,
      setFlight,
      setCar,
      setCarExtra,
      setInstalments,
      setPaymentMethod,
      updatePerson,
      submitOrder,
      loadAccommodations,
      loadLeisure,
      loadFlights,
      loadCars,
      loadCarExtras,
      loadCheckout,
    }),
    [
      setOccupancy,
      setAirport,
      setPackageGroup,
      setNightsFilter,
      selectDate,
      clearDate,
      goToStep,
      next,
      back,
      resetToDates,
      setAccommodationProduct,
      setLeisure,
      setFlight,
      setCar,
      setCarExtra,
      setInstalments,
      setPaymentMethod,
      updatePerson,
      submitOrder,
      loadAccommodations,
      loadLeisure,
      loadFlights,
      loadCars,
      loadCarExtras,
      loadCheckout,
    ],
  );

  return <Ctx.Provider value={{ state, actions }}>{children}</Ctx.Provider>;
}
