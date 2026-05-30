import { describe, expect, it } from "vitest";
import { formatMoney, formatDelta } from "@/lib/booking/format";

describe("formatMoney", () => {
  it("formats whole minor units with no decimals", () => {
    expect(formatMoney(156300)).toBe("£1,563");
  });

  it("shows decimals when the value has a fraction", () => {
    expect(formatMoney(156350)).toBe("£1,563.50");
  });

  it("forces decimals when requested", () => {
    expect(formatMoney(100000, "GBP", { showDecimals: true })).toBe("£1,000.00");
  });

  it("suppresses decimals when explicitly disabled", () => {
    expect(formatMoney(156350, "GBP", { showDecimals: false })).toBe("£1,564");
  });

  it("defaults null/undefined to zero", () => {
    expect(formatMoney(null)).toBe("£0");
    expect(formatMoney(undefined)).toBe("£0");
  });

  it("uses the symbol for known currencies", () => {
    expect(formatMoney(500, "EUR")).toBe("€5");
    expect(formatMoney(500, "USD")).toBe("$5");
  });

  it("falls back to a currency-code prefix for unknown currencies", () => {
    expect(formatMoney(500, "JPY")).toBe("JPY 5");
  });
});

describe("formatDelta", () => {
  it("prefixes a plus for positive and zero deltas", () => {
    expect(formatDelta(8000)).toBe("+£80");
    expect(formatDelta(0)).toBe("+£0");
  });

  it("prefixes a minus for negative deltas", () => {
    expect(formatDelta(-4000)).toBe("-£40");
  });

  it("respects currency", () => {
    expect(formatDelta(-4000, "EUR")).toBe("-€40");
  });
});
