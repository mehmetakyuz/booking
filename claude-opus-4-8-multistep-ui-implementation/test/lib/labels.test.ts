import { describe, expect, it } from "vitest";
import {
  tourTypeLabel,
  cabinClassLabel,
  transmissionLabel,
  carExtraTypeLabel,
  formatDuration,
  durationBetween,
  carExtraPayment,
} from "@/lib/booking/labels";

describe("enum label maps", () => {
  it("maps known tour types and rejects unknown/empty", () => {
    expect(tourTypeLabel("GROUP_TOUR")).toBe("Group tour");
    expect(tourTypeLabel("SELF_GUIDED")).toBe("Self-guided");
    expect(tourTypeLabel("NOPE")).toBeNull();
    expect(tourTypeLabel(null)).toBeNull();
    expect(tourTypeLabel(undefined)).toBeNull();
  });

  it("maps known cabin classes", () => {
    expect(cabinClassLabel("ECONOMY")).toBe("Economy");
    expect(cabinClassLabel("PREMIUM_ECONOMY")).toBe("Premium economy");
    expect(cabinClassLabel("BUSINESS")).toBe("Business");
    expect(cabinClassLabel("FIRST")).toBe("First class");
    expect(cabinClassLabel("UNKNOWN")).toBeNull();
    expect(cabinClassLabel(null)).toBeNull();
  });

  it("maps transmissions", () => {
    expect(transmissionLabel("AUTOMATIC")).toBe("Automatic");
    expect(transmissionLabel("MANUAL")).toBe("Manual");
    expect(transmissionLabel("X")).toBeNull();
    expect(transmissionLabel(null)).toBeNull();
  });

  it("maps car extra types", () => {
    expect(carExtraTypeLabel("INSURANCE")).toBe("Insurance");
    expect(carExtraTypeLabel("PROTECTION")).toBe("Protection");
    expect(carExtraTypeLabel("X")).toBeNull();
    expect(carExtraTypeLabel(undefined)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("returns null for empty or unparseable input", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration("2 hours")).toBeNull();
    expect(formatDuration("PT")).toBeNull(); // matches but no parts
    expect(formatDuration("PT30S")).toBeNull(); // seconds only -> no parts
  });

  it("formats hours and minutes with singular/plural", () => {
    expect(formatDuration("PT2H")).toBe("2 hours");
    expect(formatDuration("PT1H")).toBe("1 hour");
    expect(formatDuration("PT45M")).toBe("45 mins");
    expect(formatDuration("PT1M")).toBe("1 min");
    expect(formatDuration("PT2H30M")).toBe("2 hours 30 mins");
  });
});

describe("durationBetween", () => {
  it("returns null for missing or invalid input", () => {
    expect(durationBetween(undefined, "2026-01-01T10:00:00")).toBeNull();
    expect(durationBetween("2026-01-01T10:00:00", null)).toBeNull();
    expect(durationBetween("nonsense", "2026-01-01T10:00:00")).toBeNull();
    expect(durationBetween("2026-01-01T10:00:00", "also-bad")).toBeNull();
  });

  it("returns null when the end precedes the start", () => {
    expect(
      durationBetween("2026-01-01T12:00:00Z", "2026-01-01T10:00:00Z"),
    ).toBeNull();
  });

  it("formats hours and minutes", () => {
    expect(
      durationBetween("2026-01-01T10:00:00Z", "2026-01-01T12:30:00Z"),
    ).toBe("2h 30m");
  });

  it("omits minutes when whole hours", () => {
    expect(
      durationBetween("2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z"),
    ).toBe("2h");
  });

  it("shows 0m for a zero-length window", () => {
    expect(
      durationBetween("2026-01-01T10:00:00Z", "2026-01-01T10:00:00Z"),
    ).toBe("0m");
  });
});

describe("carExtraPayment", () => {
  it("maps prepayable flag to a label", () => {
    expect(carExtraPayment(true)).toBe("Pay now");
    expect(carExtraPayment(false)).toBe("Pay at desk");
    expect(carExtraPayment(undefined)).toBe("Pay at desk");
  });
});
