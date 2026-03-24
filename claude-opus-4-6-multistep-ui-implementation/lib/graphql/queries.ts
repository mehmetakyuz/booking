export const GET_OFFER = /* GraphQL */ `
  query getOffer($offerId: ID!) {
    offer(id: $offerId) {
      id
      title
      shortTitle
      currency
      price
      oldPrice
      image { id url(w: 390, h: 220) }
      hasFlights
      hasCars
      hasAccommodationUnits
      isLeisureOnly
      selectDate
      isRoundtrip
      paymentHelp
      priceCalculationTitle
      packagePriceAmountOfAdults
      unitLabel { singular plural }
      includedList
      excludedList
      occupancyRules {
        minPeople maxPeople minAdults maxAdults
        minChildren maxChildren minAdultAge minChildAge maxChildAge
        infantsAllowed maxInfants
        minSelectablePeople maxSelectablePeople
        requireBirthdates occupantsLabel occupantsSubLabel
      }
      informationList(order: [hotel_night, checkin, checkout, currency, additional_list, payment, raw_conditions]) {
        id type value(format: markdown) label(format: markdown)
      }
      offerCard { mainLocation }
      termsAndConditions {
        check text
        termsLinks { url type }
        pages { url pageType }
      }
    }
  }
`

export const GET_OFFER_CALENDAR = /* GraphQL */ `
  query getOfferCalendar(
    $offerId: ID!
    $nights: [Int]
    $dateFrom: Date
    $dateTo: Date
    $departureAirports: [String]
    $tourUnits: [String]
    $packageGroups: [String]
    $people: [PersonInput]!
    $groups: [PersonGroupsInput]
  ) {
    offer(id: $offerId) {
      id
      calendar(
        people: $people groups: $groups nights: $nights
        departureAirports: $departureAirports tourUnits: $tourUnits
        packageGroups: $packageGroups dateFrom: $dateFrom dateTo: $dateTo
      ) {
        dates { date price quantity nights { nights price } }
        nights { nights price }
        departureAirports {
          airport { iataCode name cityName distance }
          price
        }
        packageGroups {
          id name price oldPrice topDiscount description
          images { id url(w: 390, h: 220) title }
        }
        months { month price }
        minDate maxDate
      }
    }
  }
`

export const GET_DYNAMIC_PACKAGE_RECEIPT = /* GraphQL */ `
  query getDynamicPackageReceipt(
    $offerId: ID! $date: Date $nights: Int
    $products: [ProductInput] $people: [PersonInput]! $groups: [PersonGroupsInput]
    $coupons: [String] $numOfInstalments: Int
    $departureAirports: [String] $tourUnit: Int $packageGroup: String
    $properties: [OrderPropertyInput] $deferred: Boolean $priceSeen: Price
  ) {
    dynamicPackageReceipt(
      offerId: $offerId date: $date nights: $nights
      products: $products people: $people groups: $groups
      coupons: $coupons numOfInstalments: $numOfInstalments
      departureAirports: $departureAirports tourUnit: $tourUnit
      packageGroup: $packageGroup properties: $properties
      deferred: $deferred priceSeen: $priceSeen
    ) {
      title totalPrice oldPrice discount perPersonPrice
      startDate endDate nights
      lines {
        format label origin
        ... on ReceiptLineAmount { amount perPerson }
        ... on ReceiptLineText { text }
      }
      included { title description price }
      excluded { title description price }
      instalmentsPayments { amount payBeforeDate }
      cancellationConditions { shortCancellationDescription }
      errors { code field message }
      itinerary {
        events {
          label sublabel date
          components {
            __typename icon label sublabel
            ... on ItineraryAccommodationComponent {
              checkinDate checkoutDate stayNights
              accommodation { name } unit { name } board { name }
            }
            ... on ItineraryFlightComponent {
              leg {
                label luggageIncluded luggageAllowance handLuggageRules
                segments {
                  airline { name iataCode logo }
                  operatingAirline { name iataCode }
                  departure { datetime airport { name iataCode cityName timezone } }
                  arrival { datetime airport { name iataCode cityName timezone } }
                  flightnumber luggageIncluded luggageAllowance handLuggageRules cabinClass
                }
              }
            }
            ... on ItineraryCarComponent {
              car { model image { url } }
              pickupLocation { name venue { formattedAddress city country } }
              dropoffLocation { name venue { formattedAddress city country } }
            }
          }
        }
      }
    }
  }
`

