import {
  AccommodationOption,
  ActivityOption,
  CalendarData,
  CarExtra,
  CarOption,
  CheckoutData,
  CheckoutField,
  CountryOption,
  FlightOption,
  OfferMeta,
  OfferSummary,
  ReceiptData,
  SelectableOption,
} from '@/lib/booking/types'

const CHECKOUT_FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  gender: 'Gender',
  birthDate: 'Birth date',
}

function toField(key: string): CheckoutField {
  return {
    key,
    label: CHECKOUT_FIELD_LABELS[key] ?? key,
    required: true,
    type: key === 'email' ? 'email' : key === 'birthDate' ? 'date' : 'text',
  }
}

function normalizeOption(option: any): SelectableOption {
  const choices = option.choices?.map((choice: any) => ({
    id: choice.id,
    name: choice.name,
    price: choice.price?.amount ?? 0,
  }))

  return {
    id: option.id,
    name: option.name ?? 'Option',
    subtitle: option.subTitle ?? option.description ?? '',
    price: option.price?.amount ?? 0,
    mandatory: Boolean(option.mandatory),
    kind: choices?.length ? 'choice' : typeof option.rangeMin === 'number' || typeof option.rangeMax === 'number' ? 'range' : 'toggle',
    rangeMin: option.rangeMin ?? undefined,
    rangeMax: option.rangeMax ?? undefined,
    choices,
  }
}

export function normalizeOffer(offer: any): { offer: OfferSummary; offerMeta: OfferMeta } {
  return {
    offer: {
      id: String(offer.id),
      title: offer.title,
      shortTitle: offer.shortTitle,
      currency: offer.currency,
      price: offer.price ?? 0,
      oldPrice: offer.oldPrice ?? 0,
      imageUrl: offer.image?.url ?? '',
      location: offer.offerCard?.mainLocation ?? '',
      includedList: offer.includedList ?? [],
      excludedList: offer.excludedList ?? [],
      paymentHelp: offer.paymentHelp ?? '',
      informationList: (offer.informationList ?? []).map((item: any) => ({
        id: item.id,
        type: item.type,
        label: item.label ?? '',
        value: item.value ?? '',
      })),
      termsAndConditions: {
        check: offer.termsAndConditions?.check ?? null,
        text: offer.termsAndConditions?.text ?? null,
        termsLinks: offer.termsAndConditions?.termsLinks ?? [],
        pages: offer.termsAndConditions?.pages ?? [],
      },
    },
    offerMeta: {
      hasFlights: Boolean(offer.hasFlights),
      hasCars: Boolean(offer.hasCars),
      hasAccommodationUnits: Boolean(offer.hasAccommodationUnits),
      isLeisureOnly: Boolean(offer.isLeisureOnly),
      selectDate: offer.selectDate !== false,
      isRoundtrip: Boolean(offer.isRoundtrip),
      occupancyRules: {
        minPeople: offer.occupancyRules?.minPeople ?? 1,
        maxPeople: offer.occupancyRules?.maxPeople ?? 2,
        minAdults: offer.occupancyRules?.minAdults ?? 1,
        maxAdults: offer.occupancyRules?.maxAdults ?? 6,
        minChildren: offer.occupancyRules?.minChildren ?? 0,
        maxChildren: offer.occupancyRules?.maxChildren ?? 0,
        minAdultAge: offer.occupancyRules?.minAdultAge ?? null,
        minChildAge: offer.occupancyRules?.minChildAge ?? null,
        maxChildAge: offer.occupancyRules?.maxChildAge ?? null,
        infantsAllowed: offer.occupancyRules?.infantsAllowed ?? false,
        maxInfants: offer.occupancyRules?.maxInfants ?? null,
        minSelectablePeople: offer.occupancyRules?.minSelectablePeople ?? null,
        maxSelectablePeople: offer.occupancyRules?.maxSelectablePeople ?? null,
        requireBirthdates: offer.occupancyRules?.requireBirthdates ?? false,
        occupantsLabel: offer.occupancyRules?.occupantsLabel ?? null,
        occupantsSubLabel: offer.occupancyRules?.occupantsSubLabel ?? null,
      },
      unitLabel: offer.unitLabel ?? { singular: 'room', plural: 'rooms' },
      priceCalculationTitle: offer.priceCalculationTitle ?? 'per person',
      packagePriceAmountOfAdults: offer.packagePriceAmountOfAdults ?? 2,
    },
  }
}

