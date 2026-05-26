import {
  Accommodation,
  AccommodationUnit,
  Board,
  Car,
  CarExtraOption,
  CalendarData,
  CheckoutMeta,
  Facility,
  Flight,
  FlightLeg,
  FlightSegment,
  InfoItem,
  ItineraryComponent,
  ItineraryComponentType,
  ItineraryEvent,
  LeisureData,
  LeisureGroup,
  LeisureUnit,
  OfferMeta,
  PaymentMethod,
  ReceiptData,
  ReceiptLine,
  ServiceInfo,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function img(o: any): string | null {
  return o?.url ?? null;
}
function imgs(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((i) => i?.url).filter(Boolean);
}

// Duration scalar may arrive as ISO-8601 ("PT2H30M") or minutes.
function parseDuration(value: any): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const iso = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (iso) {
      const h = Number(iso[1] ?? 0);
      const m = Number(iso[2] ?? 0);
      return h * 60 + m;
    }
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

export function normalizeOffer(raw: any): OfferMeta {
  return {
    id: String(raw.id),
    title: raw.title,
    shortTitle: raw.shortTitle,
    currency: raw.currency ?? "GBP",
    selectDate: !!raw.selectDate,
    isRoundtrip: !!raw.isRoundtrip,
    hasFlights: !!raw.hasFlights,
    hasCars: !!raw.hasCars,
    hasAccommodationUnits: !!raw.hasAccommodationUnits,
    isLeisureOnly: !!raw.isLeisureOnly,
    price: raw.price ?? null,
    oldPrice: raw.oldPrice ?? null,
    image: img(raw.image),
    gallery: imgs(raw.gallery),
    location: raw.destinationText?.location ?? null,
    occupancyRules: {
      minAdults: raw.occupancyRules?.minAdults ?? 1,
      maxAdults: raw.occupancyRules?.maxAdults ?? 9,
      minChildren: raw.occupancyRules?.minChildren ?? 0,
      maxChildren: raw.occupancyRules?.maxChildren ?? 0,
      minChildAge: raw.occupancyRules?.minChildAge ?? 0,
      maxChildAge: raw.occupancyRules?.maxChildAge ?? 17,
      infantsAllowed: !!raw.occupancyRules?.infantsAllowed,
      maxInfants: raw.occupancyRules?.maxInfants ?? 0,
      requireBirthdates: !!raw.occupancyRules?.requireBirthdates,
      occupantsLabel: raw.occupancyRules?.occupantsLabel ?? "Travellers",
    },
    included: (raw.includedListWithDescriptions ?? []).map(
      (s: any): ServiceInfo => ({ name: s.name, description: s.description }),
    ),
    excluded: (raw.excludedList ?? [])
      .filter(Boolean)
      .map((title: string) => ({ title })),
    informationList: (raw.informationList ?? []).map(
      (i: any): InfoItem => ({ id: i.id, label: i.label, value: i.value }),
    ),
    paymentHelp: raw.paymentHelp ?? null,
  };
}

export function normalizeCalendar(rawOffer: any): CalendarData {
  const c = rawOffer?.calendar ?? {};
  return {
    minDate: c.minDate ?? null,
    maxDate: c.maxDate ?? null,
    airports: (c.departureAirports ?? []).map((a: any) => ({
      iataCode: a.airport?.iataCode,
      name: a.airport?.name,
      cityName: a.airport?.cityName,
      price: a.price ?? null,
      selected: !!a.selected,
    })),
    packageGroups: (c.packageGroups ?? []).map((g: any) => ({
      id: g.id ?? "",
      name: g.name,
      description: g.description ?? null,
      price: g.price ?? null,
      images: imgs(g.images),
    })),
    nightOptions: (c.nights ?? []).map((n: any) => ({
      nights: n.nights ?? null,
      price: n.price ?? null,
    })),
    days: (c.dates ?? []).map((d: any) => ({
      date: d.date,
      price: d.price ?? null,
      quantity: d.quantity ?? 0,
      nights: (d.nights ?? []).map((nn: any) => ({
        nights: nn.nights,
        price: nn.price ?? null,
      })),
    })),
  };
}

const ITINERARY_TYPE: Record<string, ItineraryComponentType> = {
  ItineraryAccommodationComponent: "accommodation",
  ItineraryFlightComponent: "flight",
  ItineraryCarComponent: "car",
  ItineraryLeisureComponent: "activity",
  ItineraryTransferComponent: "transfer",
};

function normalizeSegment(s: any): FlightSegment {
  return {
    airlineName: s.airline?.name ?? null,
    airlineCode: s.airline?.iataCode ?? null,
    airlineLogo: s.airline?.logoUrl ?? null,
    operatingAirlineName: s.operatingAirline?.name ?? null,
    flightNumber: s.flightnumber ?? null,
    departTime: s.departure?.datetime ?? null,
    departAirport: s.departure?.airport?.iataCode ?? null,
    arriveTime: s.arrival?.datetime ?? null,
    arriveAirport: s.arrival?.airport?.iataCode ?? null,
    cabinClass: s.cabinClass ?? null,
    luggageIncluded: s.luggageIncluded ?? null,
    luggageAllowance: s.luggageAllowance ?? null,
  };
}

function normalizeComponent(c: any): ItineraryComponent {
  const type = ITINERARY_TYPE[c.__typename] ?? "activity";
  const base: ItineraryComponent = {
    type,
    label: c.label ?? null,
    sublabel: c.sublabel ?? null,
  };
  if (type === "accommodation") {
    base.checkinDate = c.checkinDate ?? null;
    base.checkoutDate = c.checkoutDate ?? null;
    base.stayNights = c.stayNights ?? null;
    base.accommodationName = c.accommodation?.name ?? null;
    base.unitName = c.unit?.name ?? null;
    base.boardName = c.board?.name ?? null;
  } else if (type === "flight") {
    base.legLabel = c.leg?.label ?? null;
    base.segments = (c.leg?.segments ?? []).map(normalizeSegment);
  } else if (type === "car") {
    base.carModel = c.car?.model ?? null;
    base.pickupName = c.pickupLocation?.name ?? null;
    base.dropoffName = c.dropoffLocation?.name ?? null;
  }
  return base;
}

function normalizeEvents(itinerary: any): ItineraryEvent[] {
  const events = itinerary?.events;
  if (!Array.isArray(events)) return [];
  return events.map((e: any) => ({
    label: e.label ?? null,
    sublabel: e.sublabel ?? null,
    date: e.date ?? null,
    components: (e.components ?? []).map(normalizeComponent),
  }));
}

function normalizeLine(l: any): ReceiptLine {
  if (l.__typename === "ReceiptLineAmount") {
    return {
      type: "amount",
      label: l.label,
      format: l.format ?? null,
      amount: l.amount,
      perPerson: l.perPerson ?? null,
    };
  }
  if (l.__typename === "ReceiptLineText") {
    return { type: "text", label: l.label, format: l.format ?? null, text: l.text };
  }
  return { type: "plain", label: l.label, format: l.format ?? null };
}

function normalizePaymentMethods(arr: any): PaymentMethod[] {
  return (arr ?? []).map((p: any) => ({
    id: String(p.id),
    name: p.name,
    shortDescription: p.shortDescription ?? null,
    logo: p.logo ?? null,
    availableInInstalments: !!p.availableInInstalments,
    default: !!p.default,
  }));
}

export function normalizeReceipt(raw: any): ReceiptData {
  return {
    title: raw.title ?? null,
    totalPrice: raw.totalPrice ?? null,
    oldPrice: raw.oldPrice ?? null,
    discount: raw.discount ?? null,
    perPersonPrice: raw.perPersonPrice ?? null,
    startDate: raw.startDate ?? null,
    endDate: raw.endDate ?? null,
    nights: raw.nights ?? null,
    lines: (raw.lines ?? []).map(normalizeLine),
    included: (raw.included ?? []).map((i: any) => ({
      title: i.title,
      price: i.price ?? null,
    })),
    excluded: (raw.excluded ?? []).map((e: any) => ({
      title: e.title,
      price: e.price ?? null,
    })),
    instalmentSchedules: (raw.instalmentsPayments ?? []).map((sched: any) =>
      (sched ?? []).map((p: any) => ({
        amount: p.amount ?? null,
        payBeforeDate: p.payBeforeDate ?? null,
        deferred: !!p.deferred,
        percentage: p.percentage ?? null,
      })),
    ),
    events: normalizeEvents(raw.itinerary),
    errors: (raw.errors ?? []).map((e: any) => ({
      code: e.code ?? null,
      field: e.field ?? null,
      message: e.message ?? null,
    })),
    paymentMethods: normalizePaymentMethods(raw.paymentMethods),
    maxInstalments: null,
  };
}

function normalizeFacilities(arr: any): Facility[] {
  return (arr ?? []).map((f: any) => ({ icon: f.icon ?? null, name: f.name }));
}

function normalizeBoard(b: any): Board {
  return {
    id: b.id,
    price: b.price ?? null,
    selected: !!b.selected,
    name: b.name,
    description: b.description ?? null,
  };
}

function normalizeUnit(u: any): AccommodationUnit {
  return {
    id: u.id,
    price: u.price ?? null,
    selected: !!u.selected,
    name: u.name,
    description: u.description ?? null,
    image: img(u.image),
    images: imgs(u.images),
    boards: (u.boards ?? []).map(normalizeBoard),
    facilities: normalizeFacilities(u.facilities),
  };
}

export function normalizeAccommodations(rawDp: any): Accommodation[] {
  const list = rawDp?.accomodations ?? [];
  return list.map((a: any): Accommodation => ({
    id: a.id,
    price: a.price ?? null,
    selected: !!a.selected,
    name: a.name,
    subTitle: a.subTitle ?? null,
    description: a.description ?? null,
    image: img(a.image),
    images: imgs(a.imagePreviews?.length ? a.imagePreviews : null),
    units: (a.units ?? []).map(normalizeUnit),
    facilities: normalizeFacilities(a.facilities),
    starRating: a.starRating ?? null,
    location: a.venue?.formattedAddress ?? a.venue?.city ?? null,
  }));
}

function normalizeLeisureUnit(u: any): LeisureUnit {
  return {
    id: u.id,
    price: u.price ?? null,
    selected: !!u.selected,
    name: u.name,
    description: u.description ?? null,
    image: img(u.image),
    images: imgs(u.images),
    durationMinutes: parseDuration(u.duration),
    groupType: u.groupType ?? null,
  };
}

export function normalizeLeisure(rawDp: any): LeisureData {
  return {
    basePrice: rawDp?.price ?? null,
    groups: (rawDp?.leisures ?? []).map((g: any): LeisureGroup => ({
      id: g.id,
      price: g.price ?? null,
      selected: !!g.selected,
      optional: !!g.optional,
      date: g.date ?? null,
      units: (g.units ?? []).map(normalizeLeisureUnit),
    })),
  };
}

function normalizeLeg(leg: any): FlightLeg | null {
  if (!leg) return null;
  return {
    label: leg.label ?? null,
    luggageIncluded: leg.luggageIncluded ?? null,
    luggageAllowance: leg.luggageAllowance ?? null,
    segments: (leg.segments ?? []).map(normalizeSegment),
  };
}

export function normalizeFlights(rawDp: any): Flight[] {
  return (rawDp?.flights ?? []).map((f: any): Flight => {
    const outbound = normalizeLeg(f.outboundLeg);
    const firstSeg = outbound?.segments?.[0];
    return {
      id: f.id,
      price: f.price ?? null,
      selected: !!f.selected,
      cabinClass: f.cabinClass ?? null,
      luggageIncluded: f.luggageIncluded ?? null,
      luggageAllowance: f.luggageAllowance ?? null,
      outbound,
      inbound: normalizeLeg(f.inboundLeg),
      airlineLogo: firstSeg?.airlineLogo ?? null,
      airlineName: firstSeg?.airlineName ?? null,
    };
  });
}

export function normalizeCars(rawDp: any): Car[] {
  return (rawDp?.cars ?? []).map((c: any): Car => ({
    id: c.id,
    price: c.price ?? null,
    selected: !!c.selected,
    modelName: c.vehicle?.modelName ?? null,
    image: img(c.vehicle?.photo),
    transmission: c.vehicle?.transmission ?? null,
    seats: c.vehicle?.maxSeats ?? c.vehicle?.minSeats ?? null,
    bags: c.vehicle?.maxBigSuitcases ?? c.vehicle?.minBigSuitcases ?? null,
    airConditioning: c.vehicle?.airConditioning ?? null,
    pickupName: c.pickupLocation?.name ?? null,
    dropoffName: c.dropoffLocation?.name ?? null,
    productTermsUrl: c.productTermsUrl ?? null,
  }));
}

export function normalizeCarExtras(raw: any): CarExtraOption[] {
  return (raw?.carExtra?.extras ?? []).map((e: any): CarExtraOption => ({
    id: String(e.id),
    name: e.name ?? null,
    price: e.price?.amount ?? null,
    extraType: e.extraType ?? null,
    prePayable: e.prePayable ?? null,
    keyFactsUrl: e.keyFactsUrl ?? null,
    policyDocUrl: e.policyDocUrl ?? null,
    currencySymbol: e.currencySymbol ?? null,
  }));
}

export function normalizeCheckoutMeta(raw: any): CheckoutMeta {
  const dp = raw?.dynamicPackage ?? {};
  return {
    customerFields: dp.customerSalesflowDisplayFields ?? [],
    participantFields: dp.participantSalesflowDisplayFields ?? [],
    countries: (raw?.countries ?? []).map((c: any) => ({
      code: c.code,
      name: c.name,
    })),
    termsMarkdown: dp.termsAndConditions?.markdown ?? null,
    euDirectiveText: dp.euDirectiveText ?? null,
    maxInstalments: dp.maxNrOfInstalments ?? 1,
  };
}

export function checkoutPaymentMethods(raw: any): PaymentMethod[] {
  return normalizePaymentMethods(raw?.dynamicPackage?.paymentMethods);
}
