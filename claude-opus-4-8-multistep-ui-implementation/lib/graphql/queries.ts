// GraphQL documents for the booking flow.
//
// Argument-type discipline (spec-api.md §Calendar argument types):
//   - offer.calendar(...)   -> LIST filters:    nights:[Int], packageGroups:[String], tourUnits:[String]
//   - dynamicPackage*(...)  -> SINGULAR filters: nights:Int,  packageGroup:String,    tourUnit:Int
//
// Price, Duration, Date are custom SCALARS — select them as leaf fields only.

export const OFFER_QUERY = /* GraphQL */ `
  query GetOffer($id: ID) {
    offer(id: $id) {
      id
      title
      shortTitle
      currency
      selectDate
      isRoundtrip
      hasFlights
      hasCars
      hasAccommodationUnits
      isLeisureOnly
      price
      oldPrice
      paymentHelp
      image { url(w: 1280) }
      gallery { url(w: 1280) }
      destinationText { location }
      includedListWithDescriptions { name description }
      excludedList
      informationList { id label value }
      occupancyRules {
        minAdults
        maxAdults
        minChildren
        maxChildren
        minChildAge
        maxChildAge
      }
    }
  }
`;

export const CALENDAR_QUERY = /* GraphQL */ `
  query GetOfferCalendar(
    $id: ID
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $departureAirports: [String]
    $packageGroups: [String]
    $nights: [Int]
    $dateFrom: Date
    $dateTo: Date
  ) {
    offer(id: $id) {
      calendar(
        dynamicPackage: true
        people: $people
        groups: $groups
        departureAirports: $departureAirports
        packageGroups: $packageGroups
        nights: $nights
        dateFrom: $dateFrom
        dateTo: $dateTo
      ) {
        minDate
        maxDate
        globalMinDate
        globalMaxDate
        departureAirports {
          selected
          price
          airport { iataCode name cityName }
        }
        packageGroups {
          id
          name
          price
          description
        }
        packageTypes {
          name
          type
        }
        nights {
          nights
          price
        }
        dates {
          date
          price
          quantity
          nights { nights price }
        }
      }
    }
  }
`;

const RECEIPT_FIELDS = /* GraphQL */ `
  title
  totalPrice
  oldPrice
  discount
  perPersonPrice
  startDate
  endDate
  nights
  errors { code field message }
  lines {
    __typename
    label
    format
    ... on ReceiptLineAmount { amount perPerson }
    ... on ReceiptLineText { text }
  }
  included { title price }
  excluded { title price }
  instalmentsPayments { amount payBeforeDate deferred percentage }
  paymentMethods {
    id
    name
    shortDescription
    logo
    availableInInstalments
    default
  }
  itinerary {
    events {
      label
      sublabel
      date
      components {
        __typename
        label
        sublabel
        ... on ItineraryAccommodationComponent {
          checkinDate
          checkoutDate
          stayNights
          accommodation { name }
          unit { name }
          board { name }
        }
        ... on ItineraryFlightComponent {
          leg {
            label
            segments {
              airline { name iataCode logoUrl(w: 80) }
              operatingAirline { name }
              flightnumber
              cabinClass
              luggageIncluded
              luggageAllowance
              departure { datetime airport { iataCode name } }
              arrival { datetime airport { iataCode name } }
            }
          }
        }
        ... on ItineraryCarComponent {
          car { model }
          pickupLocation { name }
          dropoffLocation { name }
        }
      }
    }
  }
`;

export const RECEIPT_QUERY = /* GraphQL */ `
  query GetReceipt(
    $offerId: ID
    $date: Date
    $nights: Int
    $departureAirports: [String]
    $packageGroup: String
    $tourUnit: Int
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $products: [ProductInput]
    $numOfInstalments: Int
    $coupons: [String]
    $priceSeen: Price
  ) {
    dynamicPackageReceipt(
      offerId: $offerId
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      packageGroup: $packageGroup
      tourUnit: $tourUnit
      people: $people
      groups: $groups
      products: $products
      numOfInstalments: $numOfInstalments
      coupons: $coupons
      priceSeen: $priceSeen
    ) {
      ${RECEIPT_FIELDS}
    }
  }
`;

const DP_ARGS = /* GraphQL */ `
  $offerId: ID
  $date: Date
  $nights: Int
  $departureAirports: [String]
  $packageGroup: String
  $tourUnit: Int
  $people: [PersonInput]
  $groups: [PersonGroupsInput]
  $products: [ProductInput]
`;

const DP_PASS = /* GraphQL */ `
  offerId: $offerId
  date: $date
  nights: $nights
  departureAirports: $departureAirports
  packageGroup: $packageGroup
  tourUnit: $tourUnit
  people: $people
  groups: $groups
  products: $products
`;

