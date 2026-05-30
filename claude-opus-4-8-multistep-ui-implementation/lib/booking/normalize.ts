import {
  Accommodation,
  AccommodationBoard,
  AccommodationUnit,
  ActivityData,
  Car,
  CarExtra,
  CheckoutMeta,
  Country,
  Facility,
  Flight,
  FlightLeg,
  FlightSegment,
  ItineraryComponent,
  ItineraryEvent,
  ItineraryFlightSegment,
  ItineraryType,
  LeisureGroup,
  LeisureUnit,
  OfferMeta,
  CalendarData,
  CalendarPackageType,
  PaymentMethod,
  ReceiptData,
  ReceiptLine,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function urlOf(img: any): string | undefined {
  return img?.url ?? undefined;
}

function imagesOf(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(urlOf).filter((x): x is string => !!x);
}

// --------------------------------------------------------------------------
// Offer
// --------------------------------------------------------------------------

export function normalizeOffer(raw: any): OfferMeta {
  const o = raw?.offer ?? {};
  return {
    id: String(o.id ?? ""),
    title: o.title ?? "",
    shortTitle: o.shortTitle ?? o.title ?? "",
    currency: o.currency ?? "GBP",
    selectDate: !!o.selectDate,
    isRoundtrip: !!o.isRoundtrip,
    hasFlights: !!o.hasFlights,
    hasCars: !!o.hasCars,
    hasAccommodationUnits: !!o.hasAccommodationUnits,
    isLeisureOnly: !!o.isLeisureOnly,
    price: num(o.price),
    oldPrice: num(o.oldPrice),
    paymentHelp: o.paymentHelp ?? undefined,
    image: urlOf(o.image),
    gallery: imagesOf(o.gallery),
    location: o.destinationText?.location ?? undefined,
    includedList: Array.isArray(o.includedListWithDescriptions)
      ? o.includedListWithDescriptions.map((x: any) => ({
          name: x?.name ?? "",
          description: x?.description ?? "",
        }))
      : [],
    excludedList: Array.isArray(o.excludedList)
      ? o.excludedList.filter((x: any) => typeof x === "string")
      : [],
    informationList: Array.isArray(o.informationList)
      ? o.informationList.map((x: any) => ({
          id: x?.id ?? "",
          label: x?.label ?? "",
          value: x?.value ?? "",
        }))
      : [],
    occupancyRules: {
      minAdults: num(o.occupancyRules?.minAdults) || 1,
      maxAdults: num(o.occupancyRules?.maxAdults) || 4,
      minChildren: num(o.occupancyRules?.minChildren),
      maxChildren: num(o.occupancyRules?.maxChildren),
      minChildAge: num(o.occupancyRules?.minChildAge),
      maxChildAge: num(o.occupancyRules?.maxChildAge) || 17,
    },
  };
}

// --------------------------------------------------------------------------
// Calendar
// --------------------------------------------------------------------------

export function normalizeCalendar(raw: any): CalendarData {
  const c = raw?.offer?.calendar ?? {};
  return {
    minDate: c.minDate ?? null,
    maxDate: c.maxDate ?? null,
    globalMinDate: c.globalMinDate ?? null,
    globalMaxDate: c.globalMaxDate ?? null,
    airports: Array.isArray(c.departureAirports)
      ? c.departureAirports.map((a: any) => ({
          selected: !!a.selected,
          price: num(a.price),
          iataCode: a.airport?.iataCode ?? "",
          name: a.airport?.name ?? "",
          cityName: a.airport?.cityName ?? "",
        }))
      : [],
    packageGroups: Array.isArray(c.packageGroups)
      ? c.packageGroups.map((g: any) => ({
          id: g.id ?? "",
          name: g.name ?? "",
          price: num(g.price),
          description: g.description ?? null,
        }))
      : [],
    packageTypes: Array.isArray(c.packageTypes)
      ? c.packageTypes.map((t: any): CalendarPackageType => ({
          name: t.name ?? "",
          type: t.type ?? "",
        }))
      : [],
    nightsOptions: Array.isArray(c.nights)
      ? c.nights.map((n: any) => ({
          nights: n.nights ?? null,
          price: num(n.price),
        }))
      : [],
    dates: Array.isArray(c.dates)
      ? c.dates.map((d: any) => ({
          date: d.date,
          price: num(d.price),
          quantity: num(d.quantity),
          nights: Array.isArray(d.nights)
            ? d.nights.map((n: any) => ({
                nights: num(n.nights),
                price: num(n.price),
              }))
            : [],
        }))
      : [],
  };
}

// --------------------------------------------------------------------------
// Receipt
// --------------------------------------------------------------------------

const ITINERARY_TYPE_MAP: Record<string, ItineraryType> = {
  ItineraryAccommodationComponent: "accommodation",
  ItineraryFlightComponent: "flight",
  ItineraryCarComponent: "car",
  ItineraryLeisureComponent: "activity",
  ItineraryTransferComponent: "transfer",
};

function normalizeLine(l: any): ReceiptLine {
  if (l.__typename === "ReceiptLineAmount") {
    return {
      kind: "amount",
      label: l.label ?? "",
      format: l.format ?? null,
      amount: num(l.amount),
      perPerson: l.perPerson ?? null,
    };
  }
  if (l.__typename === "ReceiptLineText") {
    return { kind: "text", label: l.label ?? "", format: l.format ?? null, text: l.text ?? "" };
  }
  return { kind: "plain", label: l.label ?? "", format: l.format ?? null };
}

function normalizeItinFlightSegments(seg: any[]): ItineraryFlightSegment[] {
  return (seg ?? []).map((s: any) => ({
    airline: s.airline?.name,
    airlineLogo: s.airline?.logoUrl,
    operatingAirline: s.operatingAirline?.name,
    flightNumber: s.flightnumber,
    cabinClass: s.cabinClass,
    luggageIncluded: s.luggageIncluded,
    luggageAllowance: s.luggageAllowance,
    departureTime: s.departure?.datetime,
    departureAirport: s.departure?.airport?.iataCode,
    arrivalTime: s.arrival?.datetime,
    arrivalAirport: s.arrival?.airport?.iataCode,
  }));
}

function normalizeComponent(c: any): ItineraryComponent {
  const type = ITINERARY_TYPE_MAP[c.__typename] ?? "other";
  const base: ItineraryComponent = {
    type,
    label: c.label ?? undefined,
    sublabel: c.sublabel ?? undefined,
  };
  if (type === "accommodation") {
    base.checkinDate = c.checkinDate ?? undefined;
    base.checkoutDate = c.checkoutDate ?? undefined;
    base.stayNights = c.stayNights ?? undefined;
    base.accommodationName = c.accommodation?.name ?? undefined;
    base.unitName = c.unit?.name ?? undefined;
    base.boardName = c.board?.name ?? undefined;
  } else if (type === "flight") {
    base.legLabel = c.leg?.label ?? undefined;
    base.segments = normalizeItinFlightSegments(c.leg?.segments ?? []);
  } else if (type === "car") {
    base.carModel = c.car?.model ?? undefined;
    base.pickupLocation = c.pickupLocation?.name ?? undefined;
    base.dropoffLocation = c.dropoffLocation?.name ?? undefined;
  }
  return base;
}

function normalizeEvents(itinerary: any): ItineraryEvent[] {
  const events = itinerary?.events;
  if (!Array.isArray(events)) return [];
  return events.map((e: any) => ({
    label: e.label ?? undefined,
    sublabel: e.sublabel ?? undefined,
    date: e.date ?? undefined,
    components: Array.isArray(e.components)
      ? e.components.map(normalizeComponent)
      : [],
  }));
}

export function normalizePaymentMethods(arr: any): PaymentMethod[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((m: any) => ({
    id: m.id ?? "",
    name: m.name ?? "",
    shortDescription: m.shortDescription ?? undefined,
    logo: m.logo ?? undefined,
    availableInInstalments: !!m.availableInInstalments,
    default: !!m.default,
  }));
}

export function normalizeReceipt(raw: any): ReceiptData {
  const r = raw ?? {};
  // instalmentsPayments is a list of schedules (list of lists).
  const schedules: any[][] = Array.isArray(r.instalmentsPayments)
    ? r.instalmentsPayments
    : [];
  return {
    title: r.title ?? undefined,
    totalPrice: num(r.totalPrice),
    oldPrice: num(r.oldPrice),
    discount: num(r.discount),
    perPersonPrice: num(r.perPersonPrice),
    startDate: r.startDate ?? undefined,
    endDate: r.endDate ?? undefined,
    nights: r.nights ?? undefined,
    lines: Array.isArray(r.lines) ? r.lines.map(normalizeLine) : [],
    included: Array.isArray(r.included)
      ? r.included.map((x: any) => ({ title: x.title ?? "", price: num(x.price) }))
      : [],
    excluded: Array.isArray(r.excluded)
      ? r.excluded.map((x: any) => ({ title: x.title ?? "", price: num(x.price) }))
      : [],
    instalmentsPayments: schedules.map((sched) =>
      (Array.isArray(sched) ? sched : []).map((p: any) => ({
        amount: num(p.amount),
        payBeforeDate: p.payBeforeDate ?? null,
        deferred: !!p.deferred,
        percentage: p.percentage ?? null,
      })),
    ),
    paymentMethods: normalizePaymentMethods(r.paymentMethods),
    errors: Array.isArray(r.errors)
      ? r.errors.map((e: any) => ({
          code: e.code ?? undefined,
          field: e.field ?? undefined,
          message: e.message ?? undefined,
        }))
      : [],
    events: normalizeEvents(r.itinerary),
  };
}

// --------------------------------------------------------------------------
// Accommodation
// --------------------------------------------------------------------------

function normalizeFacilities(arr: any): Facility[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((f: any) => ({ icon: f.icon ?? null, name: f.name ?? "" }));
}

function normalizeBoard(b: any): AccommodationBoard {
  return {
    id: b.id ?? "",
    price: num(b.price),
    selected: !!b.selected,
    name: b.name ?? "",
    description: b.description ?? undefined,
    boardTypeCode: b.boardTypeCode ?? undefined,
  };
}

function normalizeUnit(u: any): AccommodationUnit {
  return {
    id: u.id ?? "",
    price: num(u.price),
    selected: !!u.selected,
    name: u.name ?? "",
    description: u.description ?? undefined,
    image: urlOf(u.image),
    images: imagesOf(u.images),
    facilities: normalizeFacilities(u.facilities),
    boards: Array.isArray(u.boards) ? u.boards.map(normalizeBoard) : [],
  };
}

export function normalizeAccommodations(raw: any): Accommodation[] {
  const list = raw?.dynamicPackage?.accomodations;
  if (!Array.isArray(list)) return [];
  return list.map((a: any) => ({
    id: a.id ?? "",
    price: num(a.price),
    oldPrice: num(a.oldPrice),
    selected: !!a.selected,
    name: a.name ?? "",
    subTitle: a.subTitle ?? undefined,
    description: a.description ?? undefined,
    starRating: a.starRating ?? undefined,
    image: urlOf(a.image),
    imagePreviews: imagesOf(a.imagePreviews),
    city: a.venue?.city ?? undefined,
    country: a.venue?.country ?? undefined,
    address: a.venue?.formattedAddress ?? undefined,
    facilities: normalizeFacilities(a.facilities),
    units: Array.isArray(a.units) ? a.units.map(normalizeUnit) : [],
  }));
}

// --------------------------------------------------------------------------
// Leisure
// --------------------------------------------------------------------------

function normalizeLeisureUnit(u: any): LeisureUnit {
  return {
    id: u.id ?? "",
    price: num(u.price),
    selected: !!u.selected,
    name: u.name ?? "",
    description: u.description ?? undefined,
    image: urlOf(u.image),
    images: imagesOf(u.images),
    duration: u.duration ?? null,
    groupType: u.groupType ?? null,
  };
}

export function normalizeLeisure(raw: any): ActivityData {
  const dp = raw?.dynamicPackage ?? {};
  const groups: LeisureGroup[] = Array.isArray(dp.leisures)
    ? dp.leisures.map((g: any) => ({
        id: g.id ?? "",
        price: num(g.price),
        oldPrice: num(g.oldPrice),
        selected: !!g.selected,
        optional: !!g.optional,
        date: g.date ?? undefined,
        units: Array.isArray(g.units) ? g.units.map(normalizeLeisureUnit) : [],
      }))
    : [];
  return { baselinePrice: num(dp.price), groups };
}

// --------------------------------------------------------------------------
// Flights
// --------------------------------------------------------------------------

function normalizeFlightSegment(s: any): FlightSegment {
  return {
    flightNumber: s.flightnumber ?? undefined,
    cabinClass: s.cabinClass ?? undefined,
    luggageIncluded: s.luggageIncluded ?? undefined,
    luggageAllowance: s.luggageAllowance ?? undefined,
    airline: s.airline?.name ?? undefined,
    airlineIata: s.airline?.iataCode ?? undefined,
    airlineLogo: s.airline?.logoUrl ?? undefined,
    operatingAirline: s.operatingAirline?.name ?? undefined,
    departureTime: s.departure?.datetime ?? undefined,
    departureAirport: s.departure?.airport?.iataCode ?? undefined,
    departureCity: s.departure?.airport?.cityName ?? undefined,
    arrivalTime: s.arrival?.datetime ?? undefined,
    arrivalAirport: s.arrival?.airport?.iataCode ?? undefined,
    arrivalCity: s.arrival?.airport?.cityName ?? undefined,
  };
}

function normalizeLeg(l: any): FlightLeg | undefined {
  if (!l) return undefined;
  return {
    label: l.label ?? undefined,
    luggageIncluded: l.luggageIncluded ?? undefined,
    luggageAllowance: l.luggageAllowance ?? undefined,
    handLuggageRules: l.handLuggageRules ?? undefined,
    segments: Array.isArray(l.segments) ? l.segments.map(normalizeFlightSegment) : [],
  };
}

export function normalizeFlights(raw: any): Flight[] {
  const list = raw?.dynamicPackage?.flights;
  if (!Array.isArray(list)) return [];
  return list.map((f: any) => ({
    id: f.id ?? "",
    price: num(f.price),
    oldPrice: num(f.oldPrice),
    selected: !!f.selected,
    cabinClass: f.cabinClass ?? undefined,
    luggageIncluded: f.luggageIncluded ?? undefined,
    luggageAllowance: f.luggageAllowance ?? undefined,
    outboundLeg: normalizeLeg(f.outboundLeg),
    inboundLeg: normalizeLeg(f.inboundLeg),
  }));
}

// --------------------------------------------------------------------------
// Cars
// --------------------------------------------------------------------------

export function normalizeCars(raw: any): Car[] {
  const list = raw?.dynamicPackage?.cars;
  if (!Array.isArray(list)) return [];
  return list.map((c: any) => ({
    id: c.id ?? "",
    price: num(c.price),
    oldPrice: num(c.oldPrice),
    selected: !!c.selected,
    productTermsUrl: c.productTermsUrl ?? undefined,
    insurance: c.insurance ?? undefined,
    vehicle: c.vehicle
      ? {
          modelName: c.vehicle.modelName ?? undefined,
          minSeats: c.vehicle.minSeats ?? undefined,
          maxSeats: c.vehicle.maxSeats ?? undefined,
          doors: c.vehicle.doors ?? undefined,
          minBigSuitcases: c.vehicle.minBigSuitcases ?? undefined,
          maxBigSuitcases: c.vehicle.maxBigSuitcases ?? undefined,
          airConditioning: c.vehicle.airConditioning ?? undefined,
          transmission: c.vehicle.transmission ?? undefined,
          category: c.vehicle.category ?? undefined,
          photo: urlOf(c.vehicle.photo),
        }
      : undefined,
    pickupLocation: c.pickupLocation?.name ?? undefined,
    pickupAddress: c.pickupLocation?.venue?.formattedAddress ?? undefined,
    dropoffLocation: c.dropoffLocation?.name ?? undefined,
    dropoffAddress: c.dropoffLocation?.venue?.formattedAddress ?? undefined,
  }));
}

export function normalizeCarExtras(raw: any): CarExtra[] {
  const list = raw?.carExtra?.extras;
  if (!Array.isArray(list)) return [];
  return list.map((e: any) => ({
    id: e.id ?? "",
    name: e.name ?? "",
    currency: e.currency ?? undefined,
    currencySymbol: e.currencySymbol ?? undefined,
    prePayable: e.prePayable ?? undefined,
    extraType: e.extraType ?? undefined,
    keyFactsUrl: e.keyFactsUrl ?? undefined,
    policyDocUrl: e.policyDocUrl ?? undefined,
    price: num(e.price?.amount),
  }));
}

// --------------------------------------------------------------------------
// Checkout metadata
// --------------------------------------------------------------------------

function parseFields(raw: any): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeCheckoutMeta(raw: any): CheckoutMeta {
  const dp = raw?.dynamicPackage ?? {};
  const countries: Country[] = Array.isArray(raw?.countries)
    ? raw.countries.map((c: any) => ({ code: c.code ?? "", name: c.name ?? "" }))
    : [];
  return {
    customerFields: parseFields(dp.customerSalesflowDisplayFields),
    participantFields: parseFields(dp.participantSalesflowDisplayFields),
    passportRequired: !!dp.passportRequired,
    namesMustMatchId: !!dp.namesMustMatchId,
    mainDriverRequired: !!dp.mainDriverRequired,
    maxNrOfInstalments: num(dp.maxNrOfInstalments) || 1,
    euDirectiveText: dp.euDirectiveText ?? undefined,
    termsMarkdown: dp.termsAndConditions?.markdown ?? undefined,
    termsLinks: Array.isArray(dp.termsAndConditions?.links)
      ? dp.termsAndConditions.links
      : [],
    paymentMethods: normalizePaymentMethods(dp.paymentMethods),
    countries,
  };
}
