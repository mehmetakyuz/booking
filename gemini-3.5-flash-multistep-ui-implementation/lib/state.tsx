'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { gql } from './graphql';
import {
  BookingPayload,
  ReceiptData,
  CalendarData,
  OfferMeta,
  StepDefinition,
  AccommodationOption,
  LeisureOption,
  FlightOption,
  CarOption,
  CarExtraOption,
  CheckoutMeta,
  ProductInput,
  PersonInput,
  PersonGroupsInput
} from './types';
import {
  GET_OFFER,
  GET_CALENDAR,
  GET_RECEIPT,
  GET_ACCOMMODATIONS,
  GET_LEISURES,
  START_TASK_GROUP,
  POLL_TASK_GROUP,
  GET_FLIGHTS,
  GET_CARS,
  GET_CAR_EXTRAS,
  GET_CHECKOUT_META,
  CREATE_ORDER
} from './queries';

// State interfaces
export interface MultistepState {
  offerId: string;
  sessionId: string;
  offer: OfferMeta | null;
  currentStep: number;
  maxStepReached: number;
  steps: StepDefinition[];
  
  // Evolving payload
  payload: BookingPayload;
  lastValidStay: {
    selectedDate: string | null;
    nights: number | null;
    packageGroup?: string;
    departureAirports?: string[];
    people: PersonInput[];
    groups: PersonGroupsInput[];
  } | null;

  // Live state
  receipt: ReceiptData | null;
  receiptLoading: boolean;
  receiptError: string | null;

  // Stepped datasets
  calendar: CalendarData | null;
  calendarLoading: boolean;

  accommodations: AccommodationOption[] | null;
  accommodationsLoading: boolean;

  activities: LeisureOption[] | null;
  activitiesLoading: boolean;
  activitiesBaselinePrice: number;

  flights: FlightOption[] | null;
  flightsLoading: boolean;
  flightsStage: 'idle' | 'searching' | 'validating' | 'done' | 'failed' | 'empty';
  flightsError: string | null;
  flightsPreTotal: number | null; // For comparing price delta

  cars: CarOption[] | null;
  carsLoading: boolean;
  carsStage: 'idle' | 'searching' | 'done' | 'failed' | 'empty';
  carsError: string | null;

  carExtras: CarExtraOption[] | null;
  carExtrasLoading: boolean;

  checkoutMeta: CheckoutMeta | null;
  checkoutLoading: boolean;

  // Misc UI state
  modalOpen: 'none' | 'included' | 'excluded' | 'info' | 'itinerary' | 'hotel' | 'activity' | 'flight';
  modalContext: any;
}

const initialPayload = (offerId: string, sessionId: string): BookingPayload => ({
  offerId,
  sessionId,
  people: [{}, {}], // Default 2 adults
  groups: [
    { type: 'ADULT', passengerIndices: [0, 1] }
  ],
  products: [],
  coupons: [],
  numOfInstalments: 1,
  deferred: false
});

const initialState = (offerId: string, sessionId: string): MultistepState => ({
  offerId,
  sessionId,
  offer: null,
  currentStep: 1,
  maxStepReached: 1,
  steps: [],
  payload: initialPayload(offerId, sessionId),
  lastValidStay: null,

  receipt: null,
  receiptLoading: false,
  receiptError: null,

  calendar: null,
  calendarLoading: false,

  accommodations: null,
  accommodationsLoading: false,

  activities: null,
  activitiesLoading: false,
  activitiesBaselinePrice: 0,

  flights: null,
  flightsLoading: false,
  flightsStage: 'idle',
  flightsError: null,
  flightsPreTotal: null,

  cars: null,
  carsLoading: false,
  carsStage: 'idle',
  carsError: null,

  carExtras: null,
  carExtrasLoading: false,

  checkoutMeta: null,
  checkoutLoading: false,

  modalOpen: 'none',
  modalContext: null
});

// Action types
type Action =
  | { type: 'PATCH'; payload: Partial<MultistepState> }
  | { type: 'SET_OFFER'; offer: OfferMeta; steps: StepDefinition[] }
  | { type: 'UPDATE_PAYLOAD'; patch: Partial<BookingPayload> }
  | { type: 'RESET_FLOW' };

function reducer(state: MultistepState, action: Action): MultistepState {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.payload };
    case 'SET_OFFER':
      return {
        ...state,
        offer: action.offer,
        steps: action.steps,
        payload: {
          ...state.payload,
          offerMeta: action.offer
        }
      };
    case 'UPDATE_PAYLOAD':
      return {
        ...state,
        payload: {
          ...state.payload,
          ...action.patch
        }
      };
    case 'RESET_FLOW':
      return initialState(state.offerId, state.sessionId);
    default:
      return state;
  }
}

// URL state compression helpers
function serializeState(state: MultistepState): string {
  const p = state.payload;
  const minimalPayload = {
    s: state.sessionId,
    c: state.currentStep,
    m: state.maxStepReached,
    pe: p.people,
    gr: p.groups,
    da: p.departureAirports,
    pg: p.packageGroup,
    n: p.nights,
    d: p.selectedDate,
    t: p.tourUnit,
    pr: p.products,
    co: p.coupons,
    ni: p.numOfInstalments,
    de: p.deferred,
    pseen: p.priceSeen
  };
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(minimalPayload))));
  } catch (e) {
    return '';
  }
}

