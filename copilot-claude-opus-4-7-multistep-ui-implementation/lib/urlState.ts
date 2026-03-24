import type { BookingPayload } from "./types";

export interface UrlSnapshot {
  v: 1;
  sid: string;
  step: number;
  people: BookingPayload["people"];
  groups: BookingPayload["groups"];
  airports?: string[];
  pg?: string;
  n?: number | null;
  d?: string;
  tu?: number | null;
  products?: BookingPayload["products"];
  coupons?: string[];
  noi?: number;
  pm?: string;
}

function toBase64Url(s: string): string {
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(s, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  if (typeof atob !== "undefined") return decodeURIComponent(escape(atob(padded)));
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function encodeSnapshot(snap: UrlSnapshot): string {
  return toBase64Url(JSON.stringify(snap));
}

export function decodeSnapshot(encoded: string): UrlSnapshot | null {
  try {
    const json = fromBase64Url(encoded);
    const parsed = JSON.parse(json);
    if (parsed && parsed.v === 1) return parsed as UrlSnapshot;
    return null;
  } catch {
    return null;
  }
}

export function buildSnapshot(payload: BookingPayload, step: number): UrlSnapshot {
  return {
    v: 1,
    sid: payload.sessionId,
    step,
    people: payload.people,
    groups: payload.groups,
    airports: payload.departureAirports,
    pg: payload.packageGroup,
    n: payload.nights ?? null,
    d: payload.selectedDate,
    tu: payload.tourUnit ?? null,
    products: payload.products,
    coupons: payload.coupons,
    noi: payload.numOfInstalments,
    pm: payload.paymentMethod,
  };
}

export function applySnapshot(payload: BookingPayload, snap: UrlSnapshot): BookingPayload {
  return {
    ...payload,
    sessionId: snap.sid || payload.sessionId,
    people: snap.people || payload.people,
    groups: snap.groups || payload.groups,
    departureAirports: snap.airports,
    packageGroup: snap.pg,
    nights: snap.n ?? undefined,
    selectedDate: snap.d,
    tourUnit: snap.tu ?? undefined,
    products: snap.products || [],
    coupons: snap.coupons,
    numOfInstalments: snap.noi,
    paymentMethod: snap.pm,
  };
}
