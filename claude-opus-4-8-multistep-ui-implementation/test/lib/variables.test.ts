import { describe, expect, it } from "vitest";
import {
  calendarVariables,
  dynamicPackageVariables,
  receiptVariables,
  taskDynamicPackage,
} from "@/lib/booking/variables";
import { BookingPayload } from "@/lib/booking/types";

function payload(over: Partial<BookingPayload> = {}): BookingPayload {
  return {
    offerId: "off-1",
    sessionId: "se-1",
    people: [{}, {}],
    groups: [{ people: [0, 1] }],
    products: [{ id: "A:1" }],
    ...over,
  };
}

describe("calendarVariables", () => {
  it("uses list-form filters and includes a concrete nights filter", () => {
    const v = calendarVariables(
      payload({ departureAirports: ["LHR"], packageGroup: "pg1" }),
      7,
      { dateFrom: "2026-01-01", dateTo: "2026-02-01" },
    );
    expect(v).toMatchObject({
      id: "off-1",
      departureAirports: ["LHR"],
      packageGroups: ["pg1"],
      nights: [7],
      dateFrom: "2026-01-01",
      dateTo: "2026-02-01",
    });
  });

  it("omits packageGroups/nights when 'all', and passes airports through verbatim", () => {
    const v = calendarVariables(
      payload({ departureAirports: undefined, packageGroup: "" }),
      null,
    );
    expect(v.departureAirports).toBeUndefined();
    expect(v.packageGroups).toBeUndefined();
    expect(v.nights).toBeUndefined();
    expect(v.dateFrom).toBeUndefined();
    expect(v.dateTo).toBeUndefined();
  });

  it("passes an explicit empty airport array through (hotel-only signal)", () => {
    const v = calendarVariables(payload({ departureAirports: [] }), null);
    expect(v.departureAirports).toEqual([]);
  });
});

describe("dynamicPackageVariables", () => {
  it("uses singular-form filters and passes through products", () => {
    const v = dynamicPackageVariables(
      payload({
        selectedDate: "2026-01-10",
        nights: 7,
        departureAirports: ["LHR"],
        packageGroup: "pg1",
        tourUnit: 3,
      }),
    );
    expect(v).toMatchObject({
      offerId: "off-1",
      date: "2026-01-10",
      nights: 7,
      departureAirports: ["LHR"],
      packageGroup: "pg1",
      tourUnit: 3,
      products: [{ id: "A:1" }],
    });
  });

  it("omits optional singular filters when unset", () => {
    const v = dynamicPackageVariables(payload({ nights: null }));
    expect(v.nights).toBeUndefined();
    expect(v.tourUnit).toBeUndefined();
    expect(v.packageGroup).toBeUndefined();
    expect(v.departureAirports).toBeUndefined();
  });
});

describe("receiptVariables", () => {
  it("adds instalments, coupons and priceSeen when present", () => {
    const v = receiptVariables(
      payload({
        numOfInstalments: 3,
        coupons: ["SAVE10"],
        priceSeen: "abc",
      }),
    );
    expect(v).toMatchObject({
      numOfInstalments: 3,
      coupons: ["SAVE10"],
      priceSeen: "abc",
    });
  });

  it("omits coupons when empty", () => {
    const v = receiptVariables(payload({ coupons: [] }));
    expect(v.coupons).toBeUndefined();
    expect(v.numOfInstalments).toBeUndefined();
    expect(v.priceSeen).toBeUndefined();
  });
});

describe("taskDynamicPackage", () => {
  it("mirrors the singular dynamicPackage fields", () => {
    const p = payload({ selectedDate: "2026-01-10", nights: 7 });
    expect(taskDynamicPackage(p)).toEqual(dynamicPackageVariables(p));
  });
});
