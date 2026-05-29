// ---------------------------------------------------------------------------
// Booking payload + GraphQL input types
// ---------------------------------------------------------------------------

export interface PersonInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  title?: string;
}

// PersonGroupsInput maps indices into the `people` array.
export interface PersonGroupsInput {
  people: number[];
}

export interface OptionInput {
  id: string;
  value?: string;
}

export interface ProductInput {
  // Product IDs already include their family prefix (e.g. "A:386917708").
  id: string;
  options?: OptionInput[];
}

export interface OrderPropertyInput {
  key: string;
  value: string;
}

export interface BookingPayload {
  offerId: string;
  sessionId: string;
  offerMeta?: OfferMeta;

  people: PersonInput[];
  groups: PersonGroupsInput[];

  departureAirports?: string[];
  // packageType: "INCLUDING_FLIGHTS" | "EXCLUDING_FLIGHTS" — high-level facet.
  packageType?: string;
  // packageGroup may be "" (the valid "All packages" choice). undefined = unset.
  packageGroup?: string;
  // concrete night count, or null when the "All nights" filter is active
  nights?: number | null;
  selectedDate?: string;
  tourUnit?: number | null;

  products?: ProductInput[];
  coupons?: string[];
  numOfInstalments?: number;
  deferred?: boolean;
  properties?: OrderPropertyInput[];
  priceSeen?: string;
}

// ---------------------------------------------------------------------------
// Offer
// ---------------------------------------------------------------------------

export interface OccupancyRules {
  minAdults: number;
  maxAdults: number;
  minChildren: number;
  maxChildren: number;
  minChildAge: number;
  maxChildAge: number;
}

export interface InfoListItem {
  id: string;
  label: string;
  value: string;
}

export interface IncludedItem {
  name: string;
  description: string;
}