export const GET_DYNAMIC_PACKAGE_ACCOMMODATIONS = /* GraphQL */ `
  query getDynamicPackageAccommodations(
    $offerId: ID! $date: Date! $nights: Int
    $people: [PersonInput]! $groups: [PersonGroupsInput]
    $products: [ProductInput]! $dpr: Float
    $departureAirports: [String] $tourUnit: Int $packageGroup: String
  ) {
    dynamicPackage(
      offerId: $offerId date: $date nights: $nights
      people: $people groups: $groups products: $products
      departureAirports: $departureAirports tourUnit: $tourUnit packageGroup: $packageGroup
    ) {
      accomodations {
        id name subTitle price description starRating
        venue { formattedAddress }
        image { url(w: 480, h: 280, dpr: $dpr) }
        imagePreviews { url(w: 480, h: 280, dpr: $dpr) }
        facilities { name }
        units {
          id name description subTitle price selected availableAmount
          image { id url(w: 543, h: 306, dpr: $dpr) }
          images { id title url(w: 543, h: 306, dpr: $dpr) }
          facilities { name }
          options {
            id name subTitle mandatory price { amount }
            ... on OptionRange { rangeMin rangeMax }
            ... on OptionChoiceList { choices { id name price { amount } } }
          }
          boards { id price name selected description }
        }
      }
    }
  }
`

export const GET_DYNAMIC_PACKAGE_LEISURES = /* GraphQL */ `
  query getDynamicPackageLeisures(
    $offerId: ID! $date: Date! $nights: Int
    $people: [PersonInput]! $groups: [PersonGroupsInput]
    $products: [ProductInput]! $dpr: Float
    $departureAirports: [String] $tourUnit: Int $packageGroup: String
  ) {
    dynamicPackage(
      offerId: $offerId date: $date nights: $nights
      people: $people groups: $groups products: $products
      departureAirports: $departureAirports tourUnit: $tourUnit packageGroup: $packageGroup
    ) {
      price
      leisures {
        productId price date selected optional
        units {
          productId selected price name description
          duration groupMinSize groupMaxSize groupType
          startTime endTime additionalInformation postBookingInformation
          venue { name }
          images { id title url(w: 640, h: 350, dpr: $dpr) }
          image { id url(w: 197, h: 148, dpr: $dpr) }
        }
      }
    }
  }
`

export const GET_DYNAMIC_PACKAGE_FLIGHTS = /* GraphQL */ `
  query getDynamicPackageFlights(
    $offerId: ID! $date: Date! $nights: Int
    $people: [PersonInput]! $groups: [PersonGroupsInput]
    $departureAirports: [String]! $tourUnit: Int $packageGroup: String
    $products: [ProductInput]!
  ) {
    dynamicPackage(
      offerId: $offerId date: $date nights: $nights
      people: $people groups: $groups
      departureAirports: $departureAirports tourUnit: $tourUnit
      packageGroup: $packageGroup products: $products
    ) {
      flights {
        id selected price luggageIncluded luggageAllowance
        badges { badgeText }
        luggageOption {
          id name subTitle mandatory price { amount }
        }
        options {
          id name subTitle mandatory price { amount }
          ... on OptionRange { rangeMin rangeMax }
          ... on OptionChoiceList { choices { id name price { amount } } }
        }
        legs {
          label
          segments {
            flightnumber luggageIncluded luggageAllowance handLuggageRules cabinClass
            airline { iataCode name logoUrl }
            operatingAirline { iataCode name logoUrl }
            departure { datetime airport { iataCode name cityName } }
            arrival { datetime airport { iataCode name cityName } }
          }
        }
      }
    }
  }
`

