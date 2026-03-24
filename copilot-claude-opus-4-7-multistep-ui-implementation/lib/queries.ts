// GraphQL query/mutation strings. Variable names match the live schema exactly.

export const GET_OFFER_QUERY = /* GraphQL */ `
  query GetOffer($id: ID) {
    offer(id: $id) {
      id
      title
      shortTitle
      summary
      reasonToLove
      image { url }
      gallery { url title }
      hasFlights
      hasCars
      hasAccommodationUnits
      isLeisureOnly
      selectDate
      isRoundtrip
      priceNumberOfNights
      paymentHelp
      occupancyRules {
        minAdults
        maxAdults
        minChildren
        maxChildren
        minChildAge
        maxChildAge
        maxNonAdults
        infantsAllowed
        maxInfants
      }
      termsAndConditions { text markdown }
      includedListWithDescriptions { name description }
      excludedList
      informationList { id label value type }
      destinationText { content location }
    }
  }
`;

export const GET_CALENDAR_QUERY = /* GraphQL */ `
  query GetCalendar(
    $id: ID
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $nights: [Int]
    $departureAirports: [String]
    $packageGroups: [String]
    $tourUnits: [String]
    $dateFrom: Date
    $dateTo: Date
  ) {
    offer(id: $id) {
      id
      calendar(
        people: $people
        groups: $groups
        nights: $nights
        departureAirports: $departureAirports
        packageGroups: $packageGroups
        tourUnits: $tourUnits
        dateFrom: $dateFrom
        dateTo: $dateTo
        dynamicPackage: true
      ) {
        departureAirports {
          selected
          price
          oldPrice
          airport { iataCode name cityName }
        }
        packageGroups {
          id
          name
          description
          price
          oldPrice
        }
        nights { nights price oldPrice }
        tourUnits { id name price }
        dates {
          date
          price
          oldPrice
          quantity
          nights { nights price }
        }
        minDate
        maxDate
        globalMinDate
        globalMaxDate
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
  lines {
    __typename
    label
    format
    readmore
    origin
    ... on ReceiptLineAmount { amount perPerson }
    ... on ReceiptLineText { text }
  }
  included { title price description }
  excluded { title price description }
  errors { code field message }
  instalmentsPayments { amount payBeforeDate deferred percentage }
  cancellationConditions {
    shortTermsDescription
    shortCancellationDescription
    shortPolicyDescription
  }
  paymentMethods {
    id
    name
    shortDescription
    image { url }
    availableInInstalments
    inGroup
    default
  }
  itinerary {
    events {
      label
      sublabel
      date
      components {
        __typename
        icon
        label
        sublabel
        ... on ItineraryAccommodationComponent {
          accommodation { name }
          unit { name }
          board { name }
          checkinDate
          checkoutDate
          stayNights
        }
        ... on ItineraryFlightComponent {
          leg {
            label
            luggageIncluded
            luggageAllowance
            handLuggageRules
            segments {
              airline { iataCode name logoUrl }
              operatingAirline { iataCode name }
              departure { datetime airport { iataCode name cityName } }
              arrival { datetime airport { iataCode name cityName } }
              flightnumber
              luggageIncluded
              luggageAllowance
              cabinClass
            }
          }
        }
        ... on ItineraryCarComponent {
          car { model image { url } }
          pickupLocation { name }
          dropoffLocation { name }
        }
      }
    }
  }
`;

export const GET_RECEIPT_QUERY = /* GraphQL */ `
  query GetReceipt(
    $offerId: ID
    $date: Date
    $nights: Int
    $departureAirports: [String]
    $tourUnit: Int
    $packageGroup: String
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $products: [ProductInput]
    $customer: Int
    $numOfInstalments: Int
    $deferred: Boolean
    $paymentMethod: ID
    $coupons: [String]
    $priceSeen: Price
    $properties: [OrderPropertyInput]
  ) {
    dynamicPackageReceipt(
      offerId: $offerId
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      tourUnit: $tourUnit
      packageGroup: $packageGroup
      people: $people
      groups: $groups
      products: $products
      customer: $customer
      numOfInstalments: $numOfInstalments
      deferred: $deferred
      paymentMethod: $paymentMethod
      coupons: $coupons
      priceSeen: $priceSeen
      properties: $properties
    ) {
      ${RECEIPT_FIELDS}
    }
  }
`;

export const GET_ACCOMMODATIONS_QUERY = /* GraphQL */ `
  query GetAccommodations(
    $offerId: ID
    $date: Date
    $nights: Int
    $departureAirports: [String]
    $tourUnit: Int
    $packageGroup: String
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $products: [ProductInput]
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      tourUnit: $tourUnit
      packageGroup: $packageGroup
      people: $people
      groups: $groups
      products: $products
    ) {
      price
      accomodations {
        id
        price
        oldPrice
        selected
        accommodationId
        name
        subTitle
        description
        image { url }
        imagePreviews { url title }
        checkinDate
        checkoutDate
        starRating
        venue { name city formattedAddress }
        facilities { icon name }
        units {
          id
          unitId
          name
          subTitle
          description
          price
          oldPrice
          selected
          availableAmount
          image { url }
          images { url title }
          facilities { icon name }
          boards {
            id
            name
            description
            price
            oldPrice
            selected
            boardTypeCode
          }
        }
      }
    }
  }
`;

