import type {
  OfferSummary,
  OfferMeta,
  CalendarData,
  CalendarDate,
  CalendarAirport,
  PackageGroup,
  NightOption,
  ReceiptData,
  ReceiptLine,
  ReceiptItineraryEvent,
  ReceiptItineraryComponent,
  ReceiptFlightSegment,
  ReceiptIncludedItem,
  ReceiptInstalmentPayment,
  ReceiptError,
  AccommodationOption,
  UnitOption,
  BoardOption,
  SelectableOption,
  SelectableOptionKind,
  OptionChoice,
  ActivityOption,
  FlightOption,
  FlightLeg,
  FlightSegment,
  CarOption,
  CarExtra,
  CountryOption,
  CheckoutData,
  CheckoutField,
  PaymentMethod,
  PaymentMethodGroup,
  CouponSource,
  TermsLink,
  TermsPage,
} from './types'

/* ── Helpers ── */

function normalizeOption(option: any): SelectableOption {
  const choices: OptionChoice[] | undefined = option.choices?.map((c: any) => ({
    id: c.id ?? '',
    name: c.name ?? '',
    price: c.price?.amount ?? c.price ?? 0,
  }))

  let kind: SelectableOptionKind = 'toggle'
  if (choices?.length) {
    kind = 'choice'
  } else if (typeof option.rangeMin === 'number') {
    kind = 'range'
  }

  return {
    id: option.id ?? '',
    name: option.name ?? '',
    subtitle: option.subtitle ?? '',
    price: option.price?.amount ?? option.price ?? 0,
    mandatory: option.mandatory ?? false,
    kind,
    ...(typeof option.rangeMin === 'number' ? { rangeMin: option.rangeMin } : {}),
    ...(typeof option.rangeMax === 'number' ? { rangeMax: option.rangeMax } : {}),
    ...(choices?.length ? { choices } : {}),
  }
}

function normalizeNight(n: any): NightOption {
  return {
    nights: n.nights ?? null,
    price: n.price ?? 0,
  }
}

/* ── Offer ── */

export function normalizeOffer(offer: any): { offer: OfferSummary; offerMeta: OfferMeta } {
  const o: OfferSummary = {
    id: offer.id ?? '',
    title: offer.title ?? '',
    shortTitle: offer.shortTitle ?? '',
    currency: offer.currency ?? '',
    price: offer.price ?? 0,
    oldPrice: offer.oldPrice ?? 0,
    imageUrl: offer.imageUrl ?? offer.image?.url ?? '',
    location: offer.location ?? '',
    includedList: offer.includedList ?? [],
    excludedList: offer.excludedList ?? [],
    paymentHelp: offer.paymentHelp ?? undefined,
    informationList: (offer.informationList ?? []).map((i: any) => ({
      id: i.id ?? '',
      type: i.type ?? '',
      label: i.label ?? '',
      value: i.value ?? '',
    })),
    termsAndConditions: {
      check: offer.termsAndConditions?.check ?? null,
      text: offer.termsAndConditions?.text ?? null,
      termsLinks: (offer.termsAndConditions?.termsLinks ?? []).map((l: any) => ({
        url: l.url ?? '',
        type: l.type ?? '',
      })),
      pages: (offer.termsAndConditions?.pages ?? []).map((p: any) => ({
        url: p.url ?? '',
        pageType: p.pageType ?? '',
      })),
    },
  }

  const rules = offer.occupancyRules ?? {}
  const meta: OfferMeta = {
    hasFlights: offer.hasFlights ?? false,
    hasCars: offer.hasCars ?? false,
    hasAccommodationUnits: offer.hasAccommodationUnits ?? false,
    isLeisureOnly: offer.isLeisureOnly ?? false,
    selectDate: offer.selectDate ?? false,
    isRoundtrip: offer.isRoundtrip ?? false,
    occupancyRules: {
      minPeople: rules.minPeople ?? 1,
      maxPeople: rules.maxPeople ?? 1,
      minAdults: rules.minAdults ?? 1,
      maxAdults: rules.maxAdults ?? 1,
      minChildren: rules.minChildren ?? 0,
      maxChildren: rules.maxChildren ?? 0,
      minAdultAge: rules.minAdultAge ?? null,
      minChildAge: rules.minChildAge ?? null,
      maxChildAge: rules.maxChildAge ?? null,
      infantsAllowed: rules.infantsAllowed ?? false,
      maxInfants: rules.maxInfants ?? null,
      minSelectablePeople: rules.minSelectablePeople ?? null,
      maxSelectablePeople: rules.maxSelectablePeople ?? null,
      requireBirthdates: rules.requireBirthdates ?? false,
      occupantsLabel: rules.occupantsLabel ?? null,
      occupantsSubLabel: rules.occupantsSubLabel ?? null,
    },
    unitLabel: {
      singular: offer.unitLabel?.singular ?? '',
      plural: offer.unitLabel?.plural ?? '',
    },
    priceCalculationTitle: offer.priceCalculationTitle ?? '',
    packagePriceAmountOfAdults: offer.packagePriceAmountOfAdults ?? 0,
  }

  return { offer: o, offerMeta: meta }
}

