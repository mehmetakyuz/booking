// Central type definitions for the multi-step booking flow.

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
  idType?: string;
  idNumber?: string;
  idValidity?: string;
  idIssuingCountry?: string;
  streetNumber?: string;
  zipcode?: string;
  city?: string;
}

export interface PersonGroupsInput {
  people: number[];
}

export interface ProductInput {
  id: string;
  group?: string;
  options?: { id: string; value?: string }[];
  specialWishes?: string;
}

export interface OrderPropertyInput {
  name: string;
  value: string;
}

export interface OfferMeta {
  hasFlights: boolean;
  hasCars: boolean;
  hasAccommodationUnits: boolean;
  isLeisureOnly: boolean;
  selectDate: boolean;
  isRoundtrip: boolean;
}

export interface OfferData {
  id: number | string;
  title: string;
  shortTitle: string;
  summary?: string | null;
  reasonToLove?: string | null;
  image?: { url: string } | null;
  gallery?: { url: string; title?: string | null }[];
  occupancyRules: {
    minAdults: number;
    maxAdults: number;
    minChildren: number;
    maxChildren: number;
    minChildAge: number;
    maxChildAge: number;
    maxNonAdults?: number;
    infantsAllowed: boolean;
    maxInfants?: number;
  };
  meta: OfferMeta;
  paymentHelp?: string | null;
  termsAndConditions?: {
    text?: string | null;
    markdown?: string | null;
  } | null;
    includedList?: { name: string; description?: string | null }[];
    excludedList?: string[];
    informationList?: { name: string; description: string }[];
  priceNumberOfNights?: number | null;
  destination?: string | null;
}

export interface CalendarAirport {
  iataCode: string;
  name: string;
  selected: boolean;
  price: number | null;
}

export interface CalendarPackageGroupOption {
  id: string;
  name: string;
  description?: string | null;
  price: number | null;
}

export interface CalendarNightsOption {
  nights: number | null;
  price: number | null;
}

export interface CalendarDateEntry {
  date: string;
  price: number | null;
  oldPrice?: number | null;
  quantity?: number | null;
  nights?: { nights: number; price: number | null }[] | null;
}

export interface CalendarData {
  airports: CalendarAirport[];
  packageGroups: CalendarPackageGroupOption[];
  nights: CalendarNightsOption[];
  dates: CalendarDateEntry[];
  minDate?: string | null;
  maxDate?: string | null;
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
  selectedDate?: string;
  tourUnit?: number | null;

  products: ProductInput[];
  coupons?: string[];
  numOfInstalments?: number;
  deferred?: boolean;
  properties?: OrderPropertyInput[];
  priceSeen?: number;

  paymentMethod?: string;
  customer?: PersonInput;
}

export type ReceiptLineFormat = "IMPORTANT" | "SIBLING" | "LINEBREAK" | string;

export interface ReceiptLine {
  __typename: "ReceiptLine" | "ReceiptLineAmount" | "ReceiptLineText";
  label?: string | null;
  format?: ReceiptLineFormat | null;
  readmore?: string | null;
  origin?: string | null;
  amount?: number | null;
  perPerson?: number | null;
  text?: string | null;
}

export interface ReceiptIncluded {
  price: number | null;
  title: string;
  description?: string | null;
}
export interface ReceiptExcluded {
  price: number | null;
  title: string;
  description?: string | null;
}

export interface InstalmentPayment {
  amount: number | null;
  payBeforeDate?: string | null;
  deferred?: boolean | null;
  percentage?: number | null;
}

export interface PaymentMethodData {
  id: string;
  name: string;
  shortDescription?: string | null;
  image?: { url: string } | null;
  availableInInstalments?: boolean;
  inGroup?: boolean;
  default?: boolean;
}

export type ItineraryComponentKind =
  | "flight"
  | "accommodation"
  | "car"
  | "activity"
  | "generic";

export interface ItineraryFlightLeg {
  label?: string | null;
  segments?: FlightSegment[];
  luggageIncluded?: boolean | null;
  luggageAllowance?: string | null;
  handLuggageRules?: string | null;
}

export interface FlightSegment {
  airline?: { iataCode?: string; name?: string; logoUrl?: string | null } | null;
  operatingAirline?: { iataCode?: string; name?: string } | null;
  departure?: { datetime: string; airport: { iataCode: string; name: string; cityName?: string | null } } | null;
  arrival?: { datetime: string; airport: { iataCode: string; name: string; cityName?: string | null } } | null;
  flightnumber?: string | null;
  luggageIncluded?: boolean | null;
  luggageAllowance?: string | null;
  cabinClass?: string | null;
}

export interface ItineraryComponent {
  type: ItineraryComponentKind;
  typename: string;
  icon?: string | null;
  label?: string | null;
  sublabel?: string | null;
  accommodation?: { name: string } | null;
  unit?: { name: string } | null;
  board?: { name: string } | null;
  checkinDate?: string | null;
  checkoutDate?: string | null;
  stayNights?: number | null;
  leg?: ItineraryFlightLeg | null;
  car?: { model?: string; image?: { url: string } | null } | null;
  pickupLocation?: { name?: string | null } | null;
  dropoffLocation?: { name?: string | null } | null;
}

export interface ItineraryEvent {
  label?: string | null;
  sublabel?: string | null;
  date?: string | null;
  components: ItineraryComponent[];
}

