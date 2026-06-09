// GraphQL documents for the booking engine. Field names follow the live
// schema, including the API's `accomodations` spelling.

export const GET_OFFER = /* GraphQL */ `
  query GetOffer($id: ID) {
    offer(id: $id) {
      id
      title
      shortTitle
      currency
      paymentHelp
      image { url(w: 1280) }
      gallery { url(w: 1280) }
      destinationText { location }
      hasFlights
      hasCars
      hasAccommodationUnits
      isLeisureOnly
      selectDate
      isRoundtrip
      occupancyRules {
        minPeople maxPeople minAdults maxAdults minChildren maxChildren
        minChildAge maxChildAge requireBirthdates
      }
      termsAndConditions { check markdown }
      includedListWithDescriptions { name description }
      excludedList
      informationList { id label value }
    }
  }
`

export const GET_CALENDAR = /* GraphQL */ `
  query GetOfferCalendar(
    $id: ID
    $nights: [Int]
    $departureAirports: [String]
    $packageGroups: [String]
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
  ) {
    offer(id: $id) {
      calendar(
        dynamicPackage: true
        nights: $nights
        departureAirports: $departureAirports
        packageGroups: $packageGroups
        people: $people
        groups: $groups
      ) {
        departureAirports {
          price
          selected
          airport { iataCode name cityName }
        }
        packageGroups { id name description price oldPrice }
        nights { nights price oldPrice }
        dates {
          date
          price
          quantity
          nights { nights price oldPrice }
        }
        minDate
        maxDate
        minChildAge
        maxChildAge
      }
    }
  }
`

const RECEIPT_FIELDS = /* GraphQL */ `
  title
  totalPrice
  oldPrice
  discount
  perPersonPrice
  startDate
  endDate
  nights
  lines {
    __typename
    label
    format
    ... on ReceiptLineAmount { amount perPerson }
    ... on ReceiptLineText { text }
  }
  included { title price }
  excluded { title price }
  instalmentsPayments { amount payBeforeDate deferred }
  cancellationConditions { shortCancellationDescription shortPolicyDescription }
  errors { code field message }
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
            luggageIncluded
            luggageAllowance
            segments {
              airline { name }
              operatingAirline { name }
              departure { datetime airport { iataCode cityName } }
              arrival { datetime airport { iataCode cityName } }
              cabinClass
              luggageAllowance
              luggageIncluded
            }
          }
        }
        ... on ItineraryCarComponent {
          car { model image { url(w: 400) } }
          pickupLocation { name }
          dropoffLocation { name }
        }
        ... on ItineraryTransferComponent {
          fromVenue { name }
          toVenue { name }
        }
      }
    }
  }
`

export const GET_RECEIPT = /* GraphQL */ `
  query GetDynamicPackageReceipt(
    $offerId: ID
    $date: Date
    $nights: Int
    $departureAirports: [String]
    $packageGroup: String
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $products: [ProductInput]
    $coupons: [String]
    $numOfInstalments: Int
    $deferred: Boolean
    $priceSeen: Price
  ) {
    dynamicPackageReceipt(
      offerId: $offerId
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      packageGroup: $packageGroup
      people: $people
      groups: $groups
      products: $products
      coupons: $coupons
      numOfInstalments: $numOfInstalments
      deferred: $deferred
      priceSeen: $priceSeen
    ) {
      ${RECEIPT_FIELDS}
    }
  }
`

const DP_ARGS_DEF = /* GraphQL */ `
  $offerId: ID
  $date: Date
  $nights: Int
  $departureAirports: [String]
  $packageGroup: String
  $people: [PersonInput]
  $groups: [PersonGroupsInput]
  $products: [ProductInput]
`

const DP_ARGS = /* GraphQL */ `
  offerId: $offerId
  date: $date
  nights: $nights
  departureAirports: $departureAirports
  packageGroup: $packageGroup
  people: $people
  groups: $groups
  products: $products
`

export const GET_ACCOMMODATIONS = /* GraphQL */ `
  query GetDynamicPackageAccommodations(${DP_ARGS_DEF}) {
    dynamicPackage(${DP_ARGS}) {
      accomodations {
        id
        price
        selected
        name
        subTitle
        description
        starRating
        checkinDate
        checkoutDate
        image { url(w: 900) }
        imagePreviews { url(w: 900) }
        facilities { icon name }
        venue { name city formattedAddress }
        units {
          id
          price
          selected
          name
          description
          image { url(w: 900) }
          images { url(w: 900) }
          facilities { icon name }
          boards { id price selected name description }
        }
      }
    }
  }
`