/* ── Calendar ── */

export function normalizeCalendar(calendar: any): CalendarData {
  const nights: NightOption[] = (calendar.nights ?? []).map(normalizeNight)

  const dates: CalendarDate[] = (calendar.dates ?? []).map((d: any) => ({
    date: d.date ?? '',
    price: d.price ?? 0,
    quantity: d.quantity ?? null,
    nights: (d.nights ?? []).map(normalizeNight),
  }))

  const departureAirports: CalendarAirport[] = (calendar.departureAirports ?? []).map((da: any) => {
    const a = da.airport ?? da
    return {
      iataCode: a.iataCode ?? da.iataCode ?? '',
      cityName: a.cityName ?? da.cityName ?? '',
      name: a.name ?? da.name ?? '',
      distance: a.distance ?? da.distance ?? null,
      price: da.price ?? a.price ?? 0,
    }
  })

  const packageGroups: PackageGroup[] = (calendar.packageGroups ?? []).map((pg: any) => ({
    id: pg.id ?? '',
    name: pg.name ?? '',
    description: pg.description ?? '',
    price: pg.price ?? 0,
    oldPrice: pg.oldPrice ?? undefined,
    topDiscount: pg.topDiscount ?? undefined,
    imageUrl: pg.images?.[0]?.url ?? pg.imageUrl ?? '',
  }))

  return {
    months: calendar.months ?? [],
    dates,
    nights,
    departureAirports,
    packageGroups,
    minDate: calendar.minDate ?? null,
    maxDate: calendar.maxDate ?? null,
  }
}

/* ── Receipt ── */

function normalizeReceiptFlightSegment(seg: any): ReceiptFlightSegment {
  return {
    airlineName: seg.airline?.name ?? seg.airlineName ?? null,
    airlineCode: seg.airline?.code ?? seg.airlineCode ?? null,
    airlineLogo: seg.airline?.logo?.url ?? seg.airlineLogo ?? null,
    operatingAirlineName: seg.operatingAirline?.name ?? seg.operatingAirlineName ?? null,
    operatingAirlineCode: seg.operatingAirline?.code ?? seg.operatingAirlineCode ?? null,
    departureDatetime: seg.departure?.datetime ?? seg.departureDatetime ?? null,
    departureAirportName: seg.departure?.airport?.name ?? seg.departureAirportName ?? null,
    departureAirportCode: seg.departure?.airport?.iataCode ?? seg.departureAirportCode ?? null,
    departureCityName: seg.departure?.airport?.cityName ?? seg.departureCityName ?? null,
    departureTimezone: seg.departure?.timezone ?? seg.departureTimezone ?? null,
    arrivalDatetime: seg.arrival?.datetime ?? seg.arrivalDatetime ?? null,
    arrivalAirportName: seg.arrival?.airport?.name ?? seg.arrivalAirportName ?? null,
    arrivalAirportCode: seg.arrival?.airport?.iataCode ?? seg.arrivalAirportCode ?? null,
    arrivalCityName: seg.arrival?.airport?.cityName ?? seg.arrivalCityName ?? null,
    arrivalTimezone: seg.arrival?.timezone ?? seg.arrivalTimezone ?? null,
    flightNumber: seg.flightNumber ?? null,
    luggageIncluded: seg.luggageIncluded ?? null,
    luggageAllowance: seg.luggageAllowance ?? null,
    handLuggageRules: seg.handLuggageRules ?? null,
    cabinClass: seg.cabinClass ?? null,
  }
}

