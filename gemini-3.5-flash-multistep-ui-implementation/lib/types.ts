export interface PersonInput {
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface PersonGroupsInput {
  type: string; // "ADULT" | "CHILD"
  passengerIndices: number[];
  age?: number;
}

export interface ProductInput {
  id: string; // Prefix already included, e.g. "A:..."
  properties?: Array<{ key: string; value: string }>;
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
  packageGroup?: string;
  nights?: number | null;
  selectedDate?: string | null;
  tourUnit?: number | null;

  products?: ProductInput[];
  coupons?: string[];
  numOfInstalments?: number;
  deferred?: boolean;
  properties?: OrderPropertyInput[];
  priceSeen?: string;
}

export interface OfferMeta {
  id: string;
  title: string;
  shortTitle: string;
  image?: {
    url: string;
  };
  gallery?: Array<{
    url: string;
  }>;
  destinationText?: {
    location?: string;
  };
  hasFlights: boolean;
  hasCars: boolean;
  hasAccommodationUnits: boolean;
  isLeisureOnly: boolean;
  selectDate: boolean;
  isRoundtrip: boolean;
  occupancyRules?: {
    minAdults: number;
    maxAdults: number;
    minChildren: number;
    maxChildren: number;
    maxTravellers: number;
  };
  paymentHelpText?: string;
  includedListWithDescriptions?: Array<{
    name: string;
    description: string;
  }>;
  excludedList?: string[];
  informationList?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  currency?: string;
}

export interface ReceiptLine {
  __typename: 'ReceiptLine' | 'ReceiptLineAmount' | 'ReceiptLineText';
  label: string;
  format?: string;
  amount?: number;
  perPerson?: boolean;
  text?: string;
}

export interface ItineraryComponent {
  __typename: string;
  type: string; // normalized
  checkinDate?: string;
  checkoutDate?: string;
  stayNights?: number;
  accommodation?: { name: string };
  unit?: { name: string };
  board?: { name: string };

  // Flight fields
  legLabel?: string;
  airline?: string;
  operatingAirline?: string;
  flightCode?: string;
  cabinClass?: string;
  departureTime?: string;
  departureAirport?: string;
  departureCity?: string;
  arrivalTime?: string;
  arrivalAirport?: string;
  arrivalCity?: string;
  duration?: string;
  luggageChecked?: string;
  luggageHand?: string;

  // Car fields
  model?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  image?: string;
}

export interface ItineraryEvent {
  label: string;
  sublabel: string;
  date: string;
  components: ItineraryComponent[];
}

export interface InstalmentPayment {
  amount: number;
  payBeforeDate: string;
}

export interface ReceiptData {
  title: string;
  totalPrice: number;
  oldPrice?: number;
  discount?: number;
  perPersonPrice?: number;
  startDate?: string;
  endDate?: string;
  nights?: number;
  lines: ReceiptLine[];
  included: Array<{ title: string; price?: number }>;
  excluded: Array<{ title: string; price?: number }>;
  instalmentsPayments?: InstalmentPayment[][];
  cancellationConditions?: string[];
  errors?: Array<{ code?: string; field?: string; message: string }>;
  itinerary?: {
    events: ItineraryEvent[];
  };
}

export interface CalendarDate {
  date: string;
  price: number;
  available: boolean;
  nights: Array<{
    nights: number;
    price: number;
  }>;
}

export interface CalendarMonth {
  name: string;
  year: number;
  dates: CalendarDate[];
}

export interface FacetValue {
  value: string;
  label: string;
  price?: number;
}

export interface CalendarData {
  months: CalendarMonth[];
  departureAirports: FacetValue[];
  packageGroups: FacetValue[];
  nights: FacetValue[];
}

export interface StepDefinition {
  id: number;
  label: string;
  component: string;
  enabled: boolean;
}

export interface Facility {
  name: string;
  icon: string;
}

export interface AccommodationOption {
  id: string;
  name: string;
  description?: string;
  image?: { url: string };
  gallery?: Array<{ url: string }>;
  facilities: Facility[];
  selected: boolean;
  price: number;
  units: AccommodationUnitOption[];
}

export interface AccommodationUnitOption {
  id: string;
  name: string;
  description?: string;
  image?: { url: string };
  price: number;
  selected: boolean;
  boards: AccommodationBoardOption[];
}

export interface AccommodationBoardOption {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

export interface LeisureUnitOption {
  id: string;
  name: string;
  duration?: string; // ISO 8601 string or parsed
  groupType?: string;
  price: number;
  selected: boolean;
}

export interface LeisureOption {
  id: string;
  name: string;
  description?: string;
  image?: { url: string };
  gallery?: Array<{ url: string }>;
  date?: string;
  optional: boolean;
  selected: boolean;
  units: LeisureUnitOption[];
}

export interface FlightLegSegment {
  airline: string;
  operatingAirline?: string;
  flightCode: string;
  cabinClass: string;
  departureTime: string;
  departureAirport: { code: string; city: string; name?: string };
  arrivalTime: string;
  arrivalAirport: { code: string; city: string; name?: string };
  duration?: string;
  luggageChecked?: string;
  luggageHand?: string;
}

export interface FlightLeg {
  label: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  segments: FlightLegSegment[];
}

export interface FlightOption {
  id: string;
  price: number;
  selected: boolean;
  outbound: FlightLeg;
  inbound?: FlightLeg;
  airlineCode?: string;
  airlineName?: string;
}

export interface CarExtraOption {
  id: string;
  name: string;
  description?: string;
  price: { amount: number; currency: string };
  type?: string;
  paymentTiming?: string;
  documentLink?: string;
  selected: boolean;
}

export interface CarOption {
  id: string;
  model: string;
  image?: string;
  price: number;
  selected: boolean;
  pickupLocation: string;
  dropoffLocation: string;
  specifications?: string[];
  extras?: CarExtraOption[];
}

export interface CountryOption {
  code: string;
  name: string;
}

export interface CheckoutMeta {
  countries: CountryOption[];
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  termsMarkdown?: string;
  euDirectiveHtml?: string;
  paymentMethods: Array<{
    id: string;
    name: string;
    logo?: string;
    selected: boolean;
  }>;
}