export const GET_DYNAMIC_PACKAGE_CARS = /* GraphQL */ `
  query getDynamicPackageCars(
    $offerId: ID! $date: Date! $nights: Int
    $people: [PersonInput]! $groups: [PersonGroupsInput]
    $departureAirports: [String]! $tourUnit: Int $packageGroup: String
    $products: [ProductInput]!
  ) {
    dynamicPackage(
      offerId: $offerId date: $date nights: $nights
      people: $people groups: $groups
      departureAirports: $departureAirports tourUnit: $tourUnit
      packageGroup: $packageGroup products: $products
    ) {
      cars {
        id selected price insurance productTermsUrl
        vehicle { modelName minSeats doors airConditioning transmission category photo { id url(w: 200, h: 134) } }
        pickupLocation { name airport { name cityName iataCode } }
        dropoffLocation { name airport { name cityName iataCode } }
      }
    }
  }
`

export const GET_CAR_EXTRAS = /* GraphQL */ `
  query getCarExtras($carProductSetId: ID!) {
    carExtra(carProductSetId: $carProductSetId) {
      extras {
        id prePayable price { amount } keyFactsUrl policyDocUrl name extraType
      }
    }
  }
`

export const GET_DYNAMIC_PACKAGE_INFO_FOR_CUSTOMER_FORM = /* GraphQL */ `
  query getDynamicPackageInfoForCustomerForm(
    $offerId: ID! $date: Date $nights: Int
    $people: [PersonInput]! $groups: [PersonGroupsInput]
    $products: [ProductInput] $departureAirports: [String]
    $tourUnit: Int $packageGroup: String
  ) {
    dynamicPackage(
      offerId: $offerId date: $date nights: $nights
      people: $people groups: $groups products: $products
      departureAirports: $departureAirports tourUnit: $tourUnit packageGroup: $packageGroup
    ) {
      availableCouponSources { source disclaimer }
      paymentMethods {
        id name shortDescription hasExternalInstalments availableInInstalments inGroup default
        image { url(w: 64, h: 47, dpr: 2) }
      }
      paymentMethodGroups {
        name shortDescription
        logo { id url(h: 71, w: 96) }
        paymentMethods { id name hasExternalInstalments default image { url(w: 64, h: 47, dpr: 2) } }
      }
      maxNrOfInstalments
      customerSalesflowDisplayFields
      participantSalesflowDisplayFields
      namesMustMatchId
      mainDriverRequired
      termsAndConditions {
        check text markdown
        termsLinks { url type }
        pages { url pageType }
      }
      euDirectiveText
      accomodations { id specialWishesAreSupported }
    }
  }
`

export const GET_COUNTRIES = /* GraphQL */ `
  query getCountries {
    countries { code name dialCode nationality }
  }
`

export const START_TASK_GROUP = /* GraphQL */ `
  mutation startTaskGroup($tasks: [TaskInput]!) {
    startTaskGroup(tasks: $tasks) { taskGroupId }
  }
`

export const POLL_TASK_GROUP = /* GraphQL */ `
  query pollTaskGroup($taskGroupId: ID!) {
    pollTaskGroup(taskGroupId: $taskGroupId) { status }
  }
`

export const CREATE_ORDER = /* GraphQL */ `
  mutation createOrder(
    $customer: Int $offerId: ID! $people: [PersonInput]!
    $totalPrice: Price! $date: Date $paymentMethod: Int $nights: Int
    $products: [ProductInput] $groups: [PersonGroupsInput]
    $coupons: [String] $numOfInstalments: Int
    $departureAirports: [String] $tourUnit: Int $packageGroup: String
    $properties: [OrderPropertyInput] $deferred: Boolean $priceSeen: Price
  ) {
    createOrder(
      customer: $customer offerId: $offerId people: $people
      totalPrice: $totalPrice date: $date paymentMethod: $paymentMethod
      nights: $nights products: $products groups: $groups
      coupons: $coupons numOfInstalments: $numOfInstalments
      departureAirports: $departureAirports tourUnit: $tourUnit
      packageGroup: $packageGroup properties: $properties
      deferred: $deferred priceSeen: $priceSeen
    ) {
      result {
        errors { code field message }
        order { referenceId }
        paymentResult { continueUrl }
      }
    }
  }
`
