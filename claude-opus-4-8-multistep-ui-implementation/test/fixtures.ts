import {
  Accommodation,
  ActivityData,
  CalendarData,
  Car,
  CarExtra,
  CheckoutMeta,
  Flight,
  OfferMeta,
  ReceiptData,
} from "@/lib/booking/types";

export function offerMeta(over: Partial<OfferMeta> = {}): OfferMeta {
  return {
    id: "off-1",
    title: "Sunny Escape",
    shortTitle: "Sunny",
    currency: "GBP",
    selectDate: true,
    isRoundtrip: true,
    hasFlights: true,
    hasCars: true,
    hasAccommodationUnits: true,
    isLeisureOnly: false,
    price: 100000,
    oldPrice: 120000,
    image: "hero.jpg",
    gallery: ["g1.jpg"],
    location: "Rome",
    includedList: [{ name: "Flights", description: "Return flights" }],
    excludedList: ["Tips"],
    informationList: [{ id: "i1", label: "Visa", value: "<p>Needed</p>" }],
    occupancyRules: {
      minAdults: 1,
      maxAdults: 6,
      minChildren: 0,
      maxChildren: 4,
      minChildAge: 2,
      maxChildAge: 17,
    },
    ...over,
  };
}

export function calendar(over: Partial<CalendarData> = {}): CalendarData {
  return {
    minDate: "2026-06-01",
    maxDate: "2026-09-01",
    airports: [
      { selected: true, price: 0, iataCode: "LHR", name: "Heathrow", cityName: "London" },
      { selected: false, price: 2000, iataCode: "LGW", name: "Gatwick", cityName: "London" },
    ],
    packageGroups: [{ id: "pg1", name: "Standard", price: 100000, description: null }],
    packageTypes: [],
    nightsOptions: [
      { nights: null, price: 100000 },
      { nights: 7, price: 100000 },
    ],
    dates: [
      {
        date: "2026-06-10",
        price: 100000,
        quantity: 5,
        nights: [
          { nights: 7, price: 100000 },
          { nights: 10, price: 130000 },
        ],
      },
    ],
    ...over,
  };
}

export function receipt(over: Partial<ReceiptData> = {}): ReceiptData {
  return {
    title: "Your trip",
    totalPrice: 100000,
    oldPrice: 120000,
    discount: 20000,
    perPersonPrice: 50000,
    startDate: "2026-06-10",
    endDate: "2026-06-17",
    nights: 7,
    lines: [{ kind: "amount", label: "Package", format: null, amount: 100000, perPerson: 50000 }],
    included: [],
    excluded: [],
    instalmentsPayments: [],
    paymentMethods: [{ id: "card", name: "Card", default: true, availableInInstalments: true }],
    errors: [],
    events: [
      {
        label: "Day 1",
        date: "2026-06-10",
        components: [
          { type: "accommodation", accommodationName: "Hotel Roma", unitName: "Suite", boardName: "BB", checkinDate: "2026-06-10", checkoutDate: "2026-06-17" },
        ],
      },
    ],
    ...over,
  };
}

export function accommodation(over: Partial<Accommodation> = {}): Accommodation {
  return {
    id: "A:1",
    price: 100000,
    oldPrice: 0,
    selected: true,
    name: "Hotel Roma",
    subTitle: "Central",
    description: "A nice hotel",
    starRating: 4,
    image: "hotel.jpg",
    imagePreviews: ["p1.jpg"],
    city: "Rome",
    country: "Italy",
    address: "Via Roma 1",
    facilities: [{ icon: "wifi", name: "WiFi" }],
    units: [
      {
        id: "U:1",
        price: 0,
        selected: true,
        name: "Suite",
        description: "Big",
        image: "u1.jpg",
        images: ["u1.jpg"],
        facilities: [{ icon: null, name: "TV" }],
        boards: [
          { id: "B:1", price: 0, selected: true, name: "BB", description: "Breakfast", boardTypeCode: "BB" },
          { id: "B:2", price: 5000, selected: false, name: "HB", boardTypeCode: "HB" },
        ],
      },
      {
        id: "U:2",
        price: 8000,
        selected: false,
        name: "Deluxe",
        images: [],
        facilities: [],
        boards: [{ id: "B:3", price: 0, selected: true, name: "RO" }],
      },
    ],
    ...over,
  };
}

