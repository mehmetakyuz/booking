// Shared types for the booking engine.
// All Price values are integers in the currency's minor unit (pence/cents).

export interface PersonInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  birthDate?: string
  age?: number
  zipcode?: string
  city?: string
  country?: string
  streetNumber?: string
  nationality?: string
  gender?: string
  idType?: string
  idNumber?: string
  idValidity?: string
  idIssuingCountry?: string
}

export interface PersonGroupsInput {
  people: number[]
}

export interface OptionInput {
  id: string
  value?: string
}

export interface ProductInput {
  id: string
  group?: string
  options?: OptionInput[]
}

export interface OrderPropertyInput {
  name: string
  value: string
}

export interface BookingPayload {
  offerId: string
  sessionId: string
  offerMeta?: OfferMeta

  people: PersonInput[]
  groups: PersonGroupsInput[]

  departureAirports?: string[]
  packageGroup?: string
  nights?: number
  selectedDate?: string
  tourUnit?: number | null

  products?: ProductInput[]
  coupons?: string[]
  numOfInstalments?: number
  deferred?: boolean
  properties?: OrderPropertyInput[]
  // Raw receipt totalPrice echoed back on later requests; preserved as returned.
  priceSeen?: number | string
}

export interface OccupancyRules {
  minPeople: number
  maxPeople: number
  minAdults: number
  maxAdults: number
  minChildren: number
  maxChildren: number
  minChildAge: number
  maxChildAge: number
  requireBirthdates: boolean
}

export interface ImageRef {
  url: string | null
}

export interface ServiceInfo {
  name: string
  description: string
}

export interface OfferInfoItem {
  id: string
  label: string
  value: string
}

export interface OfferMeta {
  id: string
  title: string
  shortTitle: string
  currency: string
  image: ImageRef | null
  gallery: ImageRef[]
  location: string | null
  hasFlights: boolean
  hasCars: boolean
  hasAccommodationUnits: boolean
  isLeisureOnly: boolean
  selectDate: boolean
  isRoundtrip: boolean
  occupancyRules: OccupancyRules | null
  paymentHelp: string
  termsMarkdown: string
  termsCheck: boolean
  includedListWithDescriptions: ServiceInfo[]
  excludedList: string[]
  informationList: OfferInfoItem[]
}

// ---- Calendar ----

export interface CalendarNightsEntry {
  nights: number | null
  price: number | null
  oldPrice: number | null
}

export interface CalendarAirport {
  price: number | null
  selected: boolean | null
  airport: { iataCode: string; name: string; cityName: string } | null
}

export interface CalendarPackageGroup {
  id: string | null
  name: string
  description: string | null
  price: number | null
  oldPrice: number | null
}

export interface CalendarDate {
  date: string
  price: number | null
  quantity: number
  nights: CalendarNightsEntry[]
}

export interface CalendarData {
  departureAirports: CalendarAirport[]
  packageGroups: CalendarPackageGroup[]
  nights: CalendarNightsEntry[]
  dates: CalendarDate[]
  minDate: string | null
  maxDate: string | null
  minChildAge: number | null
  maxChildAge: number | null
}

// ---- Receipt ----

export type ReceiptLineKind = 'ReceiptLine' | 'ReceiptLineAmount' | 'ReceiptLineText'

export interface ReceiptLine {
  kind: ReceiptLineKind
  label: string | null
  format: string | null
  amount?: number | null
  perPerson?: number | null
  text?: string | null
}

export interface ReceiptListItem {
  title: string | null
  price: number | null
}

export interface InstalmentPayment {
  amount: number | null
  payBeforeDate: string | null
  deferred: boolean | null
}

export interface ItineraryComponent {
  type: 'accommodation' | 'flight' | 'car' | 'activity' | 'transfer' | 'other'
  label: string | null
  sublabel: string | null
  // accommodation
  checkinDate?: string | null
  checkoutDate?: string | null
  stayNights?: number | null
  accommodationName?: string | null
  unitName?: string | null
  boardName?: string | null
  // flight
  legLabel?: string | null
  segments?: ItineraryFlightSegment[]
  // car
  carModel?: string | null
  carImage?: string | null
  pickupLocation?: string | null
  dropoffLocation?: string | null
}

export interface ItineraryFlightSegment {
  airline: string | null
  operatingAirline: string | null
  departureAirport: string | null
  departureCity: string | null
  departureTime: string | null
  arrivalAirport: string | null
  arrivalCity: string | null
  arrivalTime: string | null
  cabinClass: string | null
  luggageAllowance: string | null
  luggageIncluded: boolean | null
}

export interface ItineraryEvent {
  label: string | null
  sublabel: string | null
  date: string | null
  components: ItineraryComponent[]
}

export interface ReceiptError {
  code: string | null
  field: string | null
  message: string | null
}

