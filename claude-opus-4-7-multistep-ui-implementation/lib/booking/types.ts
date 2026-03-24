export interface PersonInput {
  birthdate?: string | null
  firstName?: string | null
  lastName?: string | null
  title?: string | null
  nationality?: string | null
  phone?: string | null
  email?: string | null
}

export interface PersonGroupsInput {
  people: number[]
}

export interface ProductInput {
  id: string
  options?: { id: string; choiceId?: string; value?: string }[]
}

export interface OrderPropertyInput {
  name: string
  value: string
}

export interface OfferMeta {
  id: string
  title: string
  shortTitle?: string | null
  currency: string
  price?: number | null
  oldPrice?: number | null
  image?: { url: string } | null
  hasFlights: boolean
  hasCars: boolean
  hasAccommodationUnits: boolean
  isLeisureOnly: boolean
  selectDate: boolean
  isRoundtrip: boolean
  paymentHelp?: string | null
  priceCalculationTitle?: string | null
  packagePriceAmountOfAdults?: number | null
  unitLabel?: { singular?: string; plural?: string } | null
  includedList?: string[] | null
  excludedList?: string[] | null
  occupancyRules: {
    minPeople: number
    maxPeople: number
    minAdults: number
    maxAdults: number
    minChildren: number
    maxChildren: number
    minAdultAge?: number | null
    minChildAge?: number | null
    maxChildAge?: number | null
    infantsAllowed?: boolean | null
    maxInfants?: number | null
    minSelectablePeople?: number | null
    maxSelectablePeople?: number | null
    requireBirthdates?: boolean | null
    occupantsLabel?: string | null
    occupantsSubLabel?: string | null
  }
  informationList?: {
    id: string
    type: string
    value: string
    label?: string
  }[]
  offerCard?: { mainLocation?: string | null } | null
  termsAndConditions?: {
    check?: string
    text?: string
    termsLinks?: { url: string; type: string }[]
    pages?: { url: string; pageType: string }[]
  } | null
}

export interface CalendarDate {
  date: string
  price?: number | null
  quantity?: number | null
  nights?: { nights: number; price: number }[]
}

export interface CalendarData {
  dates: CalendarDate[]
  nights: { nights: number | null; price?: number | null }[]
  departureAirports: {
    airport: { iataCode: string; name: string; cityName?: string; distance?: number }
    price?: number | null
  }[]
  packageGroups: {
    id: string
    name: string
    price?: number | null
    oldPrice?: number | null
    topDiscount?: number | null
    description?: string | null
    images?: { url: string; title?: string }[]
  }[]
  months: { month: string; price?: number | null }[]
  minDate?: string
  maxDate?: string
}

export interface ReceiptLine {
  format?: string
  label?: string
  origin?: string
  amount?: number
  perPerson?: boolean
  text?: string
}

export interface ItineraryEvent {
  label?: string
  sublabel?: string
  date?: string
  components: ItineraryComponent[]
}

export type ItineraryComponent =
  | {
      __typename: 'ItineraryAccommodationComponent'
      type: 'accommodation'
      icon?: string
      label?: string
      sublabel?: string
      checkinDate?: string
      checkoutDate?: string
      stayNights?: number
      accommodation?: { name?: string }
      unit?: { name?: string }
      board?: { name?: string }
    }
  | {
      __typename: 'ItineraryFlightComponent'
      type: 'flight'
      icon?: string
      label?: string
      sublabel?: string
      leg?: {
        label?: string
        luggageIncluded?: boolean
        luggageAllowance?: string
        handLuggageRules?: string
        segments: {
          airline?: { name?: string; iataCode?: string; logo?: string }
          operatingAirline?: { name?: string; iataCode?: string }
          departure?: { datetime?: string; airport?: { name?: string; iataCode?: string; cityName?: string } }
          arrival?: { datetime?: string; airport?: { name?: string; iataCode?: string; cityName?: string } }
          flightnumber?: string
          cabinClass?: string
        }[]
      }
    }
  | {
      __typename: 'ItineraryCarComponent'
      type: 'car'
      icon?: string
      label?: string
      sublabel?: string
      car?: { model?: string; image?: { url?: string } }
      pickupLocation?: { name?: string; venue?: { formattedAddress?: string } }
      dropoffLocation?: { name?: string; venue?: { formattedAddress?: string } }
    }
  | {
      __typename: string
      type: string
      icon?: string
      label?: string
      sublabel?: string
    }

export interface ReceiptData {
  title?: string
  totalPrice?: number
  oldPrice?: number
  discount?: number
  perPersonPrice?: number
  startDate?: string
  endDate?: string
  nights?: number
  lines: ReceiptLine[]
  included?: { title?: string; description?: string; price?: number }[]
  excluded?: { title?: string; description?: string; price?: number }[]
  instalmentsPayments?: { amount: number | null; payBeforeDate: string | null }[][]
  cancellationConditions?: { shortCancellationDescription?: string }
  errors?: { code?: string; field?: string; message: string }[]
  itinerary?: { events: ItineraryEvent[] }
}