export interface OfferMeta {
  id: string;
  title: string;
  shortTitle: string;
  currency: string;
  selectDate: boolean;
  isRoundtrip: boolean;
  hasFlights: boolean;
  hasCars: boolean;
  hasAccommodationUnits: boolean;
  isLeisureOnly: boolean;
  price: number;
  oldPrice: number;
  paymentHelp?: string;
  image?: string;
  gallery: string[];
  location?: string;
  includedList: IncludedItem[];
  excludedList: string[];
  informationList: InfoListItem[];
  occupancyRules: OccupancyRules;
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarAirport {
  selected: boolean;
  price: number;
  iataCode: string;
  name: string;
  cityName: string;
}

export interface CalendarPackageGroup {
  id: string;
  name: string;
  price: number;
  description: string | null;
}

export interface CalendarPackageType {
  name: string;
  type: string;
}

export interface CalendarNightsOption {
  // null means the "All nights" flexible filter
  nights: number | null;
  price: number;
}

export interface CalendarDateNight {
  nights: number;
  price: number;
}

export interface CalendarDate {
  date: string;
  price: number;
  quantity: number;
  nights: CalendarDateNight[];
}

export interface CalendarData {
  minDate: string | null;
  maxDate: string | null;
  airports: CalendarAirport[];
  packageGroups: CalendarPackageGroup[];
  packageTypes: CalendarPackageType[];
  nightsOptions: CalendarNightsOption[];
  dates: CalendarDate[];
}

// ---------------------------------------------------------------------------
// Receipt
// ---------------------------------------------------------------------------

export type ReceiptLineKind = "amount" | "text" | "plain";

export interface ReceiptLine {
  kind: ReceiptLineKind;
  label: string;
  format: string | null;
  amount?: number;
  perPerson?: number | null;
  text?: string;
}

export interface ReceiptError {
  code?: string;
  field?: string;
  message?: string;
}

export interface InstalmentPayment {
  amount: number;
  payBeforeDate: string | null;
  deferred: boolean;
  percentage: string | null;
}

export interface PaymentMethod {
  id: string;
  name: string;
  shortDescription?: string;
  logo?: string;
  availableInInstalments?: boolean;
  default?: boolean;
}

export type ItineraryType =
  | "accommodation"
  | "flight"
  | "car"
  | "activity"
  | "transfer"
  | "other";

export interface ItineraryFlightSegment {
  airline?: string;
  airlineLogo?: string;
  operatingAirline?: string;
  flightNumber?: string;
  cabinClass?: string;
  luggageIncluded?: boolean;
  luggageAllowance?: string;
  departureTime?: string;
  departureAirport?: string;
  arrivalTime?: string;
  arrivalAirport?: string;
}

export interface ItineraryComponent {
  type: ItineraryType;
  label?: string;
  sublabel?: string;
  // accommodation
  checkinDate?: string;
  checkoutDate?: string;
  stayNights?: number;
  accommodationName?: string;
  unitName?: string;
  boardName?: string;
  // flight
  legLabel?: string;
  segments?: ItineraryFlightSegment[];
  // car
  carModel?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
}

export interface ItineraryEvent {
  label?: string;
  sublabel?: string;
  date?: string;
  components: ItineraryComponent[];
}

export interface ReceiptData {
  title?: string;
  totalPrice: number;
  oldPrice: number;
  discount: number;
  perPersonPrice: number;
  startDate?: string;
  endDate?: string;
  nights?: number;
  lines: ReceiptLine[];
  included: { title: string; price: number }[];
  excluded: { title: string; price: number }[];
  instalmentsPayments: InstalmentPayment[][];
  paymentMethods: PaymentMethod[];
  errors: ReceiptError[];
  events: ItineraryEvent[];
}

// ---------------------------------------------------------------------------
// Accommodation
// ---------------------------------------------------------------------------

export interface Facility {
  icon: string | null;
  name: string;
}

export interface AccommodationBoard {
  id: string;
  price: number;
  selected: boolean;
  name: string;
  description?: string;
  boardTypeCode?: string;
}

export interface AccommodationUnit {
  id: string;
  price: number;
  selected: boolean;
  name: string;
  description?: string;
  image?: string;
  images: string[];
  facilities: Facility[];
  boards: AccommodationBoard[];
}

export interface Accommodation {
  id: string;
  price: number;
  oldPrice: number;
  selected: boolean;
  name: string;
  subTitle?: string;
  description?: string;
  starRating?: number;
  image?: string;
  imagePreviews: string[];
  city?: string;
  country?: string;
  address?: string;
  facilities: Facility[];
  units: AccommodationUnit[];
}

// ---------------------------------------------------------------------------
// Leisure
// ---------------------------------------------------------------------------

export interface LeisureUnit {
  id: string;
  price: number;
  selected: boolean;
  name: string;
  description?: string;
  image?: string;
  images: string[];
  duration?: string | null;
  groupType?: string | null;
}

export interface LeisureGroup {
  id: string;
  price: number;
  oldPrice: number;
  selected: boolean;
  optional: boolean;
  date?: string;
  units: LeisureUnit[];
}

export interface ActivityData {
  baselinePrice: number;
  groups: LeisureGroup[];
}

// ---------------------------------------------------------------------------
// Flights
// ---------------------------------------------------------------------------

export interface FlightSegment {
  flightNumber?: string;
  cabinClass?: string;
  luggageIncluded?: boolean;
  luggageAllowance?: string;
  airline?: string;
  airlineIata?: string;
  airlineLogo?: string;
  operatingAirline?: string;
  departureTime?: string;
  departureAirport?: string;
  departureCity?: string;
  arrivalTime?: string;
  arrivalAirport?: string;
  arrivalCity?: string;
}

export interface FlightLeg {
  label?: string;
  luggageIncluded?: boolean;
  luggageAllowance?: string;
  handLuggageRules?: string;
  segments: FlightSegment[];
}

export interface Flight {
  id: string;
  price: number;
  oldPrice: number;
  selected: boolean;
  cabinClass?: string;
  luggageIncluded?: boolean;
  luggageAllowance?: string;
  outboundLeg?: FlightLeg;
  inboundLeg?: FlightLeg;
}

// ---------------------------------------------------------------------------
// Cars
// ---------------------------------------------------------------------------

export interface CarVehicle {
  modelName?: string;
  minSeats?: number;
  maxSeats?: number;
  doors?: number;
  minBigSuitcases?: number;
  maxBigSuitcases?: number;
  airConditioning?: boolean;
  transmission?: string;
  category?: string;
  photo?: string;
}

export interface Car {
  id: string;
  price: number;
  oldPrice: number;
  selected: boolean;
  productTermsUrl?: string;
  insurance?: string;
  vehicle?: CarVehicle;
  pickupLocation?: string;
  pickupAddress?: string;
  dropoffLocation?: string;
  dropoffAddress?: string;
}

export interface CarExtra {
  id: string;
  name: string;
  currency?: string;
  currencySymbol?: string;
  prePayable?: boolean;
  extraType?: string;
  keyFactsUrl?: string;
  policyDocUrl?: string;
  price: number;
}

// ---------------------------------------------------------------------------
// Checkout metadata
// ---------------------------------------------------------------------------

export interface Country {
  code: string;
  name: string;
}

export interface CheckoutMeta {
  // Backend returns ordered field-name lists, e.g. ["firstName","lastName",...]
  customerFields: string[];
  participantFields: string[];
  passportRequired: boolean;
  namesMustMatchId: boolean;
  mainDriverRequired: boolean;
  maxNrOfInstalments: number;
  euDirectiveText?: string;
  termsMarkdown?: string;
  termsLinks?: string[];
  paymentMethods: PaymentMethod[];
  countries: Country[];
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export type StepId = "dates" | "rooms" | "activities" | "flights" | "cars" | "checkout";

export interface StepDefinition {
  id: StepId;
  label: string;
  index: number; // 1-based display number
}