export interface ReceiptData {
  title?: string | null;
  totalPrice: number;
  oldPrice?: number | null;
  discount?: number | null;
  perPersonPrice?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  nights?: number | null;
  lines: ReceiptLine[];
  included: ReceiptIncluded[];
  excluded: ReceiptExcluded[];
  errors: { code: string; field?: string | null; message: string }[];
  instalmentsPayments: InstalmentPayment[][];
  maxNrOfInstalments?: number;
  cancellationConditions?: {
    shortTermsDescription?: string | null;
    shortCancellationDescription?: string | null;
    shortPolicyDescription?: string | null;
  } | null;
  itinerary: ItineraryEvent[];
  paymentMethods: PaymentMethodData[];
  euDirectiveText?: string | null;
}

export interface Facility {
  icon?: string | null;
  name?: string | null;
}

export interface AccommodationBoard {
  id: string;
  name: string;
  description?: string | null;
  price: number | null;
  oldPrice?: number | null;
  selected?: boolean;
  boardTypeCode?: string | null;
}

export interface AccommodationUnit {
  id: string;
  unitId?: string | null;
  name: string;
  subTitle?: string | null;
  description?: string | null;
  image?: { url: string } | null;
  images?: { url: string; title?: string | null }[];
  price: number | null;
  oldPrice?: number | null;
  selected?: boolean;
  availableAmount?: number | null;
  boards: AccommodationBoard[];
  facilities?: Facility[];
}

export interface AccommodationOption {
  id: string;
  accommodationId?: string | null;
  name: string;
  subTitle?: string | null;
  description?: string | null;
  image?: { url: string } | null;
  imagePreviews?: { url: string; title?: string | null }[];
  price: number | null;
  oldPrice?: number | null;
  selected?: boolean;
  starRating?: string | null;
  venue?: { name?: string | null; city?: string | null; formattedAddress?: string | null } | null;
  facilities?: Facility[];
  units: AccommodationUnit[];
  checkinDate?: string | null;
  checkoutDate?: string | null;
}

export interface AccommodationsResult {
  accommodations: AccommodationOption[];
  basePrice: number | null;
}

export interface LeisureUnit {
  id: string;
  name: string;
  description?: string | null;
  additionalInformation?: string | null;
  image?: { url: string } | null;
  images?: { url: string; title?: string | null }[];
  price: number | null;
  oldPrice?: number | null;
  selected?: boolean;
  venue?: { name?: string | null } | null;
  duration?: string | number | null;
  startTime?: string | null;
  endTime?: string | null;
  groupType?: string | null;
  groupMinSize?: number | null;
  groupMaxSize?: number | null;
}

export interface LeisureOption {
  id: string;
  price: number | null;
  oldPrice?: number | null;
  selected?: boolean;
  optional: boolean;
  date?: string | null;
  units: LeisureUnit[];
  title?: string | null;
}

export interface LeisureResult {
  leisures: LeisureOption[];
  basePrice: number | null;
}

export interface FlightOption {
  id: string;
  price: number | null;
  oldPrice?: number | null;
  selected?: boolean;
  cabinClass?: string | null;
  outboundLeg?: ItineraryFlightLeg | null;
  inboundLeg?: ItineraryFlightLeg | null;
  luggageIncluded?: boolean | null;
  luggageAllowance?: string | null;
}

export interface CarOption {
  id: string;
  price: number | null;
  oldPrice?: number | null;
  selected?: boolean;
  vehicle?: {
    modelName?: string | null;
    minSeats?: number | null;
    maxSeats?: number | null;
    doors?: string | null;
    transmission?: string | null;
    airConditioning?: boolean | null;
    category?: string | null;
    minBigSuitcases?: number | null;
    minSmallSuitcases?: number | null;
    photo?: { url: string } | null;
  } | null;
  pickupLocation?: { name?: string | null; venue?: { formattedAddress?: string | null } | null; airport?: { iataCode?: string | null; name?: string | null } | null } | null;
  dropoffLocation?: { name?: string | null; venue?: { formattedAddress?: string | null } | null; airport?: { iataCode?: string | null; name?: string | null } | null } | null;
  productTermsUrl?: string | null;
  insurance?: string | null;
}

export interface CarExtraOption {
  id: string;
  name: string;
  price: number | null;
  currency?: string | null;
  prePayable?: boolean | null;
  extraType?: string | null;
  keyFactsUrl?: string | null;
  policyDocUrl?: string | null;
}

export interface CheckoutMeta {
  customerSalesflowDisplayFields: string[];
  participantSalesflowDisplayFields: string[];
  namesMustMatchId?: boolean;
  passportRequired?: boolean;
  mainDriverRequired?: boolean;
  termsMarkdown?: string | null;
  termsText?: string | null;
  euDirectiveText?: string | null;
  paymentMethods: PaymentMethodData[];
  paymentMethodGroups: {
    name?: string | null;
    shortDescription?: string | null;
    logo?: { url: string } | null;
    paymentMethods: PaymentMethodData[];
  }[];
  maxNrOfInstalments: number;
  countries: { code: string; name: string; dialCode?: string | null; nationality?: string | null }[];
}

export interface StepDefinition {
  id: "dates" | "rooms" | "activities" | "flights" | "cars" | "checkout";
  label: string;
  number: number;
}
