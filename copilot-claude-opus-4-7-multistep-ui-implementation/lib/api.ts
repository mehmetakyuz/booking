import { gqlClient } from "./graphql";
import {
  GET_OFFER_QUERY,
  GET_CALENDAR_QUERY,
  GET_RECEIPT_QUERY,
  GET_ACCOMMODATIONS_QUERY,
  GET_LEISURES_QUERY,
  GET_FLIGHTS_QUERY,
  GET_CARS_QUERY,
  GET_CAR_EXTRAS_QUERY,
  GET_CHECKOUT_META_QUERY,
  START_TASK_GROUP_MUTATION,
  POLL_TASK_GROUP_QUERY,
  CREATE_ORDER_MUTATION,
} from "./queries";
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
  ItineraryComponent,
  ItineraryComponentKind,
} from "./types";
import { payloadToReceiptVariables, payloadToVariables, stripProductsByPrefix } from "./payload";

// ============ Offer ============

export async function fetchOffer(offerId: string, sessionId: string): Promise<OfferData> {
  const data = await gqlClient<{ offer: any }>(GET_OFFER_QUERY, { id: offerId }, sessionId);
  const o = data.offer;
  if (!o) throw new Error("Offer not found");
  return {
    id: o.id,
    title: o.title,
    shortTitle: o.shortTitle,
    summary: o.summary,
    reasonToLove: o.reasonToLove,
    image: o.image,
    gallery: o.gallery || [],
    priceNumberOfNights: o.priceNumberOfNights,
    paymentHelp: o.paymentHelp,
    occupancyRules: o.occupancyRules,
    meta: {
      hasFlights: !!o.hasFlights,
      hasCars: !!o.hasCars,
      hasAccommodationUnits: !!o.hasAccommodationUnits,
      isLeisureOnly: !!o.isLeisureOnly,
      selectDate: !!o.selectDate,
      isRoundtrip: !!o.isRoundtrip,
    },
    termsAndConditions: o.termsAndConditions,
    includedList: o.includedListWithDescriptions || [],
    excludedList: o.excludedList || [],
    informationList: (o.informationList || []).map((it: any) => ({ name: it.label, description: it.value })),
    destination: o.destinationText?.location ?? null,
  };
}

// ============ Calendar ============

export async function fetchCalendar(payload: BookingPayload, opts: { forCalendarOnly?: boolean } = {}): Promise<CalendarData> {
  void opts;
  const variables: Record<string, unknown> = {
    id: payload.offerId,
    people: payload.people,
    groups: payload.groups,
  };
  if (payload.nights != null) variables.nights = [payload.nights];
  if (payload.departureAirports && payload.departureAirports.length) variables.departureAirports = payload.departureAirports;
  if (payload.packageGroup) variables.packageGroups = [payload.packageGroup];
  if (payload.tourUnit != null) variables.tourUnits = [String(payload.tourUnit)];

  const data = await gqlClient<{ offer: { calendar: any } }>(GET_CALENDAR_QUERY, variables, payload.sessionId);
  const cal = data.offer?.calendar;
  if (!cal) throw new Error("Calendar unavailable");
  return {
    airports: (cal.departureAirports || []).map((a: any) => ({
      iataCode: a.airport.iataCode,
      name: a.airport.name,
      selected: !!a.selected,
      price: a.price,
    })),
    packageGroups: (cal.packageGroups || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
    })),
    nights: (cal.nights || []).map((n: any) => ({ nights: n.nights, price: n.price })),
    dates: (cal.dates || []).map((d: any) => ({
      date: d.date,
      price: d.price,
      oldPrice: d.oldPrice,
      quantity: d.quantity,
      nights: d.nights,
    })),
    minDate: cal.minDate,
    maxDate: cal.maxDate,
  };
}

// ============ Receipt ============

function normalizeItineraryType(typename: string, icon?: string | null): ItineraryComponentKind {
  const t = typename.toLowerCase();
  if (t.includes("flight")) return "flight";
  if (t.includes("accommodation")) return "accommodation";
  if (t.includes("car")) return "car";
  if (t.includes("leisure") || t.includes("activity")) return "activity";
  if (icon) {
    const ic = icon.toLowerCase();
    if (ic.includes("flight") || ic.includes("plane")) return "flight";
    if (ic.includes("hotel") || ic.includes("accommodation")) return "accommodation";
    if (ic.includes("car")) return "car";
    if (ic.includes("activity")) return "activity";
  }
  return "generic";
}

