/* ── Step identity ── */
export type StepId = 'dates' | 'rooms' | 'activities' | 'flights' | 'cars' | 'checkout'

/* ── API input types (sent to backend) ── */
export interface PersonInput {
  email?: string
  firstName?: string
  lastName?: string
}

export interface PersonGroupsInput {
  people: number[]
}

export interface OptionInput {
  id: string
  value: string
}

export interface ProductInput {
  id: string
  group?: number
  options?: OptionInput[]
}

export interface OrderPropertyInput {
  key?: string
  value?: string
}

/* ── Offer ── */
export interface OccupancyRules {
  minPeople: number
  maxPeople: number
  minAdults: number
  maxAdults: number
  minChildren: number
  maxChildren: number
  minAdultAge?: number | null
  minChildAge?: number | null
  maxChildAge?: number | null
  infantsAllowed?: boolean
  maxInfants?: number | null
  minSelectablePeople?: number | null
  maxSelectablePeople?: number | null
  requireBirthdates?: boolean
  occupantsLabel?: string | null
  occupantsSubLabel?: string | null
}

export interface OfferMeta {
  hasFlights: boolean
  hasCars: boolean
  hasAccommodationUnits: boolean
  isLeisureOnly: boolean
  selectDate: boolean
  isRoundtrip: boolean
  occupancyRules: OccupancyRules
  unitLabel: { singular: string; plural: string }
  priceCalculationTitle: string
  packagePriceAmountOfAdults: number
}

export interface OfferInfoItem {
  id: string
  type: string
  label: string
  value: string
}

export interface TermsLink { url: string; type: string }
export interface TermsPage { url: string; pageType: string }

export interface OfferSummary {
  id: string
  title: string
  shortTitle: string
  currency: string
  price: number
  oldPrice: number
  imageUrl: string
  location: string
  includedList: string[]
  excludedList: string[]
  paymentHelp?: string
  informationList: OfferInfoItem[]
  termsAndConditions: {
    check?: string | null
    text?: string | null
    termsLinks: TermsLink[]
    pages: TermsPage[]
  }
}

/* ── Calendar ── */
export interface CalendarAirport {
  iataCode: string
  cityName: string
  name: string
  distance?: number | null
  price: number
}

export interface PackageGroup {
  id: string
  name: string
  description: string
  price: number
  oldPrice?: number
  topDiscount?: number
  imageUrl: string
}

export interface NightOption {
  nights: number | null
  price: number
}

export interface CalendarDate {
  date: string
  price: number
  quantity?: number | null
  nights: NightOption[]
}

export interface CalendarData {
  months: string[]
  dates: CalendarDate[]
  nights: NightOption[]
  departureAirports: CalendarAirport[]
  packageGroups: PackageGroup[]
  minDate?: string | null
  maxDate?: string | null
}

/* ── Selectable options (shared by accommodation, flights) ── */
export type SelectableOptionKind = 'toggle' | 'range' | 'choice'

export interface OptionChoice {
  id: string
  name: string
  price: number
}

export interface SelectableOption {
  id: string
  name: string
  subtitle: string
  price: number
  mandatory: boolean
  kind: SelectableOptionKind
  rangeMin?: number
  rangeMax?: number
  choices?: OptionChoice[]
}

/* ── Accommodation ── */
export interface BoardOption {
  id: string
  name: string
  description: string
  price: number
  selected?: boolean
}

export interface UnitOption {
  id: string
  name: string
  description: string
  subtitle: string
  price: number
  selected?: boolean
  availableAmount?: number | null
  facilities: string[]
  imageUrl: string
  gallery: Array<{ id: string; url: string; title?: string | null }>
  boards: BoardOption[]
  options: SelectableOption[]
}

export interface AccommodationOption {
  id: string
  name: string
  subtitle: string
  description: string
  address: string
  price: number
  imageUrl: string
  gallery: string[]
  stars: number
  facilities: string[]
  selected?: boolean
  units: UnitOption[]
}