export function normalizeCalendar(calendar: any): CalendarData {
  return {
    months: (calendar?.months ?? []).map((month: any) => month.month),
    dates: (calendar?.dates ?? []).map((date: any) => ({
      date: date.date,
      price: date.price ?? 0,
      quantity: date.quantity ?? null,
      nights: (date.nights ?? []).map((night: any) => ({
        nights: night.nights,
        price: night.price ?? 0,
      })),
    })),
    nights: (calendar?.nights ?? []).map((night: any) => ({
      nights: night.nights,
      price: night.price ?? 0,
    })),
    departureAirports: (calendar?.departureAirports ?? []).map((item: any) => ({
      iataCode: item.airport?.iataCode ?? '',
      cityName: item.airport?.cityName ?? '',
      name: item.airport?.name ?? '',
      distance: item.airport?.distance ?? null,
      price: item.price ?? 0,
    })),
    packageGroups: (calendar?.packageGroups ?? []).map((group: any) => ({
      id: group.id,
      name: group.name,
      description: group.description ?? '',
      price: group.price ?? 0,
      oldPrice: group.oldPrice ?? undefined,
      topDiscount: group.topDiscount ?? undefined,
      imageUrl: group.images?.[0]?.url ?? '',
    })),
    minDate: calendar?.minDate ?? null,
    maxDate: calendar?.maxDate ?? null,
  }
}

export function normalizeReceipt(receipt: any): ReceiptData {
  return {
    title: receipt?.title ?? 'Booking summary',
    totalPrice: receipt?.totalPrice ?? 0,
    oldPrice: receipt?.oldPrice ?? 0,
    discount: receipt?.discount ?? 0,
    perPersonPrice: receipt?.perPersonPrice ?? 0,
    startDate: receipt?.startDate ?? null,
    endDate: receipt?.endDate ?? null,
    nights: receipt?.nights ?? null,
    lines: (receipt?.lines ?? []).map((line: any) => ({
      label: line.label,
      amount: line.amount ?? undefined,
      perPerson: line.perPerson ?? undefined,
      text: line.text ?? undefined,
      format: line.format ?? null,
      origin: line.origin ?? null,
    })),
    itinerary: (receipt?.itinerary?.events ?? []).map((event: any) => ({
      label: event.label ?? '',
      sublabel: event.sublabel ?? '',
      date: event.date ?? '',
      components: (event.components ?? []).map((component: any) => ({
        type: component.__typename ?? 'ItineraryComponent',
        icon: component.icon ?? null,
        label: component.label ?? '',
        sublabel: component.sublabel ?? '',
        checkinDate: component.checkinDate ?? null,
        checkoutDate: component.checkoutDate ?? null,
        stayNights: component.stayNights ?? null,
        accommodationName: component.accommodation?.name ?? null,
        unitName: component.unit?.name ?? null,
        boardName: component.board?.name ?? null,
        flightLegLabel: component.leg?.label ?? null,
        luggageIncluded: component.leg?.luggageIncluded ?? null,
        luggageAllowance: component.leg?.luggageAllowance ?? null,
        handLuggageRules: component.leg?.handLuggageRules ?? null,
        flightSegments: (component.leg?.segments ?? []).map((segment: any) => ({
          airlineName: segment.airline?.name ?? null,
          airlineCode: segment.airline?.iataCode ?? null,
          airlineLogo: segment.airline?.logo ?? null,
          operatingAirlineName: segment.operatingAirline?.name ?? null,
          operatingAirlineCode: segment.operatingAirline?.iataCode ?? null,
          departureDatetime: segment.departure?.datetime ?? null,
          departureAirportName: segment.departure?.airport?.name ?? null,
          departureAirportCode: segment.departure?.airport?.iataCode ?? null,
          departureCityName: segment.departure?.airport?.cityName ?? null,
          departureTimezone: segment.departure?.airport?.timezone ?? null,
          arrivalDatetime: segment.arrival?.datetime ?? null,
          arrivalAirportName: segment.arrival?.airport?.name ?? null,
          arrivalAirportCode: segment.arrival?.airport?.iataCode ?? null,
          arrivalCityName: segment.arrival?.airport?.cityName ?? null,
          arrivalTimezone: segment.arrival?.airport?.timezone ?? null,
          flightNumber: segment.flightnumber ?? null,
          luggageIncluded: segment.luggageIncluded ?? null,
          luggageAllowance: segment.luggageAllowance ?? null,
          handLuggageRules: segment.handLuggageRules ?? null,
          cabinClass: segment.cabinClass ?? null,
        })),
        carModel: component.car?.model ?? null,
        carImageUrl: component.car?.image?.url ?? null,
        pickupLocationName: component.pickupLocation?.name ?? null,
        pickupLocationAddress:
          component.pickupLocation?.venue?.formattedAddress ??
          ([component.pickupLocation?.venue?.city, component.pickupLocation?.venue?.country].filter(Boolean).join(', ') || null),
        dropoffLocationName: component.dropoffLocation?.name ?? null,
        dropoffLocationAddress:
          component.dropoffLocation?.venue?.formattedAddress ??
          ([component.dropoffLocation?.venue?.city, component.dropoffLocation?.venue?.country].filter(Boolean).join(', ') || null),
      })),
    })),
    included: (receipt?.included ?? []).map((item: any) => ({
      title: item.title,
      description: item.description ?? '',
      price: item.price ?? undefined,
    })),
    excluded: (receipt?.excluded ?? []).map((item: any) => ({
      title: item.title,
      description: item.description ?? '',
      price: item.price ?? undefined,
    })),
    cancellationDescription: receipt?.cancellationConditions?.shortCancellationDescription ?? '',
    instalmentPayments: receipt?.instalmentsPayments ?? [],
    errors: receipt?.errors ?? [],
  }
}