function normalizeReceipt(r: any): ReceiptData {
  const events = (r.itinerary?.events || []) as any[];
  return {
    title: r.title,
    totalPrice: r.totalPrice ?? 0,
    oldPrice: r.oldPrice,
    discount: r.discount,
    perPersonPrice: r.perPersonPrice,
    startDate: r.startDate,
    endDate: r.endDate,
    nights: r.nights,
    lines: r.lines || [],
    included: r.included || [],
    excluded: r.excluded || [],
    errors: r.errors || [],
    instalmentsPayments: Array.isArray(r.instalmentsPayments) ? r.instalmentsPayments.map((g: any) => Array.isArray(g) ? g : [g]) : [],
    cancellationConditions: r.cancellationConditions,
    paymentMethods: (r.paymentMethods || []).map((p: any) => ({
      id: p.id, name: p.name, shortDescription: p.shortDescription, image: p.image,
      availableInInstalments: p.availableInInstalments, inGroup: p.inGroup, default: p.default,
    })),
    itinerary: events.map((e: any) => ({
      label: e.label,
      sublabel: e.sublabel,
      date: e.date,
      components: (e.components || []).map((c: any) => {
        const typename = c.__typename || "ItineraryComponent";
        const comp: ItineraryComponent = {
          type: normalizeItineraryType(typename, c.icon),
          typename,
          icon: c.icon,
          label: c.label,
          sublabel: c.sublabel,
        };
        if (c.accommodation || c.unit || c.board) {
          comp.accommodation = c.accommodation;
          comp.unit = c.unit;
          comp.board = c.board;
          comp.checkinDate = c.checkinDate;
          comp.checkoutDate = c.checkoutDate;
          comp.stayNights = c.stayNights;
        }
        if (c.leg) comp.leg = c.leg;
        if (c.car) {
          comp.car = c.car;
          comp.pickupLocation = c.pickupLocation;
          comp.dropoffLocation = c.dropoffLocation;
        }
        return comp;
      }),
    })),
  };
}

/**
 * The receipt's instalmentsPayments is returned as a flat list of entries but
 * conceptually represents one schedule per instalment-plan. The API returns
 * schedules keyed by a "position" marker (deferred flag for deferred sets).
 * When a schedule for each plan must be derived, we treat contiguous groups
 * where each group starts at percentage 100 / (plan_count)% equivalent as one
 * schedule. In practice the API returns them already ordered; we rely on
 * payBeforeDate boundaries (the first row of each schedule is due immediately).
 */
function groupInstalments(flat: any[]): any[][] {
  if (!Array.isArray(flat) || flat.length === 0) return [];
  // Already grouped?
  if (Array.isArray(flat[0])) return flat as any[][];
  // Group by boundaries: a new schedule starts when we see the same payBeforeDate
  // as the first entry. Fallback: partition into chunks where running sum of
  // percentage approaches 100.
  const groups: any[][] = [];
  let current: any[] = [];
  let runningPct = 0;
  for (const row of flat) {
    current.push(row);
    if (typeof row.percentage === "number") {
      runningPct += row.percentage;
      if (runningPct >= 99.5) {
        groups.push(current);
        current = [];
        runningPct = 0;
      }
    }
  }
  if (current.length) groups.push(current);
  return groups.length ? groups : [flat];
}

export async function fetchReceipt(payload: BookingPayload): Promise<ReceiptData> {
  const vars = payloadToReceiptVariables(payload);
  const data = await gqlClient<{ dynamicPackageReceipt: any }>(GET_RECEIPT_QUERY, vars, payload.sessionId);
  const raw = data.dynamicPackageReceipt;
  if (!raw) throw new Error("Receipt unavailable");
  const r = normalizeReceipt(raw);
  r.instalmentsPayments = groupInstalments(raw.instalmentsPayments || []);
  return r;
}

// ============ Accommodations ============

export async function fetchAccommodations(payload: BookingPayload): Promise<AccommodationsResult> {
  const vars = payloadToVariables({
    ...payload,
    products: stripProductsByPrefix(payload.products, "A:"),
  });
  const data = await gqlClient<{ dynamicPackage: any }>(GET_ACCOMMODATIONS_QUERY, vars, payload.sessionId);
  const dp = data.dynamicPackage;
  if (!dp) throw new Error("Accommodations unavailable");
  return {
    basePrice: dp.price ?? null,
    accommodations: (dp.accomodations || []).map((a: any) => ({
      id: a.id,
      accommodationId: a.accommodationId,
      name: a.name,
      subTitle: a.subTitle,
      description: a.description,
      image: a.image,
      imagePreviews: a.imagePreviews || [],
      price: a.price,
      oldPrice: a.oldPrice,
      selected: !!a.selected,
      starRating: a.starRating,
      venue: a.venue,
      facilities: a.facilities || [],
      checkinDate: a.checkinDate,
      checkoutDate: a.checkoutDate,
      units: (a.units || []).map((u: any) => ({
        id: u.id,
        unitId: u.unitId,
        name: u.name,
        subTitle: u.subTitle,
        description: u.description,
        image: u.image,
        images: u.images || [],
        price: u.price,
        oldPrice: u.oldPrice,
        selected: !!u.selected,
        availableAmount: u.availableAmount,
        boards: (u.boards || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          price: b.price,
          oldPrice: b.oldPrice,
          selected: !!b.selected,
          boardTypeCode: b.boardTypeCode,
        })),
        facilities: u.facilities || [],
      })),
    })),
  };
}

