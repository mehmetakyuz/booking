export const GET_OFFER = `
  query GetOffer($id: ID!) {
    offer(id: $id) {
      id
      title
      shortTitle
      image {
        url(w: 1280)
      }
      gallery {
        url(w: 1280)
      }
      destinationText {
        location
      }
      hasFlights
      hasCars
      hasAccommodationUnits
      isLeisureOnly
      selectDate
      isRoundtrip
      occupancyRules {
        minAdults
        maxAdults
        minChildren
        maxChildren
        maxTravellers
      }
      paymentHelpText
      includedListWithDescriptions {
        name
        description
      }
      excludedList
      informationList {
        id
        label
        value
      }
      currency
    }
  }
`;

export const GET_CALENDAR = `
  query GetCalendar(
    $id: ID!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]!
    $nights: [Int]
    $departureAirports: [String]
    $packageGroups: [String]
  ) {
    offer(id: $id) {
      id
      calendar(
        people: $people
        groups: $groups
        nights: $nights
        departureAirports: $departureAirports
        packageGroups: $packageGroups
      ) {
        departureAirports {
          value
          label
          price
        }
        packageGroups {
          value
          label
          price
        }
        nights {
          value
          label
          price
        }
        months {
          name
          year
          dates {
            date
            price
            available
            nights {
              nights
              price
            }
          }
        }
      }
    }
  }
`;

export const GET_RECEIPT = `
  query GetReceipt(
    $offerId: ID!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]!
    $date: String
    $nights: Int
    $departureAirports: [String]
    $packageGroup: String
    $products: [ProductInput]
    $coupons: [String]
    $numOfInstalments: Int
    $deferred: Boolean
  ) {
    dynamicPackageReceipt(
      offerId: $offerId
      people: $people
      groups: $groups
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      packageGroup: $packageGroup
      products: $products
      coupons: $coupons
      numOfInstalments: $numOfInstalments
      deferred: $deferred
    ) {
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
        ... on ReceiptLineAmount {
          amount
          perPerson
        }
        ... on ReceiptLineText {
          text
        }
      }
      included {
        title
        price
      }
      excluded {
        title
        price
      }
      instalmentsPayments {
        amount
        payBeforeDate
      }
      cancellationConditions
      errors {
        code
        field
        message
      }
      itinerary {
        events {
          label
          sublabel
          date
          components {
            __typename
            ... on ItineraryAccommodationComponent {
              checkinDate
              checkoutDate
              stayNights
              accommodation {
                name
              }
              unit {
                name
              }
              board {
                name
              }
            }
            ... on ItineraryFlightComponent {
              legLabel
              airline
              operatingAirline
              flightCode
              cabinClass
              departureTime
              departureAirport
              departureCity
              arrivalTime
              arrivalAirport
              arrivalCity
              duration
              luggageChecked
              luggageHand
            }
            ... on ItineraryCarComponent {
              model
              pickupLocation
              dropoffLocation
              image
            }
          }
        }
      }
    }
  }
`;

export const GET_ACCOMMODATIONS = `
  query GetAccommodations(
    $offerId: ID!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]!
    $date: String!
    $nights: Int!
    $departureAirports: [String]
    $packageGroup: String
  ) {
    dynamicPackage(
      offerId: $offerId
      people: $people
      groups: $groups
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      packageGroup: $packageGroup
    ) {
      accomodations {
        id
        name
        description
        image {
          url(w: 800)
        }
        gallery {
          url(w: 1280)
        }
        facilities {
          name
          icon
        }
        selected
        price
        units {
          id
          name
          description
          image {
            url(w: 800)
          }
          price
          selected
          boards {
            id
            name
            price
            selected
          }
        }
      }
    }
  }
`;

export const GET_LEISURES = `
  query GetLeisures(
    $offerId: ID!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]!
    $date: String!
    $nights: Int!
    $departureAirports: [String]
    $packageGroup: String
    $products: [ProductInput]
  ) {
    dynamicPackage(
      offerId: $offerId
      people: $people
      groups: $groups
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      packageGroup: $packageGroup
      products: $products
    ) {
      price
      leisures {
        id
        name
        description
        image {
          url(w: 800)
        }
        gallery {
          url(w: 1280)
        }
        date
        optional
        selected
        units {
          id
          name
          duration
          groupType
          price
          selected
        }
      }
    }
  }
`;