function normalizeItineraryComponent(comp: any): ReceiptItineraryComponent {
  const typename = comp.__typename ?? comp.type ?? ''

  const base: ReceiptItineraryComponent = {
    type: typename,
    icon: comp.icon ?? null,
    label: comp.label ?? '',
    sublabel: comp.sublabel ?? '',
  }

  if (typename === 'ItineraryAccommodationComponent') {
    base.checkinDate = comp.checkinDate ?? null
    base.checkoutDate = comp.checkoutDate ?? null
    base.stayNights = comp.stayNights ?? null
    base.accommodationName = comp.accommodation?.name ?? comp.accommodationName ?? null
    base.unitName = comp.unit?.name ?? comp.unitName ?? null
    base.boardName = comp.board?.name ?? comp.boardName ?? null
  }

  if (typename === 'ItineraryFlightComponent') {
    base.flightLegLabel = comp.flightLegLabel ?? comp.leg?.label ?? null
    base.luggageIncluded = comp.luggageIncluded ?? null
    base.luggageAllowance = comp.luggageAllowance ?? null
    base.handLuggageRules = comp.handLuggageRules ?? null
    base.flightSegments = (comp.leg?.segments ?? comp.flightSegments ?? []).map(
      normalizeReceiptFlightSegment
    )
  }

  if (typename === 'ItineraryCarComponent') {
    base.carModel = comp.car?.model ?? comp.carModel ?? null
    base.carImageUrl = comp.car?.image?.url ?? comp.carImageUrl ?? null
    base.pickupLocationName = comp.pickupLocation?.venue?.name ?? comp.pickupLocationName ?? null
    base.pickupLocationAddress = comp.pickupLocation?.venue?.address ?? comp.pickupLocationAddress ?? null
    base.dropoffLocationName = comp.dropoffLocation?.venue?.name ?? comp.dropoffLocationName ?? null
    base.dropoffLocationAddress = comp.dropoffLocation?.venue?.address ?? comp.dropoffLocationAddress ?? null
  }

  return base
}

export function normalizeReceipt(receipt: any): ReceiptData {
  const lines: ReceiptLine[] = (receipt.lines ?? []).map((l: any) => ({
    label: l.label ?? '',
    amount: l.amount ?? undefined,
    perPerson: l.perPerson ?? undefined,
    text: l.text ?? undefined,
    format: l.format ?? null,
    origin: l.origin ?? null,
  }))

  const itinerary: ReceiptItineraryEvent[] = (receipt.itinerary?.events ?? []).map((ev: any) => ({
    label: ev.label ?? '',
    sublabel: ev.sublabel ?? '',
    date: ev.date ?? '',
    components: (ev.components ?? []).map(normalizeItineraryComponent),
  }))

  const included: ReceiptIncludedItem[] = (receipt.included ?? []).map((i: any) => ({
    title: i.title ?? '',
    description: i.description ?? undefined,
    price: i.price ?? undefined,
  }))

  const excluded: ReceiptIncludedItem[] = (receipt.excluded ?? []).map((i: any) => ({
    title: i.title ?? '',
    description: i.description ?? undefined,
    price: i.price ?? undefined,
  }))

  const cancellationDescription: string =
    receipt.cancellationConditions?.shortCancellationDescription ??
    receipt.cancellationDescription ??
    ''

  // API spells it "instalmentsPayments"
  const rawInstalments = receipt.instalmentsPayments ?? receipt.instalmentPayments ?? []
  const instalmentPayments: ReceiptInstalmentPayment[] = rawInstalments.map((ip: any) => ({
    amount: ip.amount ?? 0,
    payBeforeDate: ip.payBeforeDate ?? '',
  }))

  const errors: ReceiptError[] = (receipt.errors ?? []).map((e: any) => ({
    code: e.code ?? undefined,
    field: e.field ?? undefined,
    message: e.message ?? '',
  }))

  return {
    title: receipt.title ?? '',
    totalPrice: receipt.totalPrice ?? 0,
    oldPrice: receipt.oldPrice ?? 0,
    discount: receipt.discount ?? 0,
    perPersonPrice: receipt.perPersonPrice ?? 0,
    startDate: receipt.startDate ?? null,
    endDate: receipt.endDate ?? null,
    nights: receipt.nights ?? null,
    lines,
    itinerary,
    included,
    excluded,
    cancellationDescription,
    instalmentPayments,
    errors,
  }
}

