import { BookingPayload } from "./types";

// Compact encoded snapshot stored in a single `s` query param. Contains only
// booking state, never cached API responses.
export interface Snapshot {
  sid: string;
  step: number;
  people: BookingPayload["people"];
  groups: BookingPayload["groups"];
  departureAirports?: string[];
  packageGroup?: string;
  nights?: number | null;
  nightsFilter?: number | null;
  selectedDate?: string;
  products: BookingPayload["products"];
  coupons?: string[];
  numOfInstalments?: number;
}

function b64encode(json: string): string {
  if (typeof window === "undefined") return Buffer.from(json).toString("base64");
  return window.btoa(unescape(encodeURIComponent(json)));
}

function b64decode(s: string): string {
  if (typeof window === "undefined") return Buffer.from(s, "base64").toString();
  return decodeURIComponent(escape(window.atob(s)));
}

export function encodeSnapshot(snap: Snapshot): string {
  return b64encode(JSON.stringify(snap));
}

export function decodeSnapshot(raw: string): Snapshot | null {
  try {
    return JSON.parse(b64decode(raw)) as Snapshot;
  } catch {
    return null;
  }
}

// Update the URL without triggering a Next.js navigation.
export function writeSnapshotToUrl(snap: Snapshot) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("s", encodeSnapshot(snap));
  window.history.replaceState(window.history.state, "", url.toString());
}

export function readSnapshotFromUrl(): Snapshot | null {
  if (typeof window === "undefined") return null;
  const raw = new URL(window.location.href).searchParams.get("s");
  return raw ? decodeSnapshot(raw) : null;
}
