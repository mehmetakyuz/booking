import { BookingPayload } from "./types";

// First-step inputs. packageGroup "" ("All packages") is a valid internal
// selection but must be omitted from outbound variables.
function airports(p: BookingPayload): string[] | undefined {
  return p.departureAirports && p.departureAirports.length
    ? p.departureAirports
    : undefined;
}

function packageGroupOut(p: BookingPayload): string | undefined {
  return p.packageGroup ? p.packageGroup : undefined;
}

// Calendar takes LIST filter args. The nights *filter* (chip) is distinct from
// the effective receipt nights: when the filter is "All nights" (null), the
// calendar query omits nights entirely.
export function calendarVariables(
  p: BookingPayload,
  nightsFilter: number | null,
  range?: { dateFrom?: string; dateTo?: string },
): Record<string, unknown> {
  const pg = packageGroupOut(p);
  return {
    id: p.offerId,
    people: p.people,
    groups: p.groups,
    departureAirports: airports(p),
    packageGroups: pg ? [pg] : undefined,
    nights: nightsFilter != null ? [nightsFilter] : undefined,
    dateFrom: range?.dateFrom,
    dateTo: range?.dateTo,
  };
}

// dynamicPackage / receipt take SINGULAR filter args. selectedDate -> date.
function dynamicPackageBase(p: BookingPayload): Record<string, unknown> {
  return {
    offerId: p.offerId,
    date: p.selectedDate,
    nights: p.nights != null ? p.nights : undefined,
    departureAirports: airports(p),
    packageGroup: packageGroupOut(p),
    tourUnit: p.tourUnit ?? undefined,
    people: p.people,
    groups: p.groups,
    products: p.products,
  };
}

export function dynamicPackageVariables(
  p: BookingPayload,
): Record<string, unknown> {
  return dynamicPackageBase(p);
}

export function receiptVariables(p: BookingPayload): Record<string, unknown> {
  return {
    ...dynamicPackageBase(p),
    numOfInstalments: p.numOfInstalments ?? undefined,
    coupons: p.coupons && p.coupons.length ? p.coupons : undefined,
    priceSeen: p.priceSeen ?? undefined,
  };
}

// TaskInput.dynamicPackage carries the same singular-form fields.
export function taskDynamicPackage(p: BookingPayload): Record<string, unknown> {
  return dynamicPackageBase(p);
}
