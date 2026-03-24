import type { PersonInput, PersonGroupsInput, ProductInput, BookingPayload, StepDefinition, OfferMeta } from "./types";

export function newSessionId(): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `se-opus47-${rand}`;
}

export function payloadToVariables(payload: BookingPayload, overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  const vars: Record<string, unknown> = {
    offerId: payload.offerId,
    people: payload.people,
    groups: payload.groups,
  };
  if (payload.selectedDate) vars.date = payload.selectedDate;
  if (payload.nights != null) vars.nights = payload.nights;
  if (payload.departureAirports && payload.departureAirports.length) vars.departureAirports = payload.departureAirports;
  if (payload.tourUnit != null) vars.tourUnit = payload.tourUnit;
  if (payload.packageGroup) vars.packageGroup = payload.packageGroup;
  if (payload.products && payload.products.length) vars.products = payload.products;
  if (overrides) Object.assign(vars, overrides);
  return vars;
}

export function payloadToReceiptVariables(payload: BookingPayload): Record<string, unknown> {
  const vars = payloadToVariables(payload);
  if (payload.numOfInstalments != null) vars.numOfInstalments = payload.numOfInstalments;
  if (payload.deferred != null) vars.deferred = payload.deferred;
  if (payload.paymentMethod) vars.paymentMethod = payload.paymentMethod;
  if (payload.coupons && payload.coupons.length) vars.coupons = payload.coupons;
  if (payload.priceSeen != null) vars.priceSeen = payload.priceSeen;
  if (payload.properties && payload.properties.length) vars.properties = payload.properties;
  return vars;
}

export function stripProductsByPrefix(products: ProductInput[] | undefined, prefix: string): ProductInput[] {
  if (!products) return [];
  return products.filter(p => !p.id.startsWith(prefix));
}

export function replaceProduct(products: ProductInput[], prefix: string, replacement?: ProductInput | ProductInput[]): ProductInput[] {
  const stripped = stripProductsByPrefix(products, prefix);
  if (!replacement) return stripped;
  return stripped.concat(Array.isArray(replacement) ? replacement : [replacement]);
}

export function buildPeople(adults: number, childAges: number[]): { people: PersonInput[]; groups: PersonGroupsInput[] } {
  const people: PersonInput[] = [];
  for (let i = 0; i < adults; i++) people.push({});
  for (const age of childAges) people.push({ age });
  return {
    people,
    groups: [{ people: people.map((_, i) => i) }],
  };
}

export function buildSteps(meta: OfferMeta | undefined): StepDefinition[] {
  const steps: StepDefinition[] = [{ id: "dates", label: "Dates", number: 0 }];
  if (!meta?.isLeisureOnly) steps.push({ id: "rooms", label: "Rooms", number: 0 });
  steps.push({ id: "activities", label: "Activities", number: 0 });
  if (meta?.hasFlights) steps.push({ id: "flights", label: "Flights", number: 0 });
  if (meta?.hasCars) steps.push({ id: "cars", label: "Cars", number: 0 });
  steps.push({ id: "checkout", label: "Confirm & pay", number: 0 });
  return steps.map((s, i) => ({ ...s, number: i + 1 }));
}

export function formatPrice(minor: number | null | undefined, currency = "£"): string {
  if (minor == null) return "—";
  const major = minor / 100;
  const formatted = Number.isInteger(major)
    ? major.toLocaleString("en-GB")
    : major.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency}${formatted}`;
}

export function formatDelta(delta: number | null | undefined, currency = "£"): string {
  if (delta == null) return "";
  if (delta === 0) return `+${currency}0`;
  const sign = delta > 0 ? "+" : "-";
  const abs = Math.abs(delta) / 100;
  const formatted = Number.isInteger(abs)
    ? abs.toLocaleString("en-GB")
    : abs.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${currency}${formatted}`;
}

export function pickSelected<T extends { selected?: boolean }>(items: T[], fallbackFirst = true): T | undefined {
  const sel = items.find(i => i.selected);
  if (sel) return sel;
  return fallbackFirst ? items[0] : undefined;
}