/* ── Activities / Leisures ── */
export interface ActivityOption {
  id: string
  groupId: string
  name: string
  description: string
  subtitle: string
  price: number
  imageUrl: string
  gallery: Array<{ id: string; url: string; title?: string | null }>
  date?: string | null
  startTime?: string | null
  endTime?: string | null
  duration?: string | null
  groupType?: string | null
  venueName?: string | null
  additionalInformation?: string | null
  postBookingInformation?: string | null
  selected: boolean
  optional: boolean
}

/* ── Flights ── */
export interface FlightSegment {
  airlineName: string
  airlineCode: string
  airlineLogoUrl?: string
  operatingAirlineName?: string
  operatingAirlineCode?: string
  operatingAirlineLogoUrl?: string
  flightNumber: string
  departureCode: string
  departureAirportName?: string
  departureCity: string
  departureAt: string
  arrivalCode: string
  arrivalAirportName?: string
  arrivalCity: string
  arrivalAt: string
  luggageIncluded?: boolean | null
  luggageAllowance?: string | null
  handLuggageRules?: string | null
  cabinClass?: string | null
}

export interface FlightLeg {
  label: string
  segments: FlightSegment[]
}

export interface FlightOption {
  id: string
  price: number
  selected?: boolean
  badges: string[]
  luggageIncluded?: string | null
  luggageAllowance?: string | null
  luggageOption?: SelectableOption | null
  options: SelectableOption[]
  legs: FlightLeg[]
}

/* ── Cars ── */
export interface CarExtra {
  id: string
  name: string
  extraType: string
  price: number
  prePayable: boolean
  keyFactsUrl?: string | null
  policyDocUrl?: string | null
}

export interface CarOption {
  id: string
  name: string
  category: string
  transmission: string
  seats?: number | null
  doors?: number | null
  airConditioning?: boolean
  insurance?: string | null
  price: number
  selected?: boolean
  imageUrl: string
  pickupLabel: string
  dropoffLabel: string
}

/* ── Checkout ── */
export interface CheckoutField {
  key: string
  label: string
  required: boolean
  type: 'text' | 'email' | 'date'
}

export interface CountryOption {
  code: string
  name: string
  dialCode?: string | null
  nationality?: string | null
}

export interface PaymentMethod {
  id: string
  name: string
  shortDescription?: string
  imageUrl?: string
  default?: boolean
  availableInInstalments?: boolean
  inGroup?: boolean
}

export interface PaymentMethodGroup {
  name: string
  shortDescription?: string
  logoUrl?: string
  paymentMethods: PaymentMethod[]
}

export interface CouponSource {
  source: string
  disclaimer: string
}

export interface CheckoutData {
  leadFields: CheckoutField[]
  participantFields: CheckoutField[]
  paymentMethods: PaymentMethod[]
  paymentMethodGroups: PaymentMethodGroup[]
  countries: CountryOption[]
  namesMustMatchId: boolean
  mainDriverRequired: boolean
  couponSources: CouponSource[]
  specialWishesSupported: boolean
  termsMarkdown: string
  termsText: string
  termsLinks: TermsLink[]
  termsPages: TermsPage[]
  euDirectiveText: string
  maxNrOfInstalments: number
}

/* ── Receipt ── */
export interface ReceiptLine {
  label: string
  amount?: number
  perPerson?: number
  text?: string
  format?: 'SIBLING' | null
  origin?: string | null
}

export interface ReceiptFlightSegment {
  airlineName?: string | null
  airlineCode?: string | null
  airlineLogo?: string | null
  operatingAirlineName?: string | null
  operatingAirlineCode?: string | null
  departureDatetime?: string | null
  departureAirportName?: string | null
  departureAirportCode?: string | null
  departureCityName?: string | null
  departureTimezone?: string | null
  arrivalDatetime?: string | null
  arrivalAirportName?: string | null
  arrivalAirportCode?: string | null
  arrivalCityName?: string | null
  arrivalTimezone?: string | null
  flightNumber?: string | null
  luggageIncluded?: boolean | null
  luggageAllowance?: string | null
  handLuggageRules?: string | null
  cabinClass?: string | null
}

