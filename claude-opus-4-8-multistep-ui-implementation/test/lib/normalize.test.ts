import { describe, expect, it } from "vitest";
import {
  normalizeOffer,
  normalizeCalendar,
  normalizeReceipt,
  normalizePaymentMethods,
  normalizeAccommodations,
  normalizeLeisure,
  normalizeFlights,
  normalizeCars,
  normalizeCarExtras,
  normalizeCheckoutMeta,
} from "@/lib/booking/normalize";

describe("normalizeOffer", () => {
  it("maps a fully populated offer", () => {
    const o = normalizeOffer({
      offer: {
        id: 42,
        title: "Long title",
        shortTitle: "Short",
        currency: "EUR",
        selectDate: true,
        isRoundtrip: true,
        hasFlights: true,
        hasCars: true,
        hasAccommodationUnits: true,
        isLeisureOnly: false,
        price: 1000,
        oldPrice: 1200,
        paymentHelp: "help",
        image: { url: "img.jpg" },
        gallery: [{ url: "g1.jpg" }, { noturl: true }, null],
        destinationText: { location: "Rome" },
        includedListWithDescriptions: [{ name: "Flights", description: "incl" }, {}],
        excludedList: ["Tips", 5],
        informationList: [{ id: "i1", label: "L", value: "V" }, {}],
        occupancyRules: {
          minAdults: 2,
          maxAdults: 6,
          minChildren: 0,
          maxChildren: 3,
          minChildAge: 2,
          maxChildAge: 11,
        },
      },
    });
    expect(o.id).toBe("42");
    expect(o.shortTitle).toBe("Short");
    expect(o.image).toBe("img.jpg");
    expect(o.gallery).toEqual(["g1.jpg"]);
    expect(o.location).toBe("Rome");
    expect(o.includedList).toEqual([
      { name: "Flights", description: "incl" },
      { name: "", description: "" },
    ]);
    expect(o.excludedList).toEqual(["Tips"]);
    expect(o.informationList).toEqual([
      { id: "i1", label: "L", value: "V" },
      { id: "", label: "", value: "" },
    ]);
    expect(o.occupancyRules.maxChildAge).toBe(11);
  });

  it("applies defaults for an empty offer", () => {
    const o = normalizeOffer({});
    expect(o.id).toBe("");
    expect(o.shortTitle).toBe("");
    expect(o.currency).toBe("GBP");
    expect(o.gallery).toEqual([]);
    expect(o.includedList).toEqual([]);
    expect(o.excludedList).toEqual([]);
    expect(o.informationList).toEqual([]);
    expect(o.occupancyRules).toEqual({
      minAdults: 1,
      maxAdults: 4,
      minChildren: 0,
      maxChildren: 0,
      minChildAge: 0,
      maxChildAge: 17,
    });
  });

  it("falls back shortTitle to title when missing", () => {
    expect(normalizeOffer({ offer: { title: "Only title" } }).shortTitle).toBe(
      "Only title",
    );
  });
});

describe("normalizeCalendar", () => {
  it("maps populated calendar facets and dates", () => {
    const c = normalizeCalendar({
      offer: {
        calendar: {
          minDate: "2026-01-01",
          maxDate: "2026-03-01",
          globalMinDate: "2026-01-01",
          globalMaxDate: "2026-06-01",
          departureAirports: [
            {
              selected: true,
              price: 100,
              airport: { iataCode: "LHR", name: "Heathrow", cityName: "London" },
            },
          ],
          packageGroups: [{ id: "pg1", name: "Std", price: 200, description: "d" }, {}],
          packageTypes: [{ name: "Flight + hotel", type: "FLIGHT_HOTEL" }, {}],
          nights: [{ nights: 7, price: 50 }, { nights: null, price: 0 }],
          dates: [
            { date: "2026-01-10", price: 300, quantity: 5, nights: [{ nights: 7, price: 0 }] },
            { date: "2026-01-11", price: 0, quantity: 0, nights: null },
          ],
        },
      },
    });
    expect(c.minDate).toBe("2026-01-01");
    expect(c.globalMinDate).toBe("2026-01-01");
    expect(c.globalMaxDate).toBe("2026-06-01");
    expect(c.packageGroups[1]).toEqual({ id: "", name: "", price: 0, description: null });
    expect(c.airports[0]).toEqual({
      selected: true,
      price: 100,
      iataCode: "LHR",
      name: "Heathrow",
      cityName: "London",
    });
    expect(c.packageGroups[0].id).toBe("pg1");
    expect(c.packageTypes).toEqual([
      { name: "Flight + hotel", type: "FLIGHT_HOTEL" },
      { name: "", type: "" },
    ]);
    expect(c.nightsOptions).toEqual([
      { nights: 7, price: 50 },
      { nights: null, price: 0 },
    ]);
    expect(c.dates[0].nights).toEqual([{ nights: 7, price: 0 }]);
    expect(c.dates[1].nights).toEqual([]);
  });

  it("defaults to empty arrays for an empty calendar", () => {
    const c = normalizeCalendar({});
    expect(c).toEqual({
      minDate: null,
      maxDate: null,
      globalMinDate: null,
      globalMaxDate: null,
      airports: [],
      packageGroups: [],
      packageTypes: [],
      nightsOptions: [],
      dates: [],
    });
  });

  it("defaults airport fields when nested airport is missing", () => {
    const c = normalizeCalendar({
      offer: { calendar: { departureAirports: [{ selected: false, price: 0 }] } },
    });
    expect(c.airports[0]).toEqual({
      selected: false,
      price: 0,
      iataCode: "",
      name: "",
      cityName: "",
    });
  });
});