/* ── Accommodations ── */

export function normalizeAccommodations(accommodations: any[]): AccommodationOption[] {
  // API typo: field may be called "accomodations"
  const list = accommodations ?? []

  return list.map((acc: any) => {
    const units: UnitOption[] = (acc.units ?? []).map((u: any) => ({
      id: u.id ?? '',
      name: u.name ?? '',
      description: u.description ?? '',
      subtitle: u.subtitle ?? '',
      price: u.price ?? 0,
      selected: u.selected ?? false,
      availableAmount: u.availableAmount ?? null,
      facilities: (u.facilities ?? []).map((f: any) => typeof f === 'string' ? f : f.name ?? ''),
      imageUrl: u.images?.[0]?.url ?? u.imageUrl ?? '',
      gallery: (u.images ?? u.gallery ?? []).map((img: any) => ({
        id: img.id ?? '',
        url: img.url ?? '',
        title: img.title ?? null,
      })),
      boards: (u.boards ?? []).map((b: any): BoardOption => ({
        id: b.id ?? '',
        name: b.name ?? '',
        description: b.description ?? '',
        price: b.price ?? 0,
        selected: b.selected ?? false,
      })),
      options: (u.options ?? []).map(normalizeOption),
    }))

    const selected = units.some((u) => u.selected)

    return {
      id: acc.id ?? '',
      name: acc.name ?? '',
      subtitle: acc.subtitle ?? '',
      description: acc.description ?? '',
      address: acc.address ?? '',
      price: acc.price ?? 0,
      imageUrl: acc.images?.[0]?.url ?? acc.imageUrl ?? '',
      gallery: (acc.images ?? acc.gallery ?? []).map((img: any) => img.url ?? ''),
      stars: acc.stars ?? 0,
      facilities: (acc.facilities ?? []).map((f: any) => typeof f === 'string' ? f : f.name ?? ''),
      selected,
      units,
    } as AccommodationOption
  })
}

/* ── Activities / Leisures ── */

export function normalizeActivities(leisures: any[]): ActivityOption[] {
  const result: ActivityOption[] = []

  for (const leisure of leisures ?? []) {
    const groupId = leisure.productId ?? leisure.id ?? ''
    const optional = leisure.optional !== false

    for (const unit of leisure.units ?? []) {
      result.push({
        id: unit.productId ?? unit.id ?? '',
        groupId,
        name: unit.name ?? leisure.name ?? '',
        description: unit.description ?? leisure.description ?? '',
        subtitle: unit.subtitle ?? '',
        price: unit.price ?? 0,
        imageUrl: unit.images?.[0]?.url ?? unit.imageUrl ?? '',
        gallery: (unit.images ?? unit.gallery ?? []).map((img: any) => ({
          id: img.id ?? '',
          url: img.url ?? '',
          title: img.title ?? null,
        })),
        date: unit.date ?? null,
        startTime: unit.startTime ?? null,
        endTime: unit.endTime ?? null,
        duration: unit.duration ?? null,
        groupType: unit.groupType ?? null,
        venueName: unit.venueName ?? null,
        additionalInformation: unit.additionalInformation ?? null,
        postBookingInformation: unit.postBookingInformation ?? null,
        selected: unit.selected ?? false,
        optional,
      })
    }
  }

  return result
}

/* ── Flights ── */

function normalizeFlightSegment(seg: any): FlightSegment {
  return {
    airlineName: seg.airline?.name ?? seg.airlineName ?? '',
    airlineCode: seg.airline?.code ?? seg.airlineCode ?? '',
    airlineLogoUrl: seg.airline?.logo?.url ?? seg.airlineLogoUrl ?? undefined,
    operatingAirlineName: seg.operatingAirline?.name ?? seg.operatingAirlineName ?? undefined,
    operatingAirlineCode: seg.operatingAirline?.code ?? seg.operatingAirlineCode ?? undefined,
    operatingAirlineLogoUrl: seg.operatingAirline?.logo?.url ?? seg.operatingAirlineLogoUrl ?? undefined,
    flightNumber: seg.flightNumber ?? '',
    departureCode: seg.departure?.airport?.iataCode ?? seg.departureCode ?? '',
    departureAirportName: seg.departure?.airport?.name ?? seg.departureAirportName ?? undefined,
    departureCity: seg.departure?.airport?.cityName ?? seg.departureCity ?? '',
    departureAt: seg.departure?.datetime ?? seg.departureAt ?? '',
    arrivalCode: seg.arrival?.airport?.iataCode ?? seg.arrivalCode ?? '',
    arrivalAirportName: seg.arrival?.airport?.name ?? seg.arrivalAirportName ?? undefined,
    arrivalCity: seg.arrival?.airport?.cityName ?? seg.arrivalCity ?? '',
    arrivalAt: seg.arrival?.datetime ?? seg.arrivalAt ?? '',
    luggageIncluded: seg.luggageIncluded ?? null,
    luggageAllowance: seg.luggageAllowance ?? null,
    handLuggageRules: seg.handLuggageRules ?? null,
    cabinClass: seg.cabinClass ?? null,
  }
}