function deserializeState(base64Str: string) {
  try {
    const raw = JSON.parse(decodeURIComponent(escape(atob(base64Str))));
    const payload: Partial<BookingPayload> = {
      people: raw.pe,
      groups: raw.gr,
      departureAirports: raw.da,
      packageGroup: raw.pg,
      nights: raw.n,
      selectedDate: raw.d,
      tourUnit: raw.t,
      products: raw.pr || [],
      coupons: raw.co || [],
      numOfInstalments: raw.ni || 1,
      deferred: raw.de || false,
      priceSeen: raw.pseen
    };
    return {
      sessionId: raw.s,
      currentStep: raw.c || 1,
      maxStepReached: raw.m || 1,
      payload
    };
  } catch (e) {
    return null;
  }
}

// Generate unique session id
function generateSessionId() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const stateStr = params.get('state');
    if (stateStr) {
      const decoded = deserializeState(stateStr);
      if (decoded && decoded.sessionId) {
        return decoded.sessionId;
      }
    }
  }
  return 'gemini-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Create steps from offer metadata
export function buildSteps(offerMeta: OfferMeta): StepDefinition[] {
  const steps: StepDefinition[] = [];
  let stepId = 1;
  
  steps.push({ id: stepId++, label: 'Dates', component: 'DatesStep', enabled: true });
  
  if (!offerMeta.isLeisureOnly) {
    steps.push({ id: stepId++, label: 'Rooms', component: 'RoomsStep', enabled: false });
  }
  
  steps.push({ id: stepId++, label: 'Activities', component: 'ActivitiesStep', enabled: false });
  
  if (offerMeta.hasFlights) {
    steps.push({ id: stepId++, label: 'Flights', component: 'FlightsStep', enabled: false });
  }
  
  if (offerMeta.hasCars) {
    steps.push({ id: stepId++, label: 'Cars', component: 'CarsStep', enabled: false });
  }
  
  steps.push({ id: stepId++, label: 'Confirm & pay', component: 'CheckoutStep', enabled: false });
  
  return steps;
}

// Helper: Strip products by prefix (A:, F:, C:, CE:, L:)
export function stripProductsByPrefix(products: ProductInput[], prefix: string): ProductInput[] {
  return (products || []).filter(p => !p.id.startsWith(prefix));
}

// Context Creation
interface BookingContextProps {
  state: MultistepState;
  actions: {
    setPartyComposition: (adults: number, childAges: number[]) => Promise<void>;
    setAirport: (airportCode: string) => Promise<void>;
    setPackageGroup: (groupCode: string) => Promise<void>;
    setNights: (nights: number | null) => Promise<void>;
    selectDate: (date: string, nightsCount?: number | null) => Promise<void>;
    clearDatesSelection: () => Promise<void>;
    confirmDates: () => void;

    // Subsequent actions
    setAccommodationSelection: (hotelId: string, roomId: string, boardId: string) => Promise<void>;
    toggleLeisureSelection: (leisureId: string, unitId: string, selected: boolean) => Promise<void>;
    
    // Flights / Cars
    triggerFlightSearch: () => Promise<void>;
    setFlightSelection: (flightId: string) => Promise<void>;
    triggerCarSearch: () => Promise<void>;
    setCarSelection: (carId: string) => Promise<void>;
    toggleCarExtra: (carId: string, extraId: string, selected: boolean) => Promise<void>;

    // Checkout
    setNumOfInstalments: (instalments: number) => Promise<void>;
    submitCheckout: (customerForm: any, participantForms: any[], paymentMethodId: string) => Promise<void>;

    // Modals
    openModal: (type: MultistepState['modalOpen'], ctx?: any) => void;
    closeModal: () => void;

    // Navigation
    goToStep: (stepId: number) => void;
    nextStep: () => void;
    prevStep: () => void;
  };
}

const BookingContext = createContext<BookingContextProps | undefined>(undefined);