describe("normalizePaymentMethods", () => {
  it("maps methods and defaults", () => {
    expect(
      normalizePaymentMethods([
        { id: "m1", name: "Card", shortDescription: "d", logo: "l", availableInInstalments: true, default: true },
        {},
      ]),
    ).toEqual([
      { id: "m1", name: "Card", shortDescription: "d", logo: "l", availableInInstalments: true, default: true },
      { id: "", name: "", shortDescription: undefined, logo: undefined, availableInInstalments: false, default: false },
    ]);
  });

  it("returns empty for non-arrays", () => {
    expect(normalizePaymentMethods(undefined)).toEqual([]);
  });
});

describe("normalizeReceipt", () => {
  it("maps lines of every kind, itinerary events and instalments", () => {
    const r = normalizeReceipt({
      title: "Receipt",
      totalPrice: 1000,
      oldPrice: 1100,
      discount: 100,
      perPersonPrice: 500,
      startDate: "2026-01-10",
      endDate: "2026-01-17",
      nights: 7,
      lines: [
        { __typename: "ReceiptLineAmount", label: "Base", format: "f", amount: 800, perPerson: 400 },
        { __typename: "ReceiptLineText", label: "Note", text: "txt" },
        { __typename: "ReceiptLineText" }, // defaults label/format/text
        { __typename: "ReceiptLineOther", label: "Plain" },
        { __typename: "ReceiptLineOther" }, // defaults label/format
        { __typename: "ReceiptLineAmount" },
      ],
      included: [{ title: "Bag", price: 10 }, {}],
      excluded: [{ title: "Tip", price: 5 }, {}],
      instalmentsPayments: [
        [{ amount: 100, payBeforeDate: "2026-01-01", deferred: true, percentage: "50%" }, {}],
        "not-an-array",
      ],
      paymentMethods: [{ id: "m1", name: "Card" }],
      errors: [{ code: "E", field: "f", message: "m" }, {}],
      itinerary: {
        events: [
          {
            label: "Day 1",
            sublabel: "sub",
            date: "2026-01-10",
            components: [
              {
                __typename: "ItineraryAccommodationComponent",
                checkinDate: "2026-01-10",
                checkoutDate: "2026-01-17",
                stayNights: 7,
                accommodation: { name: "Hotel" },
                unit: { name: "Suite" },
                board: { name: "BB" },
              },
              {
                __typename: "ItineraryFlightComponent",
                leg: {
                  label: "Outbound",
                  segments: [
                    {
                      airline: { name: "BA", logoUrl: "ba.png" },
                      operatingAirline: { name: "BA CityFlyer" },
                      flightnumber: "BA123",
                      cabinClass: "ECONOMY",
                      luggageIncluded: true,
                      luggageAllowance: "23kg",
                      departure: { datetime: "t1", airport: { iataCode: "LHR" } },
                      arrival: { datetime: "t2", airport: { iataCode: "FCO" } },
                    },
                  ],
                },
              },
              {
                __typename: "ItineraryCarComponent",
                car: { model: "Golf" },
                pickupLocation: { name: "FCO" },
                dropoffLocation: { name: "FCO" },
              },
              { __typename: "ItineraryLeisureComponent", label: "Activity", sublabel: "City tour" },
              { __typename: "ItineraryTransferComponent" },
              { __typename: "SomethingElse" },
            ],
          },
          { components: null },
        ],
      },
    });
    expect(r.lines[0]).toEqual({ kind: "amount", label: "Base", format: "f", amount: 800, perPerson: 400 });
    expect(r.lines[1]).toEqual({ kind: "text", label: "Note", format: null, text: "txt" });
    expect(r.lines[2]).toEqual({ kind: "text", label: "", format: null, text: "" });
    expect(r.lines[3]).toEqual({ kind: "plain", label: "Plain", format: null });
    expect(r.lines[4]).toEqual({ kind: "plain", label: "", format: null });
    expect(r.lines[5]).toEqual({ kind: "amount", label: "", format: null, amount: 0, perPerson: null });
    expect(r.included).toEqual([{ title: "Bag", price: 10 }, { title: "", price: 0 }]);
    expect(r.excluded).toEqual([{ title: "Tip", price: 5 }, { title: "", price: 0 }]);
    expect(r.instalmentsPayments[0][0]).toEqual({
      amount: 100,
      payBeforeDate: "2026-01-01",
      deferred: true,
      percentage: "50%",
    });
    expect(r.instalmentsPayments[0][1]).toEqual({
      amount: 0,
      payBeforeDate: null,
      deferred: false,
      percentage: null,
    });
    expect(r.instalmentsPayments[1]).toEqual([]);
    expect(r.errors).toEqual([
      { code: "E", field: "f", message: "m" },
      { code: undefined, field: undefined, message: undefined },
    ]);
    const [acc, flight, car, activity, transfer, other] = r.events[0].components;
    expect(acc).toMatchObject({ type: "accommodation", accommodationName: "Hotel", unitName: "Suite", boardName: "BB" });
    expect(flight).toMatchObject({ type: "flight", legLabel: "Outbound" });
    expect(flight.segments?.[0]).toMatchObject({ airline: "BA", flightNumber: "BA123", arrivalAirport: "FCO" });
    expect(car).toMatchObject({ type: "car", carModel: "Golf", pickupLocation: "FCO" });
    expect(activity).toMatchObject({ type: "activity", sublabel: "City tour" });
    expect(transfer.type).toBe("transfer");
    expect(other.type).toBe("other");
    expect(r.events[1].components).toEqual([]);
  });

  it("defaults an empty receipt", () => {
    const r = normalizeReceipt(undefined);
    expect(r.totalPrice).toBe(0);
    expect(r.lines).toEqual([]);
    expect(r.included).toEqual([]);
    expect(r.excluded).toEqual([]);
    expect(r.instalmentsPayments).toEqual([]);
    expect(r.paymentMethods).toEqual([]);
    expect(r.errors).toEqual([]);
    expect(r.events).toEqual([]);
  });

  it("handles a flight component with no leg segments", () => {
    const r = normalizeReceipt({
      itinerary: { events: [{ components: [{ __typename: "ItineraryFlightComponent" }] }] },
    });
    expect(r.events[0].components[0].segments).toEqual([]);
  });

  it("defaults every field of a bare itinerary flight segment", () => {
    const r = normalizeReceipt({
      itinerary: {
        events: [
          { components: [{ __typename: "ItineraryFlightComponent", leg: { segments: [{}] } }] },
        ],
      },
    });
    expect(r.events[0].components[0].segments?.[0]).toEqual({
      airline: undefined,
      airlineLogo: undefined,
      operatingAirline: undefined,
      flightNumber: undefined,
      cabinClass: undefined,
      luggageIncluded: undefined,
      luggageAllowance: undefined,
      departureTime: undefined,
      departureAirport: undefined,
      arrivalTime: undefined,
      arrivalAirport: undefined,
    });
  });

  it("defaults bare accommodation and car itinerary components", () => {
    const r = normalizeReceipt({
      itinerary: {
        events: [
          {
            components: [
              { __typename: "ItineraryAccommodationComponent" },
              { __typename: "ItineraryCarComponent" },
            ],
          },
        ],
      },
    });
    const [acc, car] = r.events[0].components;
    expect(acc).toEqual({
      type: "accommodation",
      label: undefined,
      sublabel: undefined,
      checkinDate: undefined,
      checkoutDate: undefined,
      stayNights: undefined,
      accommodationName: undefined,
      unitName: undefined,
      boardName: undefined,
    });
    expect(car).toEqual({
      type: "car",
      label: undefined,
      sublabel: undefined,
      carModel: undefined,
      pickupLocation: undefined,
      dropoffLocation: undefined,
    });
  });
});