export function normalizeFlights(flights: any[]): FlightOption[] {
  return (flights ?? []).map((f: any) => {
    const badges: string[] = (f.badges ?? []).map((b: any) =>
      typeof b === 'string' ? b : b.badgeText ?? b.badge?.badgeText ?? ''
    )

    const luggageOption: SelectableOption | null = f.luggageOption
      ? normalizeOption(f.luggageOption)
      : null

    const legs: FlightLeg[] = (f.legs ?? []).map((leg: any) => ({
      label: leg.label ?? '',
      segments: (leg.segments ?? []).map(normalizeFlightSegment),
    }))

    return {
      id: f.id ?? '',
      price: f.price ?? 0,
      selected: f.selected ?? false,
      badges,
      luggageIncluded: f.luggageIncluded ?? null,
      luggageAllowance: f.luggageAllowance ?? null,
      luggageOption,
      options: (f.options ?? []).map(normalizeOption),
      legs,
    } as FlightOption
  })
}

/* ── Cars ── */

export function normalizeCars(cars: any[]): CarOption[] {
  return (cars ?? []).map((c: any) => {
    const v = c.vehicle ?? c

    const pickupAirport = c.pickupLocation?.airport?.iataCode ?? c.pickupAirportCode ?? ''
    const pickupName = c.pickupLocation?.name ?? c.pickupLocationName ?? ''
    const pickupLabel = pickupAirport && pickupName
      ? `${pickupAirport} - ${pickupName}`
      : pickupAirport || pickupName

    const dropoffAirport = c.dropoffLocation?.airport?.iataCode ?? c.dropoffAirportCode ?? ''
    const dropoffName = c.dropoffLocation?.name ?? c.dropoffLocationName ?? ''
    const dropoffLabel = dropoffAirport && dropoffName
      ? `${dropoffAirport} - ${dropoffName}`
      : dropoffAirport || dropoffName

    return {
      id: c.id ?? '',
      name: v.name ?? c.name ?? '',
      category: v.category ?? c.category ?? '',
      transmission: v.transmission ?? c.transmission ?? '',
      seats: v.seats ?? c.seats ?? null,
      doors: v.doors ?? c.doors ?? null,
      airConditioning: v.airConditioning ?? c.airConditioning ?? false,
      insurance: v.insurance ?? c.insurance ?? null,
      price: c.price ?? 0,
      selected: c.selected ?? false,
      imageUrl: v.image?.url ?? c.imageUrl ?? '',
      pickupLabel,
      dropoffLabel,
    } as CarOption
  })
}

/* ── Car Extras ── */

export function normalizeCarExtras(extras: any[]): CarExtra[] {
  return (extras ?? []).map((e: any) => ({
    id: e.id ?? '',
    name: e.name ?? '',
    extraType: e.extraType ?? '',
    price: e.price?.amount ?? e.price ?? 0,
    prePayable: e.prePayable ?? false,
    keyFactsUrl: e.keyFactsUrl ?? null,
    policyDocUrl: e.policyDocUrl ?? null,
  }))
}

/* ── Countries ── */

export function normalizeCountries(countries: any[]): CountryOption[] {
  return (countries ?? []).map((c: any) => ({
    code: c.code ?? '',
    name: c.name ?? '',
    dialCode: c.dialCode ?? null,
    nationality: c.nationality ?? null,
  }))
}

/* ── Checkout ── */

