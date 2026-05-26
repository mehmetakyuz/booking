// ---------------------------------------------------------------------------
// Booking payload (frontend-owned, sent back to the stateless API each call)
// ---------------------------------------------------------------------------

export interface PersonInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  age?: number;
  nationality?: string;
  country?: string;
  [key: string]: unknown;
}

export interface PersonGroupsInput {
  people: number[];
}

export interface OptionInput {
  id: string;
  value?: string;
}

export interface ProductInput {
  id: string; // already prefixed e.g. "A:123", "F:456"
  group?: string;
  options?: OptionInput[];
  specialWishes?: string;
}

export interface OrderProperty {
  name: string;
  value: string;
}

export interface BookingPayload {
  offerId: string;
  sessionId: string;

  people: PersonInput[];
  groups: PersonGroupsInput[];

  departureAirports?: string[];
  // packageGroup may be "" (the valid "All packages" choice). undefined = unset.
  packageGroup?: string;
  // concrete night count, or null when the "All nights" filter is active
  nights?: number | null;
  selectedDate?: string;
  tourUnit?: number | null;

  products: ProductInput[];
  coupons?: string[];
  numOfInstalments?: number;
  deferred?: boolean;
  properties?: OrderProperty[];
  priceSeen?: number | null;
}

// ---------------------------------------------------------------------------
// Offer
// ---------------------------------------------------------------------------

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
  price: number | null;
  oldPrice: number | null;
  image: string | null;
  gallery: string[];
  location: string | null;
  occupancyRules: OccupancyRules;
  included: ServiceInfo[];
  excluded: { title: string }[];
  informationList: InfoItem[];
  paymentHelp: string | null;
}

export interface OccupancyRules {
  minAdults: number;
  maxAdults: number;
  minChildren: number;
  maxChildren: number;
  minChildAge: number;
  maxChildAge: number;
  infantsAllowed: boolean;
  maxInfants: number;
  requireBirthdates: boolean;
  occupantsLabel: string;
}

export interface ServiceInfo {
  name: string;
  description: string;
}