describe("normalizeAccommodations", () => {
  it("maps hotels, units and boards", () => {
    const list = normalizeAccommodations({
      dynamicPackage: {
        accomodations: [
          {
            id: "A:1",
            price: 100,
            oldPrice: 120,
            selected: true,
            name: "Hotel",
            subTitle: "sub",
            description: "desc",
            starRating: 4,
            image: { url: "h.jpg" },
            imagePreviews: [{ url: "p.jpg" }],
            venue: { city: "Rome", country: "IT", formattedAddress: "Via 1" },
            facilities: [{ icon: "wifi", name: "Wifi" }, {}],
            units: [
              {
                id: "U:1",
                price: 0,
                selected: true,
                name: "Suite",
                description: "d",
                image: { url: "u.jpg" },
                images: [{ url: "ui.jpg" }],
                facilities: [{ name: "TV" }],
                boards: [{ id: "B:1", price: 5, selected: true, name: "BB", description: "d", boardTypeCode: "BB" }],
              },
            ],
          },
        ],
      },
    });
    expect(list[0]).toMatchObject({
      id: "A:1",
      city: "Rome",
      address: "Via 1",
      facilities: [{ icon: "wifi", name: "Wifi" }, { icon: null, name: "" }],
    });
    expect(list[0].units[0].boards[0].boardTypeCode).toBe("BB");
  });

  it("returns empty when no accommodations and defaults missing nested arrays", () => {
    expect(normalizeAccommodations({})).toEqual([]);
    const list = normalizeAccommodations({
      dynamicPackage: { accomodations: [{ id: "A:1", units: [{ id: "U:1" }] }] },
    });
    expect(list[0].facilities).toEqual([]);
    expect(list[0].units[0].boards).toEqual([]);
    expect(list[0].units[0].facilities).toEqual([]);
  });

  it("defaults a bare hotel (no units), unit and board", () => {
    const list = normalizeAccommodations({
      dynamicPackage: {
        accomodations: [
          {},
          { id: "A:2", units: [{ boards: [{}] }] },
        ],
      },
    });
    expect(list[0].id).toBe("");
    expect(list[0].units).toEqual([]);
    expect(list[0].starRating).toBeUndefined();
    expect(list[0].image).toBeUndefined();
    const board = list[1].units[0].boards[0];
    expect(board).toEqual({
      id: "",
      price: 0,
      selected: false,
      name: "",
      description: undefined,
      boardTypeCode: undefined,
    });
    expect(list[1].units[0].image).toBeUndefined();
  });
});