export const ACCOMMODATION_QUERY = /* GraphQL */ `
  query GetAccommodations(${DP_ARGS}) {
    dynamicPackage(${DP_PASS}) {
      price
      accomodations {
        id
        price
        oldPrice
        selected
        name
        subTitle
        description
        starRating
        image { url(w: 800) }
        imagePreviews { url(w: 1200) }
        venue { city country formattedAddress }
        facilities { icon name }
        units {
          id
          price
          selected
          name
          description
          image { url(w: 800) }
          images { url(w: 1200) }
          facilities { icon name }
          boards {
            id
            price
            selected
            name
            description
            boardTypeCode
          }
        }
      }
    }
  }
`;

export const LEISURE_QUERY = /* GraphQL */ `
  query GetLeisures(${DP_ARGS}) {
    dynamicPackage(${DP_PASS}) {
      price
      leisures {
        id
        price
        oldPrice
        selected
        optional
        date
        units {
          id
          price
          selected
          name
          description
          image { url(w: 800) }
          images { url(w: 1200) }
          duration
          groupType
        }
      }
    }
  }
`;

const LEG_FRAGMENT = /* GraphQL */ `
  fragment LegFields on FlightLeg {
    label
    luggageIncluded
    luggageAllowance
    handLuggageRules
    segments {
      flightnumber
      cabinClass
      luggageIncluded
      luggageAllowance
      airline { name iataCode logoUrl(w: 80) }
      operatingAirline { name }
      departure { datetime airport { iataCode name cityName } }
      arrival { datetime airport { iataCode name cityName } }
    }
  }
`;

export const FLIGHTS_QUERY = /* GraphQL */ `
  query GetFlights(${DP_ARGS}) {
    dynamicPackage(${DP_PASS}) {
      flights {
        id
        price
        oldPrice
        selected
        cabinClass
        luggageIncluded
        luggageAllowance
        outboundLeg { ...LegFields }
        inboundLeg { ...LegFields }
      }
    }
  }
  ${LEG_FRAGMENT}
`;

export const CARS_QUERY = /* GraphQL */ `
  query GetCars(${DP_ARGS}) {
    dynamicPackage(${DP_PASS}) {
      cars {
        id
        price
        oldPrice
        selected
        productTermsUrl
        insurance
        vehicle {
          modelName
          minSeats
          maxSeats
          doors
          minBigSuitcases
          maxBigSuitcases
          airConditioning
          transmission
          category
          photo { url(w: 600) }
        }
        pickupLocation { name venue { formattedAddress } }
        dropoffLocation { name venue { formattedAddress } }
      }
    }
  }
`;

export const CAR_EXTRAS_QUERY = /* GraphQL */ `
  query GetCarExtras($carProductSetId: ID) {
    carExtra(carProductSetId: $carProductSetId) {
      extras {
        id
        name
        currency
        currencySymbol
        prePayable
        extraType
        keyFactsUrl
        policyDocUrl
        price { amount }
      }
    }
  }
`;

export const CHECKOUT_META_QUERY = /* GraphQL */ `
  query GetCheckoutMeta(${DP_ARGS}) {
    dynamicPackage(${DP_PASS}) {
      customerSalesflowDisplayFields
      participantSalesflowDisplayFields
      passportRequired
      namesMustMatchId
      mainDriverRequired
      maxNrOfInstalments
      euDirectiveText
      termsAndConditions {
        markdown
        links
      }
      paymentMethods {
        id
        name
        shortDescription
        logo
        availableInInstalments
        default
      }
    }
    countries {
      code
      name
    }
  }
`;

export const START_TASK_GROUP = /* GraphQL */ `
  mutation StartTaskGroup($tasks: [TaskInput]!) {
    startTaskGroup(tasks: $tasks) {
      taskGroupId
      started
      tasks { key reason }
    }
  }
`;

export const POLL_TASK_GROUP = /* GraphQL */ `
  query PollTaskGroup($taskGroupId: ID!) {
    pollTaskGroup(taskGroupId: $taskGroupId) {
      status
    }
  }
`;

export const CREATE_ORDER = /* GraphQL */ `
  mutation CreateOrder(
    $offerId: ID!
    $customer: Int!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]
    $date: Date
    $nights: Int
    $departureAirports: [String]
    $tourUnit: Int
    $packageGroup: String
    $products: [ProductInput]
    $coupons: [String]
    $numOfInstalments: Int
    $deferred: Boolean
    $paymentMethod: ID
    $totalPrice: Price!
    $properties: [OrderPropertyInput]
    $priceSeen: Price
  ) {
    createOrder(
      offerId: $offerId
      customer: $customer
      people: $people
      groups: $groups
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      tourUnit: $tourUnit
      packageGroup: $packageGroup
      products: $products
      coupons: $coupons
      numOfInstalments: $numOfInstalments
      deferred: $deferred
      paymentMethod: $paymentMethod
      totalPrice: $totalPrice
      properties: $properties
      priceSeen: $priceSeen
    ) {
      result {
        order { id token referenceId restoreUrl }
        paymentResult { continueUrl }
        errors { code field message }
      }
    }
  }
`;