const FIELD_LABELS: Record<string, { label: string; type: 'text' | 'email' | 'date' }> = {
  firstName: { label: 'First name', type: 'text' },
  lastName: { label: 'Last name', type: 'text' },
  email: { label: 'Email', type: 'email' },
  phone: { label: 'Phone', type: 'text' },
  dateOfBirth: { label: 'Date of birth', type: 'date' },
  birthdate: { label: 'Date of birth', type: 'date' },
  gender: { label: 'Gender', type: 'text' },
  nationality: { label: 'Nationality', type: 'text' },
  address: { label: 'Address', type: 'text' },
  city: { label: 'City', type: 'text' },
  zip: { label: 'Zip code', type: 'text' },
  postalCode: { label: 'Postal code', type: 'text' },
  country: { label: 'Country', type: 'text' },
  passportNumber: { label: 'Passport number', type: 'text' },
  passportExpiry: { label: 'Passport expiry', type: 'date' },
  title: { label: 'Title', type: 'text' },
}

function toCheckoutField(key: string, required = true): CheckoutField {
  const meta = FIELD_LABELS[key]
  return {
    key,
    label: meta?.label ?? key,
    required,
    type: meta?.type ?? 'text',
  }
}

export function normalizeCheckout(
  dynamicPackage: any,
  countries: CountryOption[]
): CheckoutData {
  const dp = dynamicPackage ?? {}

  const leadFieldKeys: string[] = dp.customerSalesflowDisplayFields ?? []
  const participantFieldKeys: string[] = dp.participantSalesflowDisplayFields ?? []

  const leadFields = leadFieldKeys.map((k: string) => toCheckoutField(k))
  const participantFields = participantFieldKeys.map((k: string) => toCheckoutField(k))

  const paymentMethods: PaymentMethod[] = (dp.paymentMethods ?? []).map((pm: any) => ({
    id: pm.id ?? '',
    name: pm.name ?? '',
    shortDescription: pm.shortDescription ?? undefined,
    imageUrl: pm.image?.url ?? pm.imageUrl ?? undefined,
    default: pm.default ?? false,
    availableInInstalments: pm.availableInInstalments ?? false,
    inGroup: pm.inGroup ?? false,
  }))

  const paymentMethodGroups: PaymentMethodGroup[] = (dp.paymentMethodGroups ?? []).map(
    (g: any) => ({
      name: g.name ?? '',
      shortDescription: g.shortDescription ?? undefined,
      logoUrl: g.logo?.url ?? g.logoUrl ?? undefined,
      paymentMethods: (g.paymentMethods ?? []).map((pm: any) => ({
        id: pm.id ?? '',
        name: pm.name ?? '',
        shortDescription: pm.shortDescription ?? undefined,
        imageUrl: pm.image?.url ?? pm.imageUrl ?? undefined,
        default: pm.default ?? false,
        availableInInstalments: pm.availableInInstalments ?? false,
        inGroup: pm.inGroup ?? true,
      })),
    })
  )

  // API typo: "accomodations" (single 'm')
  const accomodations = dp.accomodations ?? dp.accommodations ?? []
  const specialWishesSupported = accomodations.some(
    (a: any) => a.specialWishesAreSupported === true
  )

  const termsMarkdown = dp.termsAndConditions?.markdown ?? ''
  const termsText = dp.termsAndConditions?.text ?? ''
  const termsLinks: TermsLink[] = (dp.termsAndConditions?.termsLinks ?? []).map((l: any) => ({
    url: l.url ?? '',
    type: l.type ?? '',
  }))
  const termsPages: TermsPage[] = (dp.termsAndConditions?.pages ?? []).map((p: any) => ({
    url: p.url ?? '',
    pageType: p.pageType ?? '',
  }))

  const couponSources: CouponSource[] = (dp.couponSources ?? []).map((cs: any) => ({
    source: cs.source ?? '',
    disclaimer: cs.disclaimer ?? '',
  }))

  return {
    leadFields,
    participantFields,
    paymentMethods,
    paymentMethodGroups,
    countries,
    namesMustMatchId: dp.namesMustMatchId ?? false,
    mainDriverRequired: dp.mainDriverRequired ?? false,
    couponSources,
    specialWishesSupported,
    termsMarkdown,
    termsText,
    termsLinks,
    termsPages,
    euDirectiveText: dp.euDirectiveText ?? '',
    maxNrOfInstalments: dp.maxNrOfInstalments ?? 0,
  }
}