describe("normalizeLeisure", () => {
  it("maps groups and units", () => {
    const a = normalizeLeisure({
      dynamicPackage: {
        price: 999,
        leisures: [
          {
            id: "L:g1",
            price: 10,
            oldPrice: 12,
            selected: true,
            optional: true,
            date: "2026-01-12",
            units: [{ id: "L:1", price: 0, selected: true, name: "Tour", duration: "PT2H", groupType: "GROUP_TOUR" }],
          },
        ],
      },
    });
    expect(a.baselinePrice).toBe(999);
    expect(a.groups[0].units[0]).toMatchObject({ id: "L:1", duration: "PT2H", groupType: "GROUP_TOUR" });
  });

  it("defaults to empty groups and zero baseline", () => {
    expect(normalizeLeisure({})).toEqual({ baselinePrice: 0, groups: [] });
    const a = normalizeLeisure({ dynamicPackage: { leisures: [{ id: "L:g1" }] } });
    expect(a.groups[0].units).toEqual([]);
  });

  it("defaults every optional field for a bare leisure group + unit", () => {
    const a = normalizeLeisure({
      dynamicPackage: { leisures: [{ units: [{}] }] },
    });
    expect(a.groups[0].id).toBe("");
    expect(a.groups[0].date).toBeUndefined();
    expect(a.groups[0].units[0]).toEqual({
      id: "",
      price: 0,
      selected: false,
      name: "",
      description: undefined,
      image: undefined,
      images: [],
      duration: null,
      groupType: null,
    });
  });
});