export function normalizeAccommodations(accommodations: any[]): AccommodationOption[] {
  return (accommodations ?? []).map((item: any) => ({
    id: item.id,
    name: item.name,
    subtitle: item.subTitle ?? '',
    description: item.description ?? '',
    address: item.venue?.formattedAddress ?? '',
    price: item.price ?? 0,
    imageUrl: item.image?.url ?? '',
    gallery: (item.imagePreviews ?? []).map((image: any) => image.url).filter(Boolean),
    stars: item.starRating ?? 0,
    facilities: (item.facilities ?? []).map((facility: any) => facility.name),
    selected: Boolean((item.units ?? []).some((unit: any) => unit.selected)),
    units: (item.units ?? []).map((unit: any) => ({
      id: unit.id,
      name: unit.name,
      description: unit.description ?? '',
      subtitle: unit.subTitle ?? '',
      price: unit.price ?? 0,
      selected: Boolean(unit.selected),
      availableAmount: unit.availableAmount ?? null,
      facilities: (unit.facilities ?? []).map((facility: any) => facility.name),
      imageUrl: unit.image?.url ?? '',
      gallery: (unit.images ?? []).map((image: any) => ({
        id: image.id,
        url: image.url,
        title: image.title ?? null,
      })),
      boards: (unit.boards ?? []).map((board: any) => ({
        id: board.id,
        name: board.name,
        description: board.description ?? '',
        price: board.price ?? 0,
        selected: board.selected ?? false,
      })),
      options: (unit.options ?? []).map(normalizeOption),
    })),
  }))
}

export function normalizeActivities(leisures: any[]): ActivityOption[] {
  return (leisures ?? []).flatMap((leisure: any) =>
    (leisure.units ?? []).map((unit: any) => ({
      id: unit.productId,
      groupId: leisure.productId,
      name: unit.name,
      description: unit.description ?? '',
      subtitle: [unit.duration, unit.startTime].filter(Boolean).join(' · '),
      price: unit.price ?? 0,
      imageUrl: unit.image?.url ?? '',
      gallery: (unit.images ?? []).map((image: any) => ({
        id: image.id,
        url: image.url,
        title: image.title ?? null,
      })),
      date: leisure.date ?? null,
      startTime: unit.startTime ?? null,
      endTime: unit.endTime ?? null,
      duration: unit.duration ?? null,
      groupType: unit.groupType ?? null,
      venueName: unit.venue?.name ?? null,
      additionalInformation: unit.additionalInformation ?? null,
      postBookingInformation: unit.postBookingInformation ?? null,
      selected: Boolean(unit.selected),
      optional: leisure.optional !== false,
    })),
  )
}

export function normalizeFlights(flights: any[]): FlightOption[] {
  return (flights ?? []).map((flight: any) => ({
    id: flight.id,
    price: flight.price ?? 0,
    selected: Boolean(flight.selected),
    badges: (flight.badges ?? []).map((badge: any) => badge.badgeText).filter(Boolean),
    luggageIncluded: flight.luggageIncluded ?? null,
    luggageAllowance: flight.luggageAllowance ?? null,
    luggageOption: flight.luggageOption ? normalizeOption(flight.luggageOption) : null,
    options: (flight.options ?? []).map(normalizeOption),
    legs: (flight.legs ?? []).map((leg: any) => ({
      label: leg.label ?? '',
      segments: (leg.segments ?? []).map((segment: any) => ({
        airlineName: segment.airline?.name ?? '',
        airlineCode: segment.airline?.iataCode ?? '',
        airlineLogoUrl: segment.airline?.logoUrl ?? undefined,
        operatingAirlineName: segment.operatingAirline?.name ?? undefined,
        operatingAirlineCode: segment.operatingAirline?.iataCode ?? undefined,
        operatingAirlineLogoUrl: segment.operatingAirline?.logoUrl ?? undefined,
        flightNumber: segment.flightnumber ?? '',
        departureCode: segment.departure?.airport?.iataCode ?? '',
        departureAirportName: segment.departure?.airport?.name ?? undefined,
        departureCity: segment.departure?.airport?.cityName ?? '',
        departureAt: segment.departure?.datetime ?? '',
        arrivalCode: segment.arrival?.airport?.iataCode ?? '',
        arrivalAirportName: segment.arrival?.airport?.name ?? undefined,
        arrivalCity: segment.arrival?.airport?.cityName ?? '',
        arrivalAt: segment.arrival?.datetime ?? '',
        luggageIncluded: segment.luggageIncluded ?? null,
        luggageAllowance: segment.luggageAllowance ?? null,
        handLuggageRules: segment.handLuggageRules ?? null,
        cabinClass: segment.cabinClass ?? null,
      })),
    })),
  }))
}

