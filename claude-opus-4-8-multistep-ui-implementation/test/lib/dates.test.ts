import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/booking/dates";

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