describe("normalizeFlights", () => {
  it("maps flights with both legs and full segment detail", () => {
    const flights = normalizeFlights({
      dynamicPackage: {
        flights: [
          {
            id: "F:1",
            price: 200,
            oldPrice: 250,
            selected: true,
            cabinClass: "ECONOMY",
            luggageIncluded: true,
            luggageAllowance: "23kg",
            outboundLeg: {
              label: "Outbound",
              luggageIncluded: true,
              luggageAllowance: "23kg",
              handLuggageRules: "1 bag",
              segments: [
                {
                  flightnumber: "BA1",
                  cabinClass: "ECONOMY",
                  luggageIncluded: true,
                  luggageAllowance: "23kg",
                  airline: { name: "BA", iataCode: "BA", logoUrl: "ba.png" },
                  operatingAirline: { name: "CityFlyer" },
                  departure: { datetime: "t1", airport: { iataCode: "LHR", cityName: "London" } },
                  arrival: { datetime: "t2", airport: { iataCode: "FCO", cityName: "Rome" } },
                },
              ],
            },
            inboundLeg: { segments: null },
          },
        ],
      },
    });
    expect(flights[0]).toMatchObject({ id: "F:1", price: 200, cabinClass: "ECONOMY" });
    expect(flights[0].outboundLeg?.segments[0]).toMatchObject({
      flightNumber: "BA1",
      airlineIata: "BA",
      operatingAirline: "CityFlyer",
      departureCity: "London",
      arrivalCity: "Rome",
    });
    expect(flights[0].inboundLeg?.segments).toEqual([]);
  });

  it("returns empty when no flights and undefined leg yields undefined", () => {
    expect(normalizeFlights({})).toEqual([]);
    const flights = normalizeFlights({ dynamicPackage: { flights: [{ id: "F:1" }] } });
    expect(flights[0].outboundLeg).toBeUndefined();
    expect(flights[0].inboundLeg).toBeUndefined();
  });

  it("defaults every optional field for a bare flight + segment", () => {
    const flights = normalizeFlights({
      dynamicPackage: { flights: [{ outboundLeg: { segments: [{}] } }] },
    });
    expect(flights[0].id).toBe("");
    expect(flights[0].cabinClass).toBeUndefined();
    const seg = flights[0].outboundLeg!.segments[0];
    expect(seg).toEqual({
      flightNumber: undefined,
      cabinClass: undefined,
      luggageIncluded: undefined,
      luggageAllowance: undefined,
      airline: undefined,
      airlineIata: undefined,
      airlineLogo: undefined,
      operatingAirline: undefined,
      departureTime: undefined,
      departureAirport: undefined,
      departureCity: undefined,
      arrivalTime: undefined,
      arrivalAirport: undefined,
      arrivalCity: undefined,
    });
    expect(flights[0].outboundLeg!.label).toBeUndefined();
  });
});

describe("normalizeCars", () => {
  it("maps cars with a vehicle", () => {
    const cars = normalizeCars({
      dynamicPackage: {
        cars: [
          {
            id: "C:1",
            price: 50,
            oldPrice: 60,
            selected: true,
            productTermsUrl: "t",
            insurance: "full",
            vehicle: {
              modelName: "Golf",
              minSeats: 4,
              maxSeats: 5,
              doors: 5,
              minBigSuitcases: 1,
              maxBigSuitcases: 2,
              airConditioning: true,
              transmission: "MANUAL",
              category: "Compact",
              photo: { url: "car.png" },
            },
            pickupLocation: { name: "FCO", venue: { formattedAddress: "A1" } },
            dropoffLocation: { name: "FCO", venue: { formattedAddress: "A2" } },
          },
        ],
      },
    });
    expect(cars[0]).toMatchObject({
      id: "C:1",
      insurance: "full",
      pickupLocation: "FCO",
      pickupAddress: "A1",
      dropoffAddress: "A2",
    });
    expect(cars[0].vehicle?.photo).toBe("car.png");
  });

  it("returns empty when no cars and undefined vehicle stays undefined", () => {
    expect(normalizeCars({})).toEqual([]);
    const cars = normalizeCars({ dynamicPackage: { cars: [{ id: "C:1" }] } });
    expect(cars[0].vehicle).toBeUndefined();
  });

  it("defaults every optional field for a bare car with an empty vehicle", () => {
    const cars = normalizeCars({ dynamicPackage: { cars: [{ vehicle: {} }] } });
    expect(cars[0].id).toBe("");
    expect(cars[0].pickupLocation).toBeUndefined();
    expect(cars[0].dropoffLocation).toBeUndefined();
    expect(cars[0].vehicle).toEqual({
      modelName: undefined,
      minSeats: undefined,
      maxSeats: undefined,
      doors: undefined,
      minBigSuitcases: undefined,
      maxBigSuitcases: undefined,
      airConditioning: undefined,
      transmission: undefined,
      category: undefined,
      photo: undefined,
    });
  });
});