// ============ Leisures ============

export async function fetchLeisures(payload: BookingPayload): Promise<LeisureResult> {
  const vars = payloadToVariables({
    ...payload,
    products: stripProductsByPrefix(payload.products, "L:"),
  });
  const data = await gqlClient<{ dynamicPackage: any }>(GET_LEISURES_QUERY, vars, payload.sessionId);
  const dp = data.dynamicPackage;
  if (!dp) throw new Error("Leisures unavailable");
  return {
    basePrice: dp.price ?? null,
    leisures: (dp.leisures || []).map((l: any) => ({
      id: l.id,
      price: l.price,
      oldPrice: l.oldPrice,
      selected: !!l.selected,
      date: l.date,
      optional: !!l.optional,
      units: (l.units || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        description: u.description,
        additionalInformation: u.additionalInformation,
        price: u.price,
        oldPrice: u.oldPrice,
        selected: !!u.selected,
        image: u.image,
        images: u.images || [],
        venue: u.venue,
        duration: u.duration,
        startTime: u.startTime,
        endTime: u.endTime,
        groupType: u.groupType,
        groupMinSize: u.groupMinSize,
        groupMaxSize: u.groupMaxSize,
      })),
    })),
  };
}

// ============ Task polling ============

async function pollUntilFinished(
  taskGroupId: string,
  sessionId: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<"FINISHED" | "FAILED"> {
  const timeout = opts.timeoutMs ?? 60_000;
  const interval = opts.intervalMs ?? 1500;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const data = await gqlClient<{ pollTaskGroup: { status: string } }>(
      POLL_TASK_GROUP_QUERY,
      { taskGroupId },
      sessionId,
    );
    const status = data.pollTaskGroup?.status;
    if (status === "FINISHED") return "FINISHED";
    if (status === "FAILED") return "FAILED";
    await new Promise(r => setTimeout(r, interval));
  }
  return "FAILED";
}

async function startAndPollTaskGroup(
  keys: string[],
  dynamicPackageInput: Record<string, unknown>,
  sessionId: string,
): Promise<"FINISHED" | "FAILED"> {
  const tasks = keys.map(key => ({ key, dynamicPackage: dynamicPackageInput }));
  const started = await gqlClient<{ startTaskGroup: { taskGroupId: string; started: boolean } }>(
    START_TASK_GROUP_MUTATION,
    { tasks },
    sessionId,
  );
  const id = started.startTaskGroup?.taskGroupId;
  if (!id) return "FAILED";
  return pollUntilFinished(id, sessionId);
}

function buildDynamicPackageInput(payload: BookingPayload, products?: BookingPayload["products"]): Record<string, unknown> {
  const vars = payloadToVariables({ ...payload, products: products ?? payload.products });
  // The TaskInput.dynamicPackage uses DynamicPackageInput field names — same as query args but under a nested object.
  const dpi: Record<string, unknown> = {
    offerId: vars.offerId,
    people: vars.people,
    groups: vars.groups,
  };
  if (vars.date) dpi.date = vars.date;
  if (vars.nights != null) dpi.nights = vars.nights;
  if (vars.departureAirports) dpi.departureAirports = vars.departureAirports;
  if (vars.tourUnit != null) dpi.tourUnit = vars.tourUnit;
  if (vars.packageGroup) dpi.packageGroup = vars.packageGroup;
  if (vars.products) dpi.products = vars.products;
  return dpi;
}

// ============ Flights ============

export async function runFlightSearch(payload: BookingPayload): Promise<"FINISHED" | "FAILED"> {
  const dpi = buildDynamicPackageInput(payload, stripProductsByPrefix(payload.products, "F:"));
  const search = await startAndPollTaskGroup(["FLIGHT_SEARCH"], dpi, payload.sessionId);
  if (search !== "FINISHED") return search;
  const validate = await startAndPollTaskGroup(["FLIGHT_PRICE_VALIDATION"], dpi, payload.sessionId);
  return validate;
}