export interface InfoItem {
  id: string;
  label: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarAirport {
  iataCode: string;
  name: string;
  cityName: string;
  price: number | null;
  selected: boolean;
}

export interface CalendarPackageGroup {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  images: string[];
}

export interface CalendarNightOption {
  nights: number | null;
  price: number | null;
}

export interface CalendarDateNight {
  nights: number;
  price: number | null;
}

export interface CalendarDay {
  date: string;
  price: number | null;
  quantity: number;
  nights: CalendarDateNight[];
}

export interface CalendarData {
  minDate: string | null;
  maxDate: string | null;
  airports: CalendarAirport[];
  packageGroups: CalendarPackageGroup[];
  nightOptions: CalendarNightOption[];
  days: CalendarDay[];
}

// ---------------------------------------------------------------------------
// Receipt
// ---------------------------------------------------------------------------

export interface ReceiptLine {
  type: "amount" | "text" | "plain";
  label: string;
  format: string | null;
  amount?: number;
  perPerson?: number | null;
  text?: string;
}

export interface ReceiptIncluded {
  title: string;
  price: number | null;
}

export interface ReceiptExcluded {
  title: string;
  price: number | null;
}

export interface InstalmentPayment {
  amount: number | null;
  payBeforeDate: string | null;
  deferred: boolean;
  percentage: string | null;
}

export type ItineraryComponentType =
  | "accommodation"
  | "flight"
  | "car"
  | "activity"
  | "transfer";

export interface ItineraryComponent {
  type: ItineraryComponentType;
  label: string | null;
  sublabel: string | null;
  // accommodation
  checkinDate?: string | null;
  checkoutDate?: string | null;
  stayNights?: number | null;
  accommodationName?: string | null;
  unitName?: string | null;
  boardName?: string | null;
  // flight
  legLabel?: string | null;
  segments?: FlightSegment[];
  // car
  carModel?: string | null;
  pickupName?: string | null;
  dropoffName?: string | null;
}

export interface ItineraryEvent {
  label: string | null;
  sublabel: string | null;
  date: string | null;
  components: ItineraryComponent[];
}

export interface ReceiptError {
  code: string | null;
  field: string | null;
  message: string | null;
}

export interface PaymentMethod {
  id: string;
  name: string;
  shortDescription: string | null;
  logo: string | null;
  availableInInstalments: boolean;
  default: boolean;
}

export interface ReceiptData {
  title: string | null;
  totalPrice: number | null;
  oldPrice: number | null;
  discount: number | null;
  perPersonPrice: number | null;
  startDate: string | null;
  endDate: string | null;
  nights: number | null;
  lines: ReceiptLine[];
  included: ReceiptIncluded[];
  excluded: ReceiptExcluded[];
  instalmentSchedules: InstalmentPayment[][];
  events: ItineraryEvent[];
  errors: ReceiptError[];
  paymentMethods: PaymentMethod[];
  maxInstalments: number | null;
}

// ---------------------------------------------------------------------------
// Accommodation
// ---------------------------------------------------------------------------

export interface Facility {
  icon: string | null;
  name: string;
}

export interface Board {
  id: string;
  price: number | null;
  selected: boolean;
  name: string;
  description: string | null;
}

export interface AccommodationUnit {
  id: string;
  price: number | null;
  selected: boolean;
  name: string;
  description: string | null;
  image: string | null;
  images: string[];
  boards: Board[];
  facilities: Facility[];
}

export interface Accommodation {
  id: string;
  price: number | null;
  selected: boolean;
  name: string;
  subTitle: string | null;
  description: string | null;
  image: string | null;
  images: string[];
  units: AccommodationUnit[];
  facilities: Facility[];
  starRating: string | null;
  location: string | null;
}

// ---------------------------------------------------------------------------
// Leisure / activities
// ---------------------------------------------------------------------------

export interface LeisureUnit {
  id: string;
  price: number | null;
  selected: boolean;
  name: string;
  description: string | null;
  image: string | null;
  images: string[];
  durationMinutes: number | null;
  groupType: string | null;
}

export interface LeisureGroup {
  id: string;
  price: number | null;
  selected: boolean;
  optional: boolean;
  date: string | null;
  units: LeisureUnit[];
}

export interface LeisureData {
  basePrice: number | null;
  groups: LeisureGroup[];
}

// ---------------------------------------------------------------------------
// Flights
// ---------------------------------------------------------------------------

export interface FlightSegment {
  airlineName: string | null;
  airlineCode: string | null;
  airlineLogo: string | null;
  operatingAirlineName: string | null;
  flightNumber: string | null;
  departTime: string | null;
  departAirport: string | null;
  arriveTime: string | null;
  arriveAirport: string | null;
  cabinClass: string | null;
  luggageIncluded: boolean | null;
  luggageAllowance: string | null;
}

export interface FlightLeg {
  label: string | null;
  segments: FlightSegment[];
  luggageIncluded: boolean | null;
  luggageAllowance: string | null;
}

export interface Flight {
  id: string;
  price: number | null;
  selected: boolean;
  cabinClass: string | null;
  luggageIncluded: boolean | null;
  luggageAllowance: string | null;
  outbound: FlightLeg | null;
  inbound: FlightLeg | null;
  airlineLogo: string | null;
  airlineName: string | null;
}

// ---------------------------------------------------------------------------
// Cars
// ---------------------------------------------------------------------------

export interface Car {
  id: string;
  price: number | null;
  selected: boolean;
  modelName: string | null;
  image: string | null;
  transmission: string | null;
  seats: number | null;
  bags: number | null;
  airConditioning: boolean | null;
  pickupName: string | null;
  dropoffName: string | null;
  productTermsUrl: string | null;
}

export interface CarExtraOption {
  id: string;
  name: string | null;
  price: number | null;
  extraType: string | null;
  prePayable: boolean | null;
  keyFactsUrl: string | null;
  policyDocUrl: string | null;
  currencySymbol: string | null;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface Country {
  code: string;
  name: string;
}

export interface CheckoutMeta {
  customerFields: string[];
  participantFields: string[];
  countries: Country[];
  termsMarkdown: string | null;
  euDirectiveText: string | null;
  maxInstalments: number;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export type StepKey =
  | "dates"
  | "rooms"
  | "activities"
  | "flights"
  | "cars"
  | "checkout";

export interface StepDefinition {
  key: StepKey;
  label: string;
}
