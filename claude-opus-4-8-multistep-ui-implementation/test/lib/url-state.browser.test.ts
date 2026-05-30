import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  encodeSnapshot,
  decodeSnapshot,
  snapshotFromState,
  writeSnapshotToUrl,
  readSnapshotFromUrl,
  UrlSnapshot,
} from "@/lib/booking/url-state";
import { BookingPayload } from "@/lib/booking/types";

const snap: UrlSnapshot = {
  sid: "se-1",
  step: "rooms",
  people: [{}, {}],
  groups: [{ people: [0, 1] }],
  departureAirports: ["LHR"],
  packageGroup: "pg1",
  nights: 7,
  selectedDate: "2026-01-10",
  tourUnit: null,
  products: [{ id: "A:1" }],
  coupons: ["X"],
  numOfInstalments: 1,
  nightsFilter: null,
};

describe("encode/decode snapshot (browser)", () => {
  it("round-trips through base64url", () => {
    const encoded = encodeSnapshot(snap);
    expect(encoded).not.toMatch(/[+/=]/); // url-safe alphabet only
    expect(decodeSnapshot(encoded)).toEqual(snap);
  });

  it("returns null for malformed base64/json", () => {
    expect(decodeSnapshot("!!!notbase64!!!")).toBeNull();
  });

  it("returns null when required keys are missing", () => {
    const encoded = encodeSnapshot({ foo: "bar" } as unknown as UrlSnapshot);
    expect(decodeSnapshot(encoded)).toBeNull();
  });
});

describe("snapshotFromState", () => {
  it("projects payload + step + nights filter", () => {
    const payload: BookingPayload = {
      offerId: "o",
      sessionId: "se-1",
      people: [{}, {}],
      groups: [{ people: [0, 1] }],
      departureAirports: ["LHR"],
      packageGroup: "pg1",
      nights: 7,
      selectedDate: "2026-01-10",
      tourUnit: null,
      products: [{ id: "A:1" }],
      coupons: ["X"],
      numOfInstalments: 1,
    };
    expect(snapshotFromState(payload, "rooms", null)).toEqual(snap);
  });
});

describe("url read/write (browser)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/offers/o");
  });
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("writes the snapshot to ?b and reads it back", () => {
    writeSnapshotToUrl(snap);
    expect(window.location.search).toContain("b=");
    expect(readSnapshotFromUrl()).toEqual(snap);
  });

  it("returns null when no ?b param is present", () => {
    expect(readSnapshotFromUrl()).toBeNull();
  });

  it("treats an undefined window as the server (no-op write, null read)", () => {
    const realWindow = globalThis.window;
    // @ts-expect-error - simulate a server (no DOM) context
    delete globalThis.window;
    try {
      expect(() => writeSnapshotToUrl(snap)).not.toThrow();
      expect(readSnapshotFromUrl()).toBeNull();
    } finally {
      globalThis.window = realWindow;
    }
  });
});
