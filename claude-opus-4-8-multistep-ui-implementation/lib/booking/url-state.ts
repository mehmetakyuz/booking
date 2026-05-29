import { BookingPayload, PersonInput, PersonGroupsInput, ProductInput, StepId } from "./types";

// Compact snapshot encoded into the URL (?b=...). It contains booking state
// only — never cached API response payloads.
export interface UrlSnapshot {
  sid: string;
  step: StepId;
  people: PersonInput[];
  groups: PersonGroupsInput[];
  departureAirports?: string[];
  packageType?: string;
  packageGroup?: string;
  nights?: number | null;
  selectedDate?: string;
  tourUnit?: number | null;
  products?: ProductInput[];
  coupons?: string[];
  numOfInstalments?: number;
  // null nights filter is meaningful (All nights) and distinct from a concrete
  // effective night count, so we persist it explicitly.
  nightsFilter?: number | null;
}

function base64UrlEncode(str: string): string {
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(str, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof window === "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeSnapshot(snap: UrlSnapshot): string {
  return base64UrlEncode(JSON.stringify(snap));
}

export function decodeSnapshot(encoded: string): UrlSnapshot | null {
  try {
    const parsed = JSON.parse(base64UrlDecode(encoded));
    if (parsed && typeof parsed === "object" && parsed.sid && parsed.step) {
      return parsed as UrlSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

export function snapshotFromState(
  payload: BookingPayload,
  step: StepId,
  nightsFilter: number | null,
): UrlSnapshot {
  return {
    sid: payload.sessionId,
    step,
    people: payload.people,
    groups: payload.groups,
    departureAirports: payload.departureAirports,
    packageType: payload.packageType,
    packageGroup: payload.packageGroup,
    nights: payload.nights,
    selectedDate: payload.selectedDate,
    tourUnit: payload.tourUnit,
    products: payload.products,
    coupons: payload.coupons,
    numOfInstalments: payload.numOfInstalments,
    nightsFilter,
  };
}

// Replace URL state without a Next.js navigation (history.replaceState).
export function writeSnapshotToUrl(snap: UrlSnapshot): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("b", encodeSnapshot(snap));
  window.history.replaceState(window.history.state, "", url.toString());
}

export function readSnapshotFromUrl(): UrlSnapshot | null {
  if (typeof window === "undefined") return null;
  const encoded = new URL(window.location.href).searchParams.get("b");
  return encoded ? decodeSnapshot(encoded) : null;
}