export interface ReceiptItineraryComponent {
  type: string
  icon?: string | null
  label: string
  sublabel: string
  checkinDate?: string | null
  checkoutDate?: string | null
  stayNights?: number | null
  accommodationName?: string | null
  unitName?: string | null
  boardName?: string | null
  flightLegLabel?: string | null
  luggageIncluded?: boolean | null
  luggageAllowance?: string | null
  handLuggageRules?: string | null
  flightSegments?: ReceiptFlightSegment[]
  carModel?: string | null
  carImageUrl?: string | null
  pickupLocationName?: string | null
  pickupLocationAddress?: string | null
  dropoffLocationName?: string | null
  dropoffLocationAddress?: string | null
}

export interface ReceiptItineraryEvent {
  label: string
  sublabel: string
  date: string
  components: ReceiptItineraryComponent[]
}

export interface ReceiptIncludedItem {
  title: string
  description?: string
  price?: number
}

export interface ReceiptError {
  code?: string
  field?: string
  message: string
}

export interface ReceiptInstalmentPayment {
  amount: number
  payBeforeDate: string
}

export interface ReceiptData {
  title: string
  totalPrice: number
  oldPrice: number
  discount: number
  perPersonPrice: number
  startDate?: string | null
  endDate?: string | null
  nights?: number | null
  lines: ReceiptLine[]
  itinerary: ReceiptItineraryEvent[]
  included: ReceiptIncludedItem[]
  excluded: ReceiptIncludedItem[]
  cancellationDescription: string
  instalmentPayments: ReceiptInstalmentPayment[]
  errors: ReceiptError[]
}

/* ── Booking payload ── */
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
  priceSeen?: string
  products: ProductInput[]
  coupons: string[]
  numOfInstalments: number
  deferred: boolean
  properties?: OrderPropertyInput[]
}

/* ── Step definition ── */
export interface StepDefinition {
  id: StepId
  label: string
}

/* ── Travellers ── */
export interface TravellersState {
  adults: number
  childrenAges: number[]
}

/* ── Async search states ── */
export interface FlightSearchState {
  status: 'idle' | 'searching' | 'validating' | 'success' | 'error'
  error?: string
}

export interface CarSearchState {
  status: 'idle' | 'searching' | 'success' | 'error'
  error?: string
}

/* ── Checkout form ── */
export interface CheckoutFormState {
  leadPassenger: Record<string, string>
  participants: Array<Record<string, string>>
  phoneCountryCode: string
  couponCodes: Record<string, string>
  paymentMethodId: string
  acceptedTerms: boolean
  specialRequests: string
}

/* ── Full app state ── */
export interface BookingState {
  offer: OfferSummary
  offerMeta: OfferMeta
  travellers: TravellersState
  calendar: CalendarData
  accommodations: AccommodationOption[]
  activities: ActivityOption[]
  activitiesBasePrice: number
  flights: FlightOption[]
  cars: CarOption[]
  carExtrasByCarId: Record<string, CarExtra[]>
  checkout: CheckoutData | null
  payload: BookingPayload
  receipt: ReceiptData | null
  receiptLoading: boolean
  accommodationsLoading: boolean
  activitiesLoading: boolean
  steps: StepDefinition[]
  currentStepIndex: number
  completedStepIds: StepId[]
  mobileReceiptOpen: boolean
  flightSearch: FlightSearchState
  carSearch: CarSearchState
  carExtrasLoadingForId?: string
  checkoutForm: CheckoutFormState
}

/* ── Bootstrap data (server → client) ── */
export interface BootstrapData {
  sessionId: string
  offer: OfferSummary
  offerMeta: OfferMeta
  calendar: CalendarData
  initialCalendarSelection: {
    departureAirports?: string[]
    packageGroup?: string
  }
}
