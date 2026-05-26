// Explicit enum-to-label maps. Never transform raw enum tokens with generic
// string ops (lowercase/replace underscores); always map deliberately.

const TOUR_TYPE_LABELS: Record<string, string> = {
  GROUP_TOUR: "Group tour",
  INDIVIDUAL: "Private experience",
};

export function tourTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return TOUR_TYPE_LABELS[value] ?? null;
}

const CABIN_CLASS_LABELS: Record<string, string> = {
  ECONOMY: "Economy",
  BUSINESS: "Business",
  FIRST: "First class",
};

export function cabinClassLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return CABIN_CLASS_LABELS[value] ?? null;
}

const TRANSMISSION_LABELS: Record<string, string> = {
  AUTOMATIC: "Automatic",
  MANUAL: "Manual",
};

export function transmissionLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return TRANSMISSION_LABELS[value] ?? null;
}

const CAR_EXTRA_LABELS: Record<string, string> = {
  EXCESS_INSURANCE: "Excess insurance",
  FULL_INSURANCE: "Full protection",
  ADDITIONAL_DRIVER: "Additional driver",
  CHILD_SEAT: "Child seat",
  GPS: "Sat nav",
  BOOSTER_SEAT: "Booster seat",
  WIFI: "In-car Wi-Fi",
};

export function carExtraTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return CAR_EXTRA_LABELS[value] ?? null;
}

// Checkout customer/participant field keys -> human label + input meta.
interface FieldMeta {
  label: string;
  type: "text" | "email" | "tel" | "date" | "select-country" | "select-gender";
}

const CHECKOUT_FIELD_META: Record<string, FieldMeta> = {
  firstName: { label: "First name", type: "text" },
  lastName: { label: "Last name", type: "text" },
  email: { label: "Email address", type: "email" },
  phone: { label: "Phone number", type: "tel" },
  birthDate: { label: "Date of birth", type: "date" },
  gender: { label: "Gender", type: "select-gender" },
  nationality: { label: "Nationality", type: "select-country" },
  country: { label: "Country", type: "select-country" },
  idNumber: { label: "Passport / ID number", type: "text" },
  idValidity: { label: "Document expiry", type: "date" },
  idIssuingCountry: { label: "Issuing country", type: "select-country" },
  zipcode: { label: "Postcode", type: "text" },
  city: { label: "City", type: "text" },
  streetNumber: { label: "Address", type: "text" },
  vatNumber: { label: "VAT number", type: "text" },
};

export function checkoutFieldMeta(key: string): FieldMeta {
  return CHECKOUT_FIELD_META[key] ?? { label: key, type: "text" };
}