export function BookingProvider({ offerId, children }: { offerId: string; children: React.ReactNode }) {
  const sessionIdRef = useRef<string>('');
  
  // Initialize sessionId
  if (!sessionIdRef.current) {
    sessionIdRef.current = generateSessionId();
  }
  
  const [state, dispatch] = useReducer(reducer, initialState(offerId, sessionIdRef.current));
  
  const patch = useCallback((fields: Partial<MultistepState>) => {
    dispatch({ type: 'PATCH', payload: fields });
  }, []);

  const updatePayload = useCallback((patchPayload: Partial<BookingPayload>) => {
    dispatch({ type: 'UPDATE_PAYLOAD', patch: patchPayload });
  }, []);

  // Sync state to URL (history replacement to avoid navigation)
  useEffect(() => {
    if (state.offer) {
      const stateStr = serializeState(state);
      const newUrl = `${window.location.pathname}?state=${stateStr}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [state.payload, state.currentStep, state.maxStepReached, state.offer]);

  // Load receipt core helper
  const loadReceipt = useCallback(async (payload: BookingPayload, silent: boolean = false) => {
    if (!silent) patch({ receiptLoading: true, receiptError: null });
    
    try {
      const variables = {
        offerId: payload.offerId,
        people: payload.people,
        groups: payload.groups,
        date: payload.selectedDate,
        nights: payload.nights,
        departureAirports: payload.departureAirports,
        packageGroup: payload.packageGroup || null,
        products: payload.products || [],
        coupons: payload.coupons || [],
        numOfInstalments: payload.numOfInstalments || 1,
        deferred: payload.deferred || false
      };

      const res = await gql<{ dynamicPackageReceipt: ReceiptData }>(
        GET_RECEIPT,
        variables,
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const receipt = res.dynamicPackageReceipt;

      // Normalize components inside itinerary
      if (receipt.itinerary && receipt.itinerary.events) {
        receipt.itinerary.events = receipt.itinerary.events.map(ev => ({
          ...ev,
          components: (ev.components || []).map(comp => {
            let normalizedType = 'transfer';
            if (comp.__typename === 'ItineraryAccommodationComponent') normalizedType = 'accommodation';
            else if (comp.__typename === 'ItineraryFlightComponent') normalizedType = 'flight';
            else if (comp.__typename === 'ItineraryCarComponent') normalizedType = 'car';
            else if (comp.__typename === 'ItineraryLeisureComponent') normalizedType = 'activity';
            else if (comp.__typename === 'ItineraryTransferComponent') normalizedType = 'transfer';
            return { ...comp, type: normalizedType };
          })
        }));
      }

      // Check for errors
      if (receipt.errors && receipt.errors.length > 0) {
        const errMsg = receipt.errors[0].message;
        
        // Handle step-based rollback
        if (state.currentStep === 1) {
          // Stay selection rollback
          if (state.lastValidStay) {
            patch({
              receiptError: errMsg,
              receiptLoading: false,
              payload: {
                ...state.payload,
                ...state.lastValidStay
              }
            });
          } else {
            // No prior stay, just reset selection
            patch({
              receiptError: errMsg,
              receiptLoading: false,
              payload: {
                ...state.payload,
                selectedDate: null,
                nights: null
              }
            });
          }
        } else {
          // Downstream rollback rules: clear downstream state, reset to Dates step, and require new stay selection.
          const resetPayload = {
            ...state.payload,
            products: [],
            selectedDate: null,
            nights: null
          };
          patch({
            receiptError: `Invalid package combination: ${errMsg}. Redirected to dates selection.`,
            receiptLoading: false,
            payload: resetPayload,
            currentStep: 1,
            accommodations: null,
            activities: null,
            flights: null,
            cars: null,
            carExtras: null
          });
        }
        return false;
      }

      // Valid receipt, save as last valid stay if on step 1
      const patchObj: Partial<MultistepState> = {
        receipt,
        receiptLoading: false,
        receiptError: null,
        payload: {
          ...payload,
          priceSeen: receipt.totalPrice.toString()
        }
      };

      if (state.currentStep === 1 && payload.selectedDate && payload.nights) {
        patchObj.lastValidStay = {
          selectedDate: payload.selectedDate,
          nights: payload.nights,
          packageGroup: payload.packageGroup,
          departureAirports: payload.departureAirports,
          people: payload.people,
          groups: payload.groups
        };
      }

      patch(patchObj);
      return true;
    } catch (e: any) {
      patch({
        receiptLoading: false,
        receiptError: e.message || 'Failed to compute price receipt.'
      });
      return false;
    }
  }, [state.currentStep, state.lastValidStay, state.payload, patch]);

  // Load calendar facets
  const loadCalendar = useCallback(async (p: BookingPayload) => {
    patch({ calendarLoading: true });
    try {
      const vars = {
        id: p.offerId,
        people: p.people,
        groups: p.groups,
        nights: p.nights ? [p.nights] : null,
        departureAirports: p.departureAirports || null,
        packageGroups: p.packageGroup ? [p.packageGroup] : null
      };

      const res = await gql<{ offer: { calendar: CalendarData } }>(
        GET_CALENDAR,
        vars,
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      patch({
        calendar: res.offer.calendar,
        calendarLoading: false
      });
    } catch (e) {
      patch({ calendarLoading: false });
    }
  }, [patch]);

  // Boot hydration / load initial offer data
  useEffect(() => {
    const bootApp = async () => {
      patch({ receiptLoading: true });
      try {
        const res = await gql<{ offer: OfferMeta }>(GET_OFFER, { id: offerId }, { 'x-tb-sessionid': sessionIdRef.current });
        const offer = res.offer;
        const steps = buildSteps(offer);
        dispatch({ type: 'SET_OFFER', offer, steps });

        // Check if there is URL state to restore
        const params = new URLSearchParams(window.location.search);
        const stateStr = params.get('state');

        if (stateStr) {
          const restored = deserializeState(stateStr);
          if (restored && restored.payload) {
            const mergedPayload = {
              ...initialPayload(offerId, sessionIdRef.current),
              ...restored.payload,
              offerMeta: offer
            };

            patch({
              currentStep: restored.currentStep,
              maxStepReached: restored.maxStepReached,
              payload: mergedPayload
            });

            // Hydrate calendar and receipt
            await loadCalendar(mergedPayload);
            if (mergedPayload.selectedDate && mergedPayload.nights) {
              await loadReceipt(mergedPayload);
            } else {
              patch({ receiptLoading: false });
            }
            return;
          }
        }

        // Two-stage bootstrap calendar loading
        // 1. Fetch unselected calendar facets for default party
        const tempPayload = initialPayload(offerId, sessionIdRef.current);
        tempPayload.offerMeta = offer;

        // Fetch calendar with no airport or package group
        const initRes = await gql<{ offer: { calendar: CalendarData } }>(
          GET_CALENDAR,
          {
            id: offerId,
            people: tempPayload.people,
            groups: tempPayload.groups,
            nights: null,
            departureAirports: null,
            packageGroups: null
          },
          { 'x-tb-sessionid': sessionIdRef.current }
        );

        const initCal = initRes.offer.calendar;

        // 2. Select leading options
        const defaultAirport = initCal.departureAirports?.[0]?.value;
        const defaultPackageGroup = initCal.packageGroups?.[0]?.value || '';

        const finalPayload = {
          ...tempPayload,
          departureAirports: defaultAirport ? [defaultAirport] : [],
          packageGroup: defaultPackageGroup,
          nights: initCal.nights?.[0] ? parseInt(initCal.nights[0].value) : null
        };

        // Fetch the second calendar with these default selections
        const finalCalRes = await gql<{ offer: { calendar: CalendarData } }>(
          GET_CALENDAR,
          {
            id: offerId,
            people: finalPayload.people,
            groups: finalPayload.groups,
            nights: finalPayload.nights ? [finalPayload.nights] : null,
            departureAirports: finalPayload.departureAirports,
            packageGroups: finalPayload.packageGroup ? [finalPayload.packageGroup] : null
          },
          { 'x-tb-sessionid': sessionIdRef.current }
        );

        patch({
          calendar: finalCalRes.offer.calendar,
          payload: finalPayload,
          receiptLoading: false
        });
      } catch (e) {
        patch({ receiptLoading: false });
      }
    };

    bootApp();
  }, [offerId, loadCalendar, loadCalendar, patch]);

  // Actions implementation

  const setPartyComposition = useCallback(async (adults: number, childAges: number[]) => {
    // Reconstruct people
    const people: PersonInput[] = [];
    const groups: PersonGroupsInput[] = [];
    const adultIndices: number[] = [];
    const childIndices: number[] = [];

    // Adults
    for (let i = 0; i < adults; i++) {
      people.push({});
      adultIndices.push(i);
    }
    groups.push({ type: 'ADULT', passengerIndices: adultIndices });

    // Children
    childAges.forEach((age, idx) => {
      const overallIndex = adults + idx;
      people.push({});
      childIndices.push(overallIndex);
      groups.push({ type: 'CHILD', passengerIndices: [overallIndex], age });
    });

    const newPayload = {
      ...state.payload,
      people,
      groups,
      products: [], // Reset downstream selections
      selectedDate: null, // Reset dates to force recalculation
      nights: null
    };

    updatePayload(newPayload);
    await loadCalendar(newPayload);
    patch({ receipt: null }); // clear receipt
  }, [state.payload, updatePayload, loadCalendar, patch]);

  const setAirport = useCallback(async (airportCode: string) => {
    const airportList = airportCode ? [airportCode] : [];
    const newPayload = {
      ...state.payload,
      departureAirports: airportList,
      products: [],
      selectedDate: null,
      nights: null
    };
    updatePayload(newPayload);
    await loadCalendar(newPayload);
    patch({ receipt: null });
  }, [state.payload, updatePayload, loadCalendar, patch]);

  const setPackageGroup = useCallback(async (groupCode: string) => {
    const newPayload = {
      ...state.payload,
      packageGroup: groupCode,
      products: [],
      selectedDate: null,
      nights: null
    };
    updatePayload(newPayload);
    await loadCalendar(newPayload);
    patch({ receipt: null });
  }, [state.payload, updatePayload, loadCalendar, patch]);

  const setNights = useCallback(async (nights: number | null) => {
    const newPayload = {
      ...state.payload,
      nights,
      products: [],
      selectedDate: null
    };
    updatePayload(newPayload);
    await loadCalendar(newPayload);
    patch({ receipt: null });
  }, [state.payload, updatePayload, loadCalendar, patch]);

  const selectDate = useCallback(async (date: string, nightsCount?: number | null) => {
    const nights = nightsCount !== undefined ? nightsCount : state.payload.nights;
    const newPayload = {
      ...state.payload,
      selectedDate: date,
      nights,
      products: [] // Stay selected clears downstream selections
    };
    updatePayload(newPayload);
    await loadReceipt(newPayload);
  }, [state.payload, updatePayload, loadReceipt]);

  const clearDatesSelection = useCallback(async () => {
    const newPayload = {
      ...state.payload,
      selectedDate: null,
      products: []
    };
    updatePayload(newPayload);
    patch({ receipt: null, receiptError: null });
  }, [state.payload, updatePayload, patch]);

  const confirmDates = useCallback(() => {
    if (state.receipt && !state.receiptError) {
      const nextStepId = state.currentStep + 1;
      patch({
        currentStep: nextStepId,
        maxStepReached: Math.max(state.maxStepReached, nextStepId)
      });
      // Scroll to top of viewport
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
    }
  }, [state.currentStep, state.maxStepReached, state.receipt, state.receiptError, patch]);

  // Load Accommodations Step
  const loadAccommodations = useCallback(async (payload: BookingPayload) => {
    patch({ accommodationsLoading: true });
    try {
      const cleanProducts = stripProductsByPrefix(payload.products || [], 'A:');
      
      const vars = {
        offerId: payload.offerId,
        people: payload.people,
        groups: payload.groups,
        date: payload.selectedDate!,
        nights: payload.nights!,
        departureAirports: payload.departureAirports,
        packageGroup: payload.packageGroup
      };

      const res = await gql<{ dynamicPackage: { accomodations: AccommodationOption[] } }>(
        GET_ACCOMMODATIONS,
        vars,
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const accommodations = res.dynamicPackage.accomodations;
      
      // Auto-set the backend-selected defaults if there is no current selection
      const activeAccom = payload.products?.find(p => p.id.startsWith('A:'));
      
      let updatedPayloadProducts = payload.products || [];

      if (!activeAccom && accommodations && accommodations.length > 0) {
        // Find default hotel, or fallback to first
        const defaultHotel = accommodations.find(h => h.selected) || accommodations[0];
        // Find default room, or fallback to first
        const defaultRoom = defaultHotel.units?.find(r => r.selected) || defaultHotel.units?.[0];
        // Find default board, or fallback to first
        const defaultBoard = defaultRoom?.boards?.find(b => b.selected) || defaultRoom?.boards?.[0];

        const defaultProductId = defaultBoard ? defaultBoard.id : (defaultRoom ? defaultRoom.id : defaultHotel.id);
        
        updatedPayloadProducts = [
          ...stripProductsByPrefix(payload.products || [], 'A:'),
          { id: defaultProductId }
        ];

        // Silent receipt reprice to ensure it is selected
        const updatedPayload = { ...payload, products: updatedPayloadProducts };
        await loadReceipt(updatedPayload, true);
      }

      patch({
        accommodations,
        accommodationsLoading: false
      });
    } catch (e) {
      patch({ accommodationsLoading: false });
    }
  }, [loadReceipt, patch]);

  // Set accommodation selection
  const setAccommodationSelection = useCallback(async (hotelId: string, roomId: string, boardId: string) => {
    // Clear old accommodation products
    const cleanProducts = stripProductsByPrefix(state.payload.products || [], 'A:');
    
    // Choose product ID: boardId has highest priority, then roomId, then hotelId
    const targetProductId = boardId || roomId || hotelId;

    const newPayload = {
      ...state.payload,
      products: [...cleanProducts, { id: targetProductId }]
    };

    updatePayload(newPayload);
    await loadReceipt(newPayload);
  }, [state.payload, updatePayload, loadReceipt]);

  // Load Activities Step
  const loadActivities = useCallback(async (payload: BookingPayload) => {
    patch({ activitiesLoading: true });
    try {
      // Strip leisure products
      const cleanProducts = stripProductsByPrefix(payload.products || [], 'L:');
      
      const vars = {
        offerId: payload.offerId,
        people: payload.people,
        groups: payload.groups,
        date: payload.selectedDate!,
        nights: payload.nights!,
        departureAirports: payload.departureAirports,
        packageGroup: payload.packageGroup,
        products: cleanProducts
      };

      const res = await gql<{ dynamicPackage: { price: number; leisures: LeisureOption[] } }>(
        GET_LEISURES,
        vars,
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const baselinePrice = res.dynamicPackage.price;
      const activities = res.dynamicPackage.leisures;

      // Auto-select backend-selected default variations
      let updatedProducts = payload.products || [];
      let selectionMade = false;

      activities.forEach(act => {
        // Only auto-select for included activities, or if backend says selected
        if (!act.optional) {
          const selectedUnit = act.units?.find(u => u.selected);
          if (selectedUnit) {
            const hasUnit = updatedProducts.some(p => p.id === selectedUnit.id);
            if (!hasUnit) {
              updatedProducts = [
                ...stripProductsByPrefix(updatedProducts, selectedUnit.id),
                { id: selectedUnit.id }
              ];
              selectionMade = true;
            }
          }
        }
      });

      if (selectionMade) {
        const updatedPayload = { ...payload, products: updatedProducts };
        await loadReceipt(updatedPayload, true);
      }

      patch({
        activities,
        activitiesLoading: false,
        activitiesBaselinePrice: baselinePrice
      });
    } catch (e) {
      patch({ activitiesLoading: false });
    }
  }, [loadReceipt, patch]);

  const toggleLeisureSelection = useCallback(async (leisureId: string, unitId: string, selected: boolean) => {
    let cleanProducts = state.payload.products || [];
    
    if (selected) {
      // Ensure unit is added, first strip the same unit if it exists (safety)
      cleanProducts = cleanProducts.filter(p => p.id !== unitId);
      cleanProducts = [...cleanProducts, { id: unitId }];
    } else {
      // Remove unit
      cleanProducts = cleanProducts.filter(p => p.id !== unitId);
    }

    const newPayload = {
      ...state.payload,
      products: cleanProducts
    };

    updatePayload(newPayload);
    await loadReceipt(newPayload);
  }, [state.payload, updatePayload, loadReceipt]);

  // Flights Async Polling Flow
  const triggerFlightSearch = useCallback(async () => {
    patch({
      flightsLoading: true,
      flightsStage: 'searching',
      flightsError: null,
      flightsPreTotal: state.receipt?.totalPrice || null
    });

    try {
      const cleanProducts = stripProductsByPrefix(state.payload.products || [], 'F:');
      
      const taskInput = {
        key: 'FLIGHT_SEARCH',
        dynamicPackage: {
          offerId: state.payload.offerId,
          people: state.payload.people,
          groups: state.payload.groups,
          date: state.payload.selectedDate!,
          nights: state.payload.nights!,
          departureAirports: state.payload.departureAirports,
          packageGroup: state.payload.packageGroup,
          products: cleanProducts
        }
      };

      // 1. Start flight search task
      const startRes = await gql<{ startTaskGroup: { taskGroupId: string } }>(
        START_TASK_GROUP,
        { tasks: [taskInput] },
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const searchGroupId = startRes.startTaskGroup.taskGroupId;

      // 2. Poll FLIGHT_SEARCH until FINISHED
      let searchFinished = false;
      const startTime = Date.now();
      const timeout = 60000; // 60s timeout

      while (!searchFinished) {
        if (Date.now() - startTime > timeout) {
          throw new Error('Flight search timed out.');
        }

        await new Promise(r => setTimeout(r, 2000));

        const pollRes = await gql<{ pollTaskGroup: { status: string } }>(
          POLL_TASK_GROUP,
          { taskGroupId: searchGroupId },
          { 'x-tb-sessionid': sessionIdRef.current }
        );

        const status = pollRes.pollTaskGroup.status;
        if (status === 'FINISHED') {
          searchFinished = true;
        } else if (status === 'FAILED') {
          throw new Error('Flight search task failed on backend.');
        }
      }

      // 3. Start price validation
      patch({ flightsStage: 'validating' });

      const validationInput = {
        ...taskInput,
        key: 'FLIGHT_PRICE_VALIDATION'
      };

      const valStartRes = await gql<{ startTaskGroup: { taskGroupId: string } }>(
        START_TASK_GROUP,
        { tasks: [validationInput] },
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const valGroupId = valStartRes.startTaskGroup.taskGroupId;

      // 4. Poll validation
      let valFinished = false;
      const valStartTime = Date.now();

      while (!valFinished) {
        if (Date.now() - valStartTime > timeout) {
          throw new Error('Flight price validation timed out.');
        }

        await new Promise(r => setTimeout(r, 2000));

        const pollRes = await gql<{ pollTaskGroup: { status: string } }>(
          POLL_TASK_GROUP,
          { taskGroupId: valGroupId },
          { 'x-tb-sessionid': sessionIdRef.current }
        );

        const status = pollRes.pollTaskGroup.status;
        if (status === 'FINISHED') {
          valFinished = true;
        } else if (status === 'FAILED') {
          throw new Error('Flight validation task failed.');
        }
      }

      // 5. Fetch final flights
      const finalRes = await gql<{ dynamicPackage: { flights: FlightOption[] } }>(
        GET_FLIGHTS,
        {
          offerId: state.payload.offerId,
          people: state.payload.people,
          groups: state.payload.groups,
          date: state.payload.selectedDate!,
          nights: state.payload.nights!,
          departureAirports: state.payload.departureAirports,
          packageGroup: state.payload.packageGroup,
          products: cleanProducts
        },
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const flights = finalRes.dynamicPackage.flights || [];

      if (flights.length === 0) {
        patch({
          flights: [],
          flightsLoading: false,
          flightsStage: 'empty'
        });
        return;
      }

      // 6. Silent receipt reprice for unchanged payload
      await loadReceipt(state.payload, true);

      // Auto select default flight
      let updatedProducts = state.payload.products || [];
      const hasFlight = updatedProducts.some(p => p.id.startsWith('F:'));

      if (!hasFlight) {
        const defaultFlight = flights.find(f => f.selected) || flights[0];
        if (defaultFlight) {
          updatedProducts = [...cleanProducts, { id: defaultFlight.id }];
          const finalPayload = { ...state.payload, products: updatedProducts };
          await loadReceipt(finalPayload, true);
        }
      }

      patch({
        flights,
        flightsLoading: false,
        flightsStage: 'done'
      });
    } catch (e: any) {
      patch({
        flights: [],
        flightsLoading: false,
        flightsStage: 'failed',
        flightsError: e.message || 'No flights found for this selection.'
      });
    }
  }, [state.payload, state.receipt, loadReceipt, patch]);

  const setFlightSelection = useCallback(async (flightId: string) => {
    const cleanProducts = stripProductsByPrefix(state.payload.products || [], 'F:');
    const newPayload = {
      ...state.payload,
      products: [...cleanProducts, { id: flightId }]
    };
    updatePayload(newPayload);
    await loadReceipt(newPayload);
  }, [state.payload, updatePayload, loadReceipt]);

  // Cars Polling Flow
  const triggerCarSearch = useCallback(async () => {
    patch({
      carsLoading: true,
      carsStage: 'searching',
      carsError: null
    });

    try {
      const cleanProducts = stripProductsByPrefix(state.payload.products || [], 'C:');
      const cleanProductsWithoutExtras = stripProductsByPrefix(cleanProducts, 'CE:');

      const taskInput = {
        key: 'CAR_SEARCH',
        dynamicPackage: {
          offerId: state.payload.offerId,
          people: state.payload.people,
          groups: state.payload.groups,
          date: state.payload.selectedDate!,
          nights: state.payload.nights!,
          departureAirports: state.payload.departureAirports,
          packageGroup: state.payload.packageGroup,
          products: cleanProductsWithoutExtras
        }
      };

      const startRes = await gql<{ startTaskGroup: { taskGroupId: string } }>(
        START_TASK_GROUP,
        { tasks: [taskInput] },
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const searchGroupId = startRes.startTaskGroup.taskGroupId;
      let searchFinished = false;
      const startTime = Date.now();
      const timeout = 60000;

      while (!searchFinished) {
        if (Date.now() - startTime > timeout) {
          throw new Error('Car search timed out.');
        }

        await new Promise(r => setTimeout(r, 2000));

        const pollRes = await gql<{ pollTaskGroup: { status: string } }>(
          POLL_TASK_GROUP,
          { taskGroupId: searchGroupId },
          { 'x-tb-sessionid': sessionIdRef.current }
        );

        const status = pollRes.pollTaskGroup.status;
        if (status === 'FINISHED') {
          searchFinished = true;
        } else if (status === 'FAILED') {
          throw new Error('Car search task failed.');
        }
      }

      const finalRes = await gql<{ dynamicPackage: { cars: CarOption[] } }>(
        GET_CARS,
        {
          offerId: state.payload.offerId,
          people: state.payload.people,
          groups: state.payload.groups,
          date: state.payload.selectedDate!,
          nights: state.payload.nights!,
          departureAirports: state.payload.departureAirports,
          packageGroup: state.payload.packageGroup,
          products: cleanProductsWithoutExtras
        },
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const cars = finalRes.dynamicPackage.cars || [];

      if (cars.length === 0) {
        patch({
          cars: [],
          carsLoading: false,
          carsStage: 'empty'
        });
        return;
      }

      // Auto-select default car
      let updatedProducts = state.payload.products || [];
      const hasCar = updatedProducts.some(p => p.id.startsWith('C:'));
      
      let activeCarId = '';

      if (!hasCar) {
        const defaultCar = cars.find(c => c.selected) || cars[0];
        if (defaultCar) {
          activeCarId = defaultCar.id;
          updatedProducts = [...cleanProductsWithoutExtras, { id: defaultCar.id }];
          const finalPayload = { ...state.payload, products: updatedProducts };
          await loadReceipt(finalPayload, true);
        }
      } else {
        activeCarId = updatedProducts.find(p => p.id.startsWith('C:'))!.id;
      }

      patch({
        cars,
        carsLoading: false,
        carsStage: 'done'
      });

      // Load car extras automatically for active car
      if (activeCarId) {
        actions.setCarSelection(activeCarId); // Triggers extras polling
      }
    } catch (e: any) {
      patch({
        cars: [],
        carsLoading: false,
        carsStage: 'failed',
        carsError: e.message || 'No rental cars found.'
      });
    }
  }, [state.payload, actions, loadReceipt, patch]);

  const loadCarExtras = useCallback(async (carId: string) => {
    patch({ carExtrasLoading: true, carExtras: null });
    try {
      // 1. Start extras task group
      const vars = {
        key: 'CAR_EXTRAS',
        dynamicPackage: {
          offerId: state.payload.offerId,
          people: state.payload.people,
          groups: state.payload.groups,
          date: state.payload.selectedDate!,
          nights: state.payload.nights!,
          departureAirports: state.payload.departureAirports,
          packageGroup: state.payload.packageGroup,
          products: state.payload.products
        }
      };

      const startRes = await gql<{ startTaskGroup: { taskGroupId: string } }>(
        START_TASK_GROUP,
        { tasks: [vars] },
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const groupId = startRes.startTaskGroup.taskGroupId;
      let finished = false;
      const startTime = Date.now();
      const timeout = 60000;

      while (!finished) {
        if (Date.now() - startTime > timeout) {
          throw new Error('Extras search timed out.');
        }

        await new Promise(r => setTimeout(r, 2000));

        const pollRes = await gql<{ pollTaskGroup: { status: string } }>(
          POLL_TASK_GROUP,
          { taskGroupId: groupId },
          { 'x-tb-sessionid': sessionIdRef.current }
        );

        if (pollRes.pollTaskGroup.status === 'FINISHED') finished = true;
        else if (pollRes.pollTaskGroup.status === 'FAILED') throw new Error('Extras task failed.');
      }

      // 2. Fetch car extras
      const extrasRes = await gql<{ carExtra: { extras: CarExtraOption[] } }>(
        GET_CAR_EXTRAS,
        { carProductSetId: carId },
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      patch({
        carExtras: extrasRes.carExtra.extras || [],
        carExtrasLoading: false
      });
    } catch (e) {
      patch({ carExtrasLoading: false, carExtras: [] });
    }
  }, [state.payload, patch]);

  const setCarSelection = useCallback(async (carId: string) => {
    // Strip old car and car extras
    let cleanProducts = stripProductsByPrefix(state.payload.products || [], 'C:');
    cleanProducts = stripProductsByPrefix(cleanProducts, 'CE:');

    const newPayload = {
      ...state.payload,
      products: [...cleanProducts, { id: carId }]
    };

    updatePayload(newPayload);
    await loadReceipt(newPayload);

    // Fetch new extras in background
    loadCarExtras(carId);
  }, [state.payload, updatePayload, loadReceipt, loadCarExtras]);

  const toggleCarExtra = useCallback(async (carId: string, extraId: string, selected: boolean) => {
    let products = state.payload.products || [];
    
    if (selected) {
      products = [...products, { id: extraId }];
    } else {
      products = products.filter(p => p.id !== extraId);
    }

    const newPayload = {
      ...state.payload,
      products
    };

    updatePayload(newPayload);
    await loadReceipt(newPayload);
  }, [state.payload, updatePayload, loadReceipt]);

  // Checkout step
  const loadCheckoutMeta = useCallback(async (payload: BookingPayload) => {
    patch({ checkoutLoading: true });
    try {
      const res = await gql<any>(
        GET_CHECKOUT_META,
        {
          offerId: payload.offerId,
          people: payload.people,
          groups: payload.groups,
          date: payload.selectedDate!,
          nights: payload.nights!,
          departureAirports: payload.departureAirports,
          packageGroup: payload.packageGroup,
          products: payload.products
        },
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const dp = res.dynamicPackage;

      // Extract metadata fields based on returned string names
      const fields = [
        { name: 'title', label: 'Title', type: 'select', required: true, options: [{ value: 'MR', label: 'Mr' }, { value: 'MRS', label: 'Mrs' }, { value: 'MS', label: 'Ms' }, { value: 'MISS', label: 'Miss' }, { value: 'DR', label: 'Dr' }] },
        { name: 'firstName', label: 'First Name', type: 'text', required: true },
        { name: 'lastName', label: 'Last Name', type: 'text', required: true },
        { name: 'email', label: 'Email Address', type: 'email', required: true },
        { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
        { name: 'nationality', label: 'Nationality', type: 'select', required: true, options: res.countries.map((c: any) => ({ value: c.code, label: c.name })) },
        { name: 'gender', label: 'Gender', type: 'select', required: true, options: [{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }] }
      ];

      const checkoutMeta: CheckoutMeta = {
        countries: res.countries,
        fields,
        termsMarkdown: dp.termsAndConditions?.termsMarkdown || '',
        euDirectiveHtml: dp.euDirectiveText || '',
        paymentMethods: dp.paymentMethods || []
      };

      patch({
        checkoutMeta,
        checkoutLoading: false
      });
    } catch (e) {
      patch({ checkoutLoading: false });
    }
  }, [patch]);

  const setNumOfInstalments = useCallback(async (instalments: number) => {
    const newPayload = {
      ...state.payload,
      numOfInstalments: instalments
    };
    updatePayload(newPayload);
    await loadReceipt(newPayload);
  }, [state.payload, updatePayload, loadReceipt]);

  const submitCheckout = useCallback(async (customerForm: any, participantForms: any[], paymentMethodId: string) => {
    patch({ receiptLoading: true, receiptError: null });
    try {
      // Build final people array enlivened by form details
      const people = state.payload.people.map((person, idx) => {
        if (idx === 0) {
          return { ...person, ...customerForm };
        }
        return { ...person, ...(participantForms[idx - 1] || {}) };
      });

      const currentReceipt = state.receipt;
      if (!currentReceipt) throw new Error('Receipt is missing.');

      const variables = {
        offerId: state.payload.offerId,
        customer: 0,
        people,
        groups: state.payload.groups,
        totalPrice: currentReceipt.totalPrice, // Send minor unit integer
        date: state.payload.selectedDate,
        nights: state.payload.nights,
        departureAirports: state.payload.departureAirports,
        packageGroup: state.payload.packageGroup,
        products: state.payload.products,
        coupons: state.payload.coupons,
        numOfInstalments: state.payload.numOfInstalments || 1,
        deferred: state.payload.deferred || false,
        properties: [{ key: 'restore_url', value: window.location.href }],
        priceSeen: currentReceipt.totalPrice
      };

      const res = await gql<{ createOrder: { result?: { order?: any; paymentResult?: any; errors?: any[] } } }>(
        CREATE_ORDER,
        variables,
        { 'x-tb-sessionid': sessionIdRef.current }
      );

      const result = res.createOrder.result;

      if (result?.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message || 'Checkout failed.');
      }

      const redirectUrl = result?.paymentResult?.continueUrl;

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error('Missing payment redirection URL.');
      }
    } catch (e: any) {
      patch({
        receiptLoading: false,
        receiptError: e.message || 'Checkout request failed.'
      });
    }
  }, [state.payload, state.receipt, patch]);

  // Modal actions
  const openModal = useCallback((type: MultistepState['modalOpen'], ctx?: any) => {
    patch({ modalOpen: type, modalContext: ctx });
  }, [patch]);

  const closeModal = useCallback(() => {
    patch({ modalOpen: 'none', modalContext: null });
  }, [patch]);

  // Navigation actions
  const goToStep = useCallback((stepId: number) => {
    if (stepId <= state.maxStepReached) {
      patch({ currentStep: stepId });
      
      // Load current step datasets if they haven't been loaded yet
      const step = state.steps.find(s => s.id === stepId);
      if (step) {
        if (step.component === 'RoomsStep' && !state.accommodations) {
          loadAccommodations(state.payload);
        } else if (step.component === 'ActivitiesStep' && !state.activities) {
          loadActivities(state.payload);
        } else if (step.component === 'FlightsStep' && state.flightsStage === 'idle') {
          triggerFlightSearch();
        } else if (step.component === 'CarsStep' && state.carsStage === 'idle') {
          triggerCarSearch();
        } else if (step.component === 'CheckoutStep' && !state.checkoutMeta) {
          loadCheckoutMeta(state.payload);
        }
      }

      if (typeof window !== 'undefined') window.scrollTo(0, 0);
    }
  }, [
    state.maxStepReached,
    state.steps,
    state.payload,
    state.accommodations,
    state.activities,
    state.flightsStage,
    state.carsStage,
    state.checkoutMeta,
    loadAccommodations,
    loadActivities,
    triggerFlightSearch,
    triggerCarSearch,
    loadCheckoutMeta,
    patch
  ]);

  const nextStep = useCallback(() => {
    const nextStepId = state.currentStep + 1;
    if (nextStepId <= state.steps.length) {
      goToStep(nextStepId);
    }
  }, [state.currentStep, state.steps, goToStep]);

  const prevStep = useCallback(() => {
    const prevStepId = state.currentStep - 1;
    if (prevStepId >= 1) {
      patch({ currentStep: prevStepId });
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
    }
  }, [state.currentStep, patch]);

  const actions = React.useMemo(() => ({
    setPartyComposition,
    setAirport,
    setPackageGroup,
    setNights,
    selectDate,
    clearDatesSelection,
    confirmDates,
    setAccommodationSelection,
    toggleLeisureSelection,
    triggerFlightSearch,
    setFlightSelection,
    triggerCarSearch,
    setCarSelection,
    toggleCarExtra,
    setNumOfInstalments,
    submitCheckout,
    openModal,
    closeModal,
    goToStep,
    nextStep,
    prevStep
  }), [
    setPartyComposition,
    setAirport,
    setPackageGroup,
    setNights,
    selectDate,
    clearDatesSelection,
    confirmDates,
    setAccommodationSelection,
    toggleLeisureSelection,
    triggerFlightSearch,
    setFlightSelection,
    triggerCarSearch,
    setCarSelection,
    toggleCarExtra,
    setNumOfInstalments,
    submitCheckout,
    openModal,
    closeModal,
    goToStep,
    nextStep,
    prevStep
  ]);

  return (
    <BookingContext.Provider value={{ state, actions }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