export const GET_LEISURES_QUERY = /* GraphQL */ `
  query GetLeisures(
    $offerId: ID
    $date: Date
    $nights: Int
    $departureAirports: [String]
    $tourUnit: Int
    $packageGroup: String
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $products: [ProductInput]
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      tourUnit: $tourUnit
      packageGroup: $packageGroup
      people: $people
      groups: $groups
      products: $products
    ) {
      price
      leisures {
        id
        price
        oldPrice
        selected
        date
        optional
        units {
          id
          name
          description
          additionalInformation
          postBookingInformation
          price
          oldPrice
          selected
          image { url }
          images { url title }
          venue { name }
          duration
          startTime
          endTime
          groupType
          groupMinSize
          groupMaxSize
        }
      }
    }
  }
`;

export const GET_FLIGHTS_QUERY = /* GraphQL */ `
  query GetFlights(
    $offerId: ID
    $date: Date
    $nights: Int
    $departureAirports: [String]
    $tourUnit: Int
    $packageGroup: String
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $products: [ProductInput]
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      tourUnit: $tourUnit
      packageGroup: $packageGroup
      people: $people
      groups: $groups
      products: $products
    ) {
      flights {
        id
        price
        oldPrice
        selected
        cabinClass
        luggageIncluded
        luggageAllowance
        outboundLeg {
          label
          luggageIncluded
          luggageAllowance
          handLuggageRules
          segments {
            airline { iataCode name logoUrl }
            operatingAirline { iataCode name }
            departure { datetime airport { iataCode name cityName } }
            arrival { datetime airport { iataCode name cityName } }
            flightnumber
            luggageIncluded
            luggageAllowance
            cabinClass
          }
        }
        inboundLeg {
          label
          luggageIncluded
          luggageAllowance
          handLuggageRules
          segments {
            airline { iataCode name logoUrl }
            operatingAirline { iataCode name }
            departure { datetime airport { iataCode name cityName } }
            arrival { datetime airport { iataCode name cityName } }
            flightnumber
            luggageIncluded
            luggageAllowance
            cabinClass
          }
        }
      }
    }
  }
`;

export const GET_CARS_QUERY = /* GraphQL */ `
  query GetCars(
    $offerId: ID
    $date: Date
    $nights: Int
    $departureAirports: [String]
    $tourUnit: Int
    $packageGroup: String
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $products: [ProductInput]
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      tourUnit: $tourUnit
      packageGroup: $packageGroup
      people: $people
      groups: $groups
      products: $products
    ) {
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
          transmission
          airConditioning
          category
          minBigSuitcases
          minSmallSuitcases
          photo { url }
        }
        pickupLocation {
          name
          venue { formattedAddress }
          airport { iataCode name }
        }
        dropoffLocation {
          name
          venue { formattedAddress }
          airport { iataCode name }
        }
      }
    }
  }
`;

export const GET_CAR_EXTRAS_QUERY = /* GraphQL */ `
  query GetCarExtras($carProductSetId: ID!) {
    carExtra(carProductSetId: $carProductSetId) {
      extras {
        id
        name
        price { amount }
        currency
        prePayable
        extraType
        keyFactsUrl
        policyDocUrl
      }
    }
  }
`;

export const GET_CHECKOUT_META_QUERY = /* GraphQL */ `
  query GetCheckoutMeta(
    $offerId: ID
    $date: Date
    $nights: Int
    $departureAirports: [String]
    $tourUnit: Int
    $packageGroup: String
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $products: [ProductInput]
  ) {
    dynamicPackage(
      offerId: $offerId
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      tourUnit: $tourUnit
      packageGroup: $packageGroup
      people: $people
      groups: $groups
      products: $products
    ) {
      customerSalesflowDisplayFields
      participantSalesflowDisplayFields
      namesMustMatchId
      passportRequired
      mainDriverRequired
      maxNrOfInstalments
      maxNrOfInstalmentsWithLastDeferred
      euDirectiveText
      termsAndConditions { text markdown }
      paymentMethods {
        id
        name
        shortDescription
        image { url }
        availableInInstalments
        inGroup
        default
      }
      paymentMethodGroups {
        name
        shortDescription
        logo { url }
        paymentMethods {
          id
          name
          shortDescription
          image { url }
          availableInInstalments
          inGroup
          default
        }
      }
    }
    countries {
      code
      name
      dialCode
      nationality
    }
  }
`;

export const START_TASK_GROUP_MUTATION = /* GraphQL */ `
  mutation StartTaskGroup($tasks: [TaskInput]!) {
    startTaskGroup(tasks: $tasks) {
      taskGroupId
      started
      tasks { key reason }
    }
  }
`;

export const POLL_TASK_GROUP_QUERY = /* GraphQL */ `
  query PollTaskGroup($taskGroupId: ID!) {
    pollTaskGroup(taskGroupId: $taskGroupId) {
      status
    }
  }
`;

export const CREATE_ORDER_MUTATION = /* GraphQL */ `
  mutation CreateOrder(
    $offerId: ID
    $people: [PersonInput]
    $groups: [PersonGroupsInput]
    $totalPrice: Price
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
    $properties: [OrderPropertyInput]
    $customer: Int
    $priceSeen: Price
  ) {
    createOrder(
      offerId: $offerId
      people: $people
      groups: $groups
      totalPrice: $totalPrice
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
      properties: $properties
      customer: $customer
      priceSeen: $priceSeen
    ) {
      result {
        errors { code field message }
        order {
          id
          referenceId
          token
          totalPrice
          restoreUrl
        }
        paymentResult { continueUrl }
      }
    }
  }
`;