export const START_TASK_GROUP = `
  mutation StartTaskGroup($tasks: [TaskInput]!) {
    startTaskGroup(tasks: $tasks) {
      taskGroupId
      started
      tasks {
        key
        reason
      }
    }
  }
`;

export const POLL_TASK_GROUP = `
  query PollTaskGroup($taskGroupId: ID!) {
    pollTaskGroup(taskGroupId: $taskGroupId) {
      status
    }
  }
`;

export const GET_FLIGHTS = `
  query GetFlights(
    $offerId: ID!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]!
    $date: String!
    $nights: Int!
    $departureAirports: [String]
    $packageGroup: String
    $products: [ProductInput]
  ) {
    dynamicPackage(
      offerId: $offerId
      people: $people
      groups: $groups
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      packageGroup: $packageGroup
      products: $products
    ) {
      flights {
        id
        price
        selected
        outbound {
          label
          departureTime
          arrivalTime
          duration
          segments {
            airline
            operatingAirline
            flightCode
            cabinClass
            departureTime
            departureAirport {
              code
              city
              name
            }
            arrivalTime
            arrivalAirport {
              code
              city
              name
            }
            duration
            luggageChecked
            luggageHand
          }
        }
        inbound {
          label
          departureTime
          arrivalTime
          duration
          segments {
            airline
            operatingAirline
            flightCode
            cabinClass
            departureTime
            departureAirport {
              code
              city
              name
            }
            arrivalTime
            arrivalAirport {
              code
              city
              name
            }
            duration
            luggageChecked
            luggageHand
          }
        }
      }
    }
  }
`;

export const GET_CARS = `
  query GetCars(
    $offerId: ID!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]!
    $date: String!
    $nights: Int!
    $departureAirports: [String]
    $packageGroup: String
    $products: [ProductInput]
  ) {
    dynamicPackage(
      offerId: $offerId
      people: $people
      groups: $groups
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      packageGroup: $packageGroup
      products: $products
    ) {
      cars {
        id
        model
        image
        price
        selected
        pickupLocation {
          name
        }
        dropoffLocation {
          name
        }
        specifications
      }
    }
  }
`;

export const GET_CAR_EXTRAS = `
  query GetCarExtras($carProductSetId: ID!) {
    carExtra(carProductSetId: $carProductSetId) {
      extras {
        id
        name
        prePayable
        extraType
        keyFactsUrl
        policyDocUrl
        price {
          amount
        }
        currency
        currencySymbol
      }
    }
  }
`;

export const GET_CHECKOUT_META = `
  query GetCheckoutMeta(
    $offerId: ID!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]!
    $date: String!
    $nights: Int!
    $departureAirports: [String]
    $packageGroup: String
    $products: [ProductInput]
  ) {
    countries {
      code
      name
    }
    dynamicPackage(
      offerId: $offerId
      people: $people
      groups: $groups
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      packageGroup: $packageGroup
      products: $products
    ) {
      customerSalesflowDisplayFields
      participantSalesflowDisplayFields
      termsAndConditions {
        termsMarkdown
      }
      euDirectiveText
      paymentMethods {
        id
        name
        logo
        selected
      }
      maxNrOfInstalments
      maxNrOfInstalmentsWithLastDeferred
    }
  }
`;

export const CREATE_ORDER = `
  mutation CreateOrder(
    $offerId: ID!
    $customer: Int!
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]!
    $totalPrice: Price!
    $date: String
    $nights: Int
    $departureAirports: [String]
    $packageGroup: String
    $products: [ProductInput]
    $coupons: [String]
    $numOfInstalments: Int
    $deferred: Boolean
    $properties: [OrderPropertyInput]
    $priceSeen: Price
  ) {
    createOrder(
      offerId: $offerId
      customer: $customer
      people: $people
      groups: $groups
      totalPrice: $totalPrice
      date: $date
      nights: $nights
      departureAirports: $departureAirports
      packageGroup: $packageGroup
      products: $products
      coupons: $coupons
      numOfInstalments: $numOfInstalments
      deferred: $deferred
      properties: $properties
      priceSeen: $priceSeen
    ) {
      result {
        order {
          id
          token
          referenceId
          restoreUrl
        }
        paymentResult {
          continueUrl
        }
        errors {
          code
          field
          message
        }
      }
    }
  }
`;