export interface PaymentMethod {
  id: string
  name: string | null
  image: ImageRef | null
  default: boolean | null
}

export interface ReceiptData {
  title: string | null
  totalPrice: number | null
  oldPrice: number | null
  discount: number | null
  perPersonPrice: number | null
  startDate: string | null
  endDate: string | null
  nights: number | null
  lines: ReceiptLine[]
  included: ReceiptListItem[]
  excluded: ReceiptListItem[]
  instalmentsPayments: InstalmentPayment[][]
  cancellationConditions: { isFullyRefundable: boolean | null; isFullyCancellable: boolean | null } | null
  errors: ReceiptError[]
  itinerary: ItineraryEvent[]
}

// ---- Accommodations ----

export interface Facility {
  icon: string | null
  name: string | null
}

export interface AccommodationBoard {
  id: string
  price: number | null
  selected: boolean | null
  name: string | null
  description: string | null
}

export interface AccommodationUnit {
  id: string
  price: number | null
  selected: boolean | null
  name: string | null
  description: string | null
  image: ImageRef | null
  images: ImageRef[]
  boards: AccommodationBoard[]
  facilities: Facility[]
}

export interface Accommodation {
  id: string
  price: number | null
  selected: boolean | null
  name: string | null
  subTitle: string | null
  description: string | null
  image: ImageRef | null
  imagePreviews: ImageRef[]
  facilities: Facility[]
  starRating: string | null
  checkinDate: string | null
  checkoutDate: string | null
  venue: { name: string | null; city: string | null; formattedAddress: string | null } | null
  units: AccommodationUnit[]
}

export interface AccommodationData {
  accommodations: Accommodation[]
}

// ---- Activities ----

export interface LeisureUnit {
  id: string
  price: number | null
  selected: boolean | null
  name: string | null
  description: string | null
  additionalInformation: string | null
  image: ImageRef | null
  images: ImageRef[]
  duration: string | null
  startTime: string | null
  endTime: string | null
  groupType: string | null
  venue: { name: string | null; city: string | null } | null
}

export interface LeisureGroup {
  id: string
  price: number | null
  selected: boolean | null
  date: string | null
  optional: boolean | null
  units: LeisureUnit[]
}

export interface ActivityData {
  basePrice: number | null
  leisures: LeisureGroup[]
}

// ---- Flights ----

export interface FlightSegment {
  airline: { iataCode: string | null; name: string | null; logoUrl: string | null } | null
  operatingAirline: { name: string | null } | null
  departure: { datetime: string | null; airport: { iataCode: string; name: string; cityName: string } | null } | null
  arrival: { datetime: string | null; airport: { iataCode: string; name: string; cityName: string } | null } | null
  flightnumber: string | null
  luggageIncluded: boolean | null
  luggageAllowance: string | null
  handLuggageRules: string | null
  cabinClass: string | null
}

export interface FlightLeg {
  label: string | null
  segments: FlightSegment[]
  luggageIncluded: boolean | null
  luggageAllowance: string | null
  handLuggageRules: string | null
}

export interface Flight {
  id: string
  price: number | null
  selected: boolean | null
  outboundLeg: FlightLeg | null
  inboundLeg: FlightLeg | null
  luggageIncluded: boolean | null
  luggageAllowance: string | null
  cabinClass: string | null
}

export interface FlightData {
  flights: Flight[]
  priceChange: number | null // new receipt total minus pre-search total, minor units
}

// ---- Cars ----

export interface Car {
  id: string
  price: number | null
  selected: boolean | null
  vehicle: {
    modelName: string | null
    category: string | null
    transmission: string | null
    minSeats: number | null
    maxSeats: number | null
    doors: string | null
    airConditioning: boolean | null
    minBigSuitcases: number | null
    photo: ImageRef | null
  } | null
  pickupLocation: { name: string | null } | null
  dropoffLocation: { name: string | null } | null
  productTermsUrl: string | null
}

export interface CarData {
  cars: Car[]
}

export interface CarExtra {
  id: string
  name: string | null
  amount: number | null
  prePayable: boolean | null
  extraType: string | null
  keyFactsUrl: string | null
  policyDocUrl: string | null
}

export interface CarExtrasData {
  carId: string
  extras: CarExtra[]
}

// ---- Checkout ----

export interface CheckoutMeta {
  customerFields: string[]
  participantFields: string[]
  paymentMethods: PaymentMethod[]
  maxNrOfInstalments: number
  termsMarkdown: string
  termsCheck: boolean
  euDirectiveText: string | null
  namesMustMatchId: boolean
  passportRequired: boolean
  countries: { code: string; name: string; nationality: string | null }[]
}

export interface StepDefinition {
  id: 'dates' | 'rooms' | 'activities' | 'flights' | 'cars' | 'checkout'
  label: string
  number: number
}