export async function fetchFlights(payload: BookingPayload): Promise<FlightOption[]> {
  const vars = payloadToVariables({ ...payload, products: stripProductsByPrefix(payload.products, "F:") });
  const data = await gqlClient<{ dynamicPackage: any }>(GET_FLIGHTS_QUERY, vars, payload.sessionId);
  const flights = data.dynamicPackage?.flights || [];
  return flights.map((f: any) => ({
    id: f.id,
    price: f.price,
    oldPrice: f.oldPrice,
    selected: !!f.selected,
    cabinClass: f.cabinClass,
    luggageIncluded: f.luggageIncluded,
    luggageAllowance: f.luggageAllowance,
    outboundLeg: f.outboundLeg,
    inboundLeg: f.inboundLeg,
  }));
}

// ============ Cars ============

export async function runCarSearch(payload: BookingPayload): Promise<"FINISHED" | "FAILED"> {
  const dpi = buildDynamicPackageInput(payload, stripProductsByPrefix(payload.products, "C:"));
  return startAndPollTaskGroup(["CAR_SEARCH"], dpi, payload.sessionId);
}

export async function fetchCars(payload: BookingPayload): Promise<CarOption[]> {
  const vars = payloadToVariables({ ...payload, products: stripProductsByPrefix(payload.products, "C:") });
  const data = await gqlClient<{ dynamicPackage: any }>(GET_CARS_QUERY, vars, payload.sessionId);
  const cars = data.dynamicPackage?.cars || [];
  return cars.map((c: any) => ({
    id: c.id,
    price: c.price,
    oldPrice: c.oldPrice,
    selected: !!c.selected,
    productTermsUrl: c.productTermsUrl,
    insurance: c.insurance,
    vehicle: c.vehicle,
    pickupLocation: c.pickupLocation,
    dropoffLocation: c.dropoffLocation,
  }));
}

export async function fetchCarExtras(carProductSetId: string, sessionId: string): Promise<CarExtraOption[]> {
  const data = await gqlClient<{ carExtra: { extras: any[] } }>(GET_CAR_EXTRAS_QUERY, { carProductSetId }, sessionId);
  const extras = data.carExtra?.extras || [];
  return extras.map((e: any) => ({
    id: e.id,
    name: e.name,
    price: typeof e.price === "number" ? e.price : e.price?.amount ?? null,
    currency: e.currency,
    prePayable: e.prePayable,
    extraType: e.extraType,
    keyFactsUrl: e.keyFactsUrl,
    policyDocUrl: e.policyDocUrl,
  }));
}

// ============ Checkout ============

export async function fetchCheckoutMeta(payload: BookingPayload): Promise<CheckoutMeta> {
  const vars = payloadToVariables(payload);
  const data = await gqlClient<{ dynamicPackage: any; countries: any[] }>(GET_CHECKOUT_META_QUERY, vars, payload.sessionId);
  const dp = data.dynamicPackage;
  if (!dp) throw new Error("Checkout data unavailable");
  return {
    customerSalesflowDisplayFields: dp.customerSalesflowDisplayFields || [],
    participantSalesflowDisplayFields: dp.participantSalesflowDisplayFields || [],
    namesMustMatchId: dp.namesMustMatchId,
    passportRequired: dp.passportRequired,
    mainDriverRequired: dp.mainDriverRequired,
    termsMarkdown: dp.termsAndConditions?.markdown,
    termsText: dp.termsAndConditions?.text,
    euDirectiveText: dp.euDirectiveText,
    maxNrOfInstalments: dp.maxNrOfInstalments ?? 1,
    paymentMethods: dp.paymentMethods || [],
    paymentMethodGroups: dp.paymentMethodGroups || [],
    countries: data.countries || [],
  };
}

export async function createOrder(payload: BookingPayload, totalPrice: number, properties: { name: string; value: string }[]): Promise<{ continueUrl: string | null; errors: any[]; orderId?: string }> {
  const vars: Record<string, unknown> = {
    offerId: payload.offerId,
    people: payload.people,
    groups: payload.groups,
    totalPrice,
    products: payload.products,
    coupons: payload.coupons,
    numOfInstalments: payload.numOfInstalments,
    deferred: payload.deferred,
    paymentMethod: payload.paymentMethod,
    properties,
    priceSeen: totalPrice,
  };
  if (payload.selectedDate) vars.date = payload.selectedDate;
  if (payload.nights != null) vars.nights = payload.nights;
  if (payload.departureAirports && payload.departureAirports.length) vars.departureAirports = payload.departureAirports;
  if (payload.tourUnit != null) vars.tourUnit = payload.tourUnit;
  if (payload.packageGroup) vars.packageGroup = payload.packageGroup;

  const data = await gqlClient<{ createOrder: { result: { errors: any[]; order: { id: string } | null; paymentResult: { continueUrl: string } | null } } }>(
    CREATE_ORDER_MUTATION,
    vars,
    payload.sessionId,
  );
  const r = data.createOrder?.result;
  return {
    continueUrl: r?.paymentResult?.continueUrl ?? null,
    errors: r?.errors || [],
    orderId: r?.order?.id,
  };
}