export interface BookingPayload {
  offerId: string
  sessionId: string
  offerMeta?: OfferMeta
  people: PersonInput[]
  groups: PersonGroupsInput[]
  departureAirports?: string[]
  packageGroup?: string
  nights?: number | null
  selectedDate?: string
  tourUnit?: number | null
  products?: ProductInput[]
  coupons?: string[]
  numOfInstalments?: number
  deferred?: boolean
  properties?: OrderPropertyInput[]
  priceSeen?: string
}

export interface Facility { name: string; icon?: string | null }

export interface AccommodationUnit {
  id: string
  name: string
  description?: string
  subTitle?: string
  price?: number
  selected?: boolean
  availableAmount?: number
  image?: { url?: string } | null
  images?: { id: string; title?: string; url?: string }[]
  facilities?: Facility[]
  boards?: { id: string; price?: number; name?: string; selected?: boolean; description?: string }[]
}

export interface Accommodation {
  id: string
  name: string
  subTitle?: string
  price?: number
  description?: string
  starRating?: number | null
  venue?: { formattedAddress?: string } | null
  image?: { url?: string } | null
  imagePreviews?: { url?: string }[]
  facilities?: Facility[]
  units?: AccommodationUnit[]
}

export interface LeisureUnit {
  productId: string
  selected?: boolean
  price?: number
  name?: string
  description?: string
  duration?: number | null
  groupMinSize?: number | null
  groupMaxSize?: number | null
  groupType?: string | null
  startTime?: string
  endTime?: string
  additionalInformation?: string | null
  postBookingInformation?: string | null
  venue?: { name?: string }
  images?: { id: string; title?: string; url?: string }[]
  image?: { id: string; url?: string } | null
}

export interface LeisureGroup {
  productId: string
  price?: number
  date?: string
  selected?: boolean
  optional?: boolean
  units: LeisureUnit[]
}

export interface FlightSegment {
  flightnumber?: string
  cabinClass?: string
  luggageIncluded?: boolean
  luggageAllowance?: string
  handLuggageRules?: string
  airline?: { iataCode?: string; name?: string; logoUrl?: string }
  operatingAirline?: { iataCode?: string; name?: string; logoUrl?: string }
  departure?: { datetime?: string; airport?: { iataCode?: string; name?: string; cityName?: string } }
  arrival?: { datetime?: string; airport?: { iataCode?: string; name?: string; cityName?: string } }
}

export interface Flight {
  id: string
  selected?: boolean
  price?: number
  luggageIncluded?: boolean
  luggageAllowance?: string
  badges?: { badgeText?: string }[]
  legs?: { label?: string; segments: FlightSegment[] }[]
}

export interface Car {
  id: string
  selected?: boolean
  price?: number
  insurance?: string
  productTermsUrl?: string
  vehicle?: {
    modelName?: string
    minSeats?: number
    doors?: number
    airConditioning?: boolean
    transmission?: string
    category?: string
    photo?: { url?: string } | null
  }
  pickupLocation?: { name?: string; airport?: { name?: string; cityName?: string; iataCode?: string } }
  dropoffLocation?: { name?: string; airport?: { name?: string; cityName?: string; iataCode?: string } }
}

export interface CarExtra {
  id: string
  prePayable?: boolean
  price?: { amount?: number }
  keyFactsUrl?: string
  policyDocUrl?: string
  name: string
  extraType?: string
}

export interface CheckoutMeta {
  paymentMethods: {
    id: string
    name: string
    shortDescription?: string
    hasExternalInstalments?: boolean
    availableInInstalments?: boolean
    inGroup?: boolean
    default?: boolean
    image?: { url?: string } | null
  }[]
  paymentMethodGroups?: {
    name?: string
    shortDescription?: string
    logo?: { url?: string } | null
    paymentMethods: {
      id: string
      name: string
      default?: boolean
      image?: { url?: string } | null
    }[]
  }[]
  maxNrOfInstalments?: number
  customerSalesflowDisplayFields?: string[]
  participantSalesflowDisplayFields?: string[]
  namesMustMatchId?: boolean
  mainDriverRequired?: boolean
  termsAndConditions?: {
    check?: string
    text?: string
    markdown?: string
    termsLinks?: { url: string; type: string }[]
    pages?: { url: string; pageType: string }[]
  }
  euDirectiveText?: string
  accomodations?: { id: string; specialWishesAreSupported?: boolean }[]
}

export interface StepDefinition {
  id: 'dates' | 'rooms' | 'activities' | 'flights' | 'cars' | 'checkout'
  number: number
  label: string
}