export const GET_LEISURES = /* GraphQL */ `
  query GetDynamicPackageLeisures(${DP_ARGS_DEF}) {
    dynamicPackage(${DP_ARGS}) {
      price
      leisures {
        id
        price
        selected
        date
        optional
        units {
          id
          price
          selected
          name
          description
          additionalInformation
          image { url(w: 900) }
          images { url(w: 900) }
          duration
          startTime
          endTime
          groupType
          venue { name city }
        }
      }
    }
  }
`

const FLIGHT_LEG_FIELDS = /* GraphQL */ `
  label
  luggageIncluded
  luggageAllowance
  handLuggageRules
  segments {
    airline { iataCode name logoUrl(w: 160) }
    operatingAirline { name }
    departure { datetime airport { iataCode name cityName } }
    arrival { datetime airport { iataCode name cityName } }
    flightnumber
    luggageIncluded
    luggageAllowance
    handLuggageRules
    cabinClass
  }
`

export const GET_FLIGHTS = /* GraphQL */ `
  query GetDynamicPackageFlights(${DP_ARGS_DEF}) {
    dynamicPackage(${DP_ARGS}) {
      flights {
        id
        price
        selected
        luggageIncluded
        luggageAllowance
        cabinClass
        outboundLeg { ${FLIGHT_LEG_FIELDS} }
        inboundLeg { ${FLIGHT_LEG_FIELDS} }
      }
    }
  }
`

export const GET_CARS = /* GraphQL */ `
  query GetDynamicPackageCars(${DP_ARGS_DEF}) {
    dynamicPackage(${DP_ARGS}) {
      cars {
        id
        price
        selected
        productTermsUrl
        vehicle {
          modelName
          category
          transmission
          minSeats
          maxSeats
          doors
          airConditioning
          minBigSuitcases
          photo { url(w: 600) }
        }
        pickupLocation { name }
        dropoffLocation { name }
      }
    }
  }
`

export const GET_CAR_EXTRAS = /* GraphQL */ `
  query GetCarExtras($carProductSetId: ID) {
    carExtra(carProductSetId: $carProductSetId) {
      extras {
        id
        name
        price { amount }
        prePayable
        extraType
        keyFactsUrl
        policyDocUrl
      }
    }
  }
`

export const GET_CHECKOUT_META = /* GraphQL */ `
  query GetDynamicPackageInfoForCustomerForm(${DP_ARGS_DEF}) {
    dynamicPackage(${DP_ARGS}) {
      customerSalesflowDisplayFields
      participantSalesflowDisplayFields
      maxNrOfInstalments
      namesMustMatchId
      passportRequired
      euDirectiveText
      termsAndConditions { check markdown }
      paymentMethods {
        id
        name
        default
        image { url(w: 160) }
      }
    }
  }
`

export const GET_COUNTRIES = /* GraphQL */ `
  query GetCountries {
    countries { code name nationality }
  }
`

export const START_TASK_GROUP = /* GraphQL */ `
  mutation StartTaskGroup($tasks: [TaskInput]!) {
    startTaskGroup(tasks: $tasks) {
      taskGroupId
      started
      tasks { key reason }
    }
  }
`

export const POLL_TASK_GROUP = /* GraphQL */ `
  query PollTaskGroup($taskGroupId: ID!) {
    pollTaskGroup(taskGroupId: $taskGroupId) {
      status
    }
  }
`

export const CREATE_ORDER = /* GraphQL */ `
  mutation CreateOrder(
    $offerId: ID!
    $customer: Int!
    $people: [PersonInput]!
    $totalPrice: Price!
    $date: Date
    $paymentMethod: ID
    $nights: Int
    $products: [ProductInput]
    $groups: [PersonGroupsInput]
    $coupons: [String]
    $numOfInstalments: Int
    $departureAirports: [String]
    $tourUnit: Int
    $packageGroup: String
    $properties: [OrderPropertyInput]
    $deferred: Boolean
  ) {
    createOrder(
      offerId: $offerId
      customer: $customer
      people: $people
      totalPrice: $totalPrice
      date: $date
      paymentMethod: $paymentMethod
      nights: $nights
      products: $products
      groups: $groups
      coupons: $coupons
      numOfInstalments: $numOfInstalments
      departureAirports: $departureAirports
      tourUnit: $tourUnit
      packageGroup: $packageGroup
      properties: $properties
      deferred: $deferred
    ) {
      result {
        order { id token referenceId restoreUrl }
        paymentResult { continueUrl }
        errors { code field message }
      }
    }
  }
`