export function normalizeCars(cars: any[]): CarOption[] {
  return (cars ?? []).map((car: any) => ({
    id: car.id,
    name: car.vehicle?.modelName ?? 'Car hire option',
    category: car.vehicle?.category ?? '',
    transmission: car.vehicle?.transmission ?? '',
    seats: car.vehicle?.minSeats ?? null,
    doors: car.vehicle?.doors ?? null,
    airConditioning: car.vehicle?.airConditioning ?? false,
    insurance: car.insurance ?? null,
    price: car.price ?? 0,
    selected: Boolean(car.selected),
    imageUrl: car.vehicle?.photo?.url ?? '',
    pickupLabel: [car.pickupLocation?.airport?.iataCode, car.pickupLocation?.name].filter(Boolean).join(' · '),
    dropoffLabel: [car.dropoffLocation?.airport?.iataCode, car.dropoffLocation?.name].filter(Boolean).join(' · '),
  }))
}

export function normalizeCarExtras(extras: any[]): CarExtra[] {
  return (extras ?? []).map((extra: any) => ({
    id: extra.id,
    name: extra.name,
    extraType: extra.extraType ?? '',
    price: extra.price?.amount ?? 0,
    prePayable: Boolean(extra.prePayable),
    keyFactsUrl: extra.keyFactsUrl ?? null,
    policyDocUrl: extra.policyDocUrl ?? null,
  }))
}

export function normalizeCountries(countries: any[]): CountryOption[] {
  return (countries ?? []).filter(Boolean).map((country: any) => ({
    code: country.code,
    name: country.name,
    dialCode: country.dialCode ?? null,
    nationality: country.nationality ?? null,
  }))
}

export function normalizeCheckout(dynamicPackage: any, countries: CountryOption[], checkoutMeta?: any): CheckoutData {
  return {
    leadFields: (dynamicPackage?.customerSalesflowDisplayFields ?? []).map(toField),
    participantFields: (dynamicPackage?.participantSalesflowDisplayFields ?? []).map(toField),
    paymentMethods: (dynamicPackage?.paymentMethods ?? []).map((method: any) => ({
      id: method.id,
      name: method.name,
      shortDescription: method.shortDescription ?? '',
      imageUrl: method.image?.url ?? undefined,
      default: method.default ?? false,
      availableInInstalments: method.availableInInstalments ?? true,
      inGroup: method.inGroup ?? false,
    })),
    paymentMethodGroups: (dynamicPackage?.paymentMethodGroups ?? []).map((group: any) => ({
      name: group.name,
      shortDescription: group.shortDescription ?? '',
      logoUrl: group.logo?.url ?? undefined,
      paymentMethods: (group.paymentMethods ?? []).map((method: any) => ({
        id: method.id,
        name: method.name,
        imageUrl: method.image?.url ?? undefined,
        default: method.default ?? false,
      })),
    })),
    countries,
    namesMustMatchId: Boolean(dynamicPackage?.namesMustMatchId),
    mainDriverRequired: Boolean(dynamicPackage?.mainDriverRequired),
    couponSources: (dynamicPackage?.availableCouponSources ?? []).map((source: any) => ({
      source: source.source,
      disclaimer: source.disclaimer,
    })),
    specialWishesSupported: Boolean(
      (dynamicPackage?.accomodations ?? []).some((accommodation: any) => accommodation.specialWishesAreSupported),
    ),
    termsMarkdown: dynamicPackage?.termsAndConditions?.markdown ?? '',
    termsText: dynamicPackage?.termsAndConditions?.text ?? checkoutMeta?.termsAndConditions?.text ?? '',
    termsLinks: dynamicPackage?.termsAndConditions?.termsLinks ?? checkoutMeta?.termsAndConditions?.termsLinks ?? [],
    termsPages: dynamicPackage?.termsAndConditions?.pages ?? checkoutMeta?.termsAndConditions?.pages ?? [],
    euDirectiveText: dynamicPackage?.euDirectiveText ?? checkoutMeta?.euDirectiveText ?? '',
    maxNrOfInstalments: dynamicPackage?.maxNrOfInstalments ?? checkoutMeta?.maxNrOfInstalments ?? 1,
  }
}