describe("normalizeCarExtras", () => {
  it("maps extras with nested price amount", () => {
    const extras = normalizeCarExtras({
      carExtra: {
        extras: [
          {
            id: "CE:1",
            name: "GPS",
            currency: "EUR",
            currencySymbol: "€",
            prePayable: true,
            extraType: "EQUIPMENT",
            keyFactsUrl: "k",
            policyDocUrl: "p",
            price: { amount: 1500 },
          },
        ],
      },
    });
    expect(extras[0]).toMatchObject({ id: "CE:1", name: "GPS", prePayable: true, price: 1500 });
  });

  it("returns empty when no extras", () => {
    expect(normalizeCarExtras({})).toEqual([]);
  });

  it("defaults optional fields for a minimal extra", () => {
    const extras = normalizeCarExtras({ carExtra: { extras: [{}] } });
    expect(extras[0]).toEqual({
      id: "",
      name: "",
      currency: undefined,
      currencySymbol: undefined,
      prePayable: undefined,
      extraType: undefined,
      keyFactsUrl: undefined,
      policyDocUrl: undefined,
      price: 0,
    });
  });
});

describe("normalizeCheckoutMeta", () => {
  it("parses array and JSON-string field lists, and maps flags", () => {
    const meta = normalizeCheckoutMeta({
      dynamicPackage: {
        customerSalesflowDisplayFields: ["firstName", "lastName", 5],
        participantSalesflowDisplayFields: '["firstName","birthDate"]',
        passportRequired: true,
        namesMustMatchId: true,
        mainDriverRequired: true,
        maxNrOfInstalments: 3,
        euDirectiveText: "eu",
        termsAndConditions: { markdown: "md", links: ["l1"] },
        paymentMethods: [{ id: "m1", name: "Card" }],
      },
      countries: [{ code: "GB", name: "United Kingdom" }, {}],
    });
    expect(meta.customerFields).toEqual(["firstName", "lastName"]);
    expect(meta.participantFields).toEqual(["firstName", "birthDate"]);
    expect(meta.passportRequired).toBe(true);
    expect(meta.maxNrOfInstalments).toBe(3);
    expect(meta.termsMarkdown).toBe("md");
    expect(meta.termsLinks).toEqual(["l1"]);
    expect(meta.countries).toEqual([
      { code: "GB", name: "United Kingdom" },
      { code: "", name: "" },
    ]);
  });

  it("handles defaults, invalid JSON string and non-array fields", () => {
    const meta = normalizeCheckoutMeta({
      dynamicPackage: {
        customerSalesflowDisplayFields: "not json",
        participantSalesflowDisplayFields: '{"a":1}',
      },
    });
    expect(meta.customerFields).toEqual([]);
    expect(meta.participantFields).toEqual([]);
    expect(meta.maxNrOfInstalments).toBe(1);
    expect(meta.termsLinks).toEqual([]);
    expect(meta.countries).toEqual([]);
  });

  it("defaults fields to empty for a numeric (non-array, non-string) value", () => {
    const meta = normalizeCheckoutMeta({
      dynamicPackage: { customerSalesflowDisplayFields: 5 },
    });
    expect(meta.customerFields).toEqual([]);
  });

  it("defaults the whole structure when dynamicPackage is absent", () => {
    const meta = normalizeCheckoutMeta({});
    expect(meta.customerFields).toEqual([]);
    expect(meta.maxNrOfInstalments).toBe(1);
    expect(meta.countries).toEqual([]);
    expect(meta.paymentMethods).toEqual([]);
  });
});
