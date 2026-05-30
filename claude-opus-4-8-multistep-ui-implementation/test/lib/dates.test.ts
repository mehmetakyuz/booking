import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  todayString,
  prevYearMonth,
  nextYearMonth,
  monthDateRange,
  pickInitialMonth,
} from "@/lib/booking/dates";

describe("addDays", () => {
  it("adds days within a month", () => {
    expect(addDays("2026-05-10", 5)).toBe("2026-05-15");
  });

  it("rolls over month and year boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("supports negative offsets", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("zero-pads single-digit months and days", () => {
    expect(addDays("2026-01-05", 0)).toBe("2026-01-05");
  });
});

describe("todayString", () => {
  afterEach(() => vi.useRealTimers());

  it("formats the current date as YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12)); // 5 Jan 2026 local
    expect(todayString()).toBe("2026-01-05");
  });
});

describe("prevYearMonth / nextYearMonth", () => {
  it("steps within a year", () => {
    expect(prevYearMonth("2026-05")).toBe("2026-04");
    expect(nextYearMonth("2026-05")).toBe("2026-06");
  });

  it("wraps across year boundaries", () => {
    expect(prevYearMonth("2026-01")).toBe("2025-12");
    expect(nextYearMonth("2026-12")).toBe("2027-01");
  });
});

describe("monthDateRange", () => {
  it("returns the first and last day of the month", () => {
    expect(monthDateRange("2026-02")).toEqual({ dateFrom: "2026-02-01", dateTo: "2026-02-28" });
    expect(monthDateRange("2026-12")).toEqual({ dateFrom: "2026-12-01", dateTo: "2026-12-31" });
  });
});

describe("pickInitialMonth", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the selected date's month when present", () => {
    expect(pickInitialMonth(null, "2026-09-12")).toBe("2026-09");
  });

  it("defaults to the current month when min date is near", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12));
    expect(pickInitialMonth("2026-06-20")).toBe("2026-06");
  });

  it("jumps to the min date's month when it is far away", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12));
    expect(pickInitialMonth("2026-09-01")).toBe("2026-09");
  });
});