export function activityData(over: Partial<ActivityData> = {}): ActivityData {
  return {
    baselinePrice: 100000,
    groups: [
      {
        id: "L:g1",
        price: 0,
        oldPrice: 0,
        selected: false,
        optional: true,
        date: "2026-06-12",
        units: [
          { id: "L:1", price: 2000, selected: false, name: "City tour", images: [], duration: "PT2H", groupType: "GROUP_TOUR" },
          { id: "L:2", price: 3000, selected: false, name: "Food tour", images: [], duration: null, groupType: null },
        ],
      },
    ],
    ...over,
  };
}

export function flight(over: Partial<Flight> = {}): Flight {
  return {
    id: "F:1",
    price: 105000,
    oldPrice: 0,
    selected: true,
    cabinClass: "ECONOMY",
    luggageIncluded: true,
    luggageAllowance: "23kg",
    outboundLeg: {
      label: "Outbound",
      luggageIncluded: true,
      luggageAllowance: "23kg",
      handLuggageRules: "1 cabin bag",
      segments: [
        {
          flightNumber: "100",
          airline: "BA",
          airlineIata: "BA",
          airlineLogo: "ba.png",
          operatingAirline: "BA CityFlyer",
          cabinClass: "ECONOMY",
          luggageIncluded: true,
          luggageAllowance: "23kg",
          departureTime: "2026-06-10T08:00:00Z",
          departureAirport: "LHR",
          departureCity: "London",
          arrivalTime: "2026-06-10T11:30:00Z",
          arrivalAirport: "FCO",
          arrivalCity: "Rome",
        },
      ],
    },
    inboundLeg: {
      label: "Return",
      segments: [
        {
          flightNumber: "101",
          airline: "BA",
          departureTime: "2026-06-17T18:00:00Z",
          departureAirport: "FCO",
          arrivalTime: "2026-06-17T20:00:00Z",
          arrivalAirport: "LHR",
        },
      ],
    },
    ...over,
  };
}

export function car(over: Partial<Car> = {}): Car {
  return {
    id: "C:1",
    price: 102000,
    oldPrice: 0,
    selected: true,
    productTermsUrl: "terms.pdf",
    insurance: "Full cover",
    vehicle: {
      modelName: "VW Golf",
      minSeats: 5,
      maxSeats: 5,
      doors: 5,
      minBigSuitcases: 1,
      maxBigSuitcases: 2,
      airConditioning: true,
      transmission: "MANUAL",
      category: "Compact",
      photo: "golf.png",
    },
    pickupLocation: "Rome FCO",
    pickupAddress: "Airport",
    dropoffLocation: "Rome FCO",
    dropoffAddress: "Airport",
    ...over,
  };
}

export function carExtra(over: Partial<CarExtra> = {}): CarExtra {
  return {
    id: "CE:1",
    name: "GPS",
    currency: "GBP",
    currencySymbol: "£",
    prePayable: true,
    extraType: "EQUIPMENT",
    keyFactsUrl: "kf.pdf",
    policyDocUrl: "pol.pdf",
    price: 1500,
    ...over,
  };
}

export function checkoutMeta(over: Partial<CheckoutMeta> = {}): CheckoutMeta {
  return {
    customerFields: ["firstName", "lastName", "email", "phone"],
    participantFields: ["firstName", "lastName", "birthDate"],
    passportRequired: false,
    namesMustMatchId: true,
    mainDriverRequired: false,
    maxNrOfInstalments: 3,
    euDirectiveText: "EU directive",
    termsMarkdown: "## Terms\nText",
    termsLinks: ["terms.pdf"],
    paymentMethods: [
      { id: "card", name: "Card", default: true, availableInInstalments: true, shortDescription: "Pay by card" },
      { id: "paypal", name: "PayPal", availableInInstalments: false },
    ],
    countries: [
      { code: "GB", name: "United Kingdom" },
      { code: "IT", name: "Italy" },
    ],
    ...over,
  };
}
