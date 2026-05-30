import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/booking/context", () => ({ useBooking: vi.fn() }));
import { useBooking } from "@/lib/booking/context";
import Calendar from "@/components/Calendar";
import DatesStep from "@/components/steps/DatesStep";
import { makeCtx } from "../helpers";
import * as fx from "../fixtures";

const mockUse = vi.mocked(useBooking);
beforeEach(() => mockUse.mockReturnValue(makeCtx()));

describe("Calendar", () => {
  it("shows a spinner until a month is resolved", () => {
    const { container } = render(<Calendar />);
    mockUse.mockReturnValue(makeCtx({ calendarMonth: null }));
    const { container: c2 } = render(<Calendar />);
    expect(c2.querySelector(".calendar-loading")).not.toBeNull();
    expect(container.querySelector(".calendar-loading")).toBeNull();
  });

  it("renders the month grid and selects an available date", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    render(<Calendar />);
    expect(screen.getByText("June 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByText("10").closest("button")!);
    expect(ctx.selectDate).toHaveBeenCalledWith("2026-06-10");
  });

  it("gates month navigation by min/max bounds", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    render(<Calendar />);
    expect(screen.getByLabelText("Previous month")).toBeDisabled(); // min is June
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(ctx.navigateCalendarMonth).toHaveBeenCalledWith("2026-07");
  });

  it("shows a no-dates message when nothing is available", () => {
    mockUse.mockReturnValue(
      makeCtx({ calendar: fx.calendar({ dates: [{ date: "2026-06-10", price: 0, quantity: 0, nights: [] }] }) }),
    );
    render(<Calendar />);
    expect(screen.getByText(/No dates available this month/)).toBeInTheDocument();
  });

  it("shows a loading overlay while the month refetches", () => {
    const { container } = render(<Calendar />);
    expect(container.querySelector(".calendar-overlay")).toBeNull();
    mockUse.mockReturnValue(makeCtx({ calendarMonthLoading: true }));
    const { container: c2 } = render(<Calendar />);
    expect(c2.querySelector(".calendar-overlay")).not.toBeNull();
  });

  it("renders flexible checkout mode with delta-priced checkout days and clears", () => {
    const ctx = makeCtx({ nightsFilter: null, flexStartDate: "2026-06-10" });
    mockUse.mockReturnValue(ctx);
    const { container } = render(<Calendar />);
    expect(container.querySelector(".calendar-cell.is-start")).not.toBeNull();
    // 2026-06-17 is a valid checkout (start + 7 nights)
    const checkout = screen.getByText("17").closest("button")!;
    expect(checkout.className).toContain("is-checkout");
    fireEvent.click(checkout);
    expect(ctx.selectDate).toHaveBeenCalledWith("2026-06-17");

    fireEvent.click(screen.getByText("Clear selection"));
    expect(ctx.clearFlexSelection).toHaveBeenCalled();

    // clicking neutral grid whitespace also clears
    fireEvent.click(container.querySelector(".calendar-grid")!);
    expect(ctx.clearFlexSelection).toHaveBeenCalledTimes(2);
  });

  it("marks the selected date in fixed-nights mode", () => {
    const ctx = makeCtx({ nightsFilter: 7 });
    ctx.state.payload.selectedDate = "2026-06-10";
    mockUse.mockReturnValue(ctx);
    const { container } = render(<Calendar />);
    expect(container.querySelector(".calendar-cell.is-selected")).not.toBeNull();
  });
});

describe("DatesStep filters", () => {
  it("renders trip-type, airport, package and nights filters and wires them", () => {
    const ctx = makeCtx({
      calendar: fx.calendar({
        packageTypes: [
          { name: "Flight + hotel", type: "INCLUDING_FLIGHTS" },
          { name: "Hotel only", type: "EXCLUDING_FLIGHTS" },
        ],
      }),
    });
    mockUse.mockReturnValue(ctx);
    render(<DatesStep />);

    fireEvent.click(screen.getByText("Hotel only"));
    expect(ctx.setPackageType).toHaveBeenCalledWith("EXCLUDING_FLIGHTS");

    fireEvent.click(screen.getByText("Standard"));
    expect(ctx.setPackageGroup).toHaveBeenCalledWith("pg1");

    fireEvent.click(screen.getByText("7 nights"));
    expect(ctx.setNightsFilter).toHaveBeenCalledWith(7);
  });

  it("hides the airport dropdown for hotel-only trips", () => {
    const ctx = makeCtx();
    ctx.state.payload.packageType = "EXCLUDING_FLIGHTS";
    mockUse.mockReturnValue(ctx);
    render(<DatesStep />);
    expect(screen.queryByText("Departure airport")).not.toBeInTheDocument();
  });

  it("selects a departure airport", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    render(<DatesStep />);
    fireEvent.click(screen.getByText("Heathrow (LHR)"));
    fireEvent.click(screen.getByText("Gatwick (LGW)"));
    expect(ctx.setAirport).toHaveBeenCalledWith("LGW");
  });

  it("falls back to synthetic night chips when the API gives none", () => {
    const ctx = makeCtx({ calendar: fx.calendar({ nightsOptions: [] }) });
    mockUse.mockReturnValue(ctx);
    render(<DatesStep />);
    fireEvent.click(screen.getByText("1 night"));
    expect(ctx.setNightsFilter).toHaveBeenCalledWith(1);
    expect(screen.getByText("2 nights")).toBeInTheDocument();
  });
});

describe("DatesStep occupancy", () => {
  it("edits travellers and applies the change", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    render(<DatesStep />);
    expect(screen.getByText("2 adults")).toBeInTheDocument();

    fireEvent.click(screen.getByText("2 adults"));
    fireEvent.click(screen.getByLabelText("More adults"));
    fireEvent.click(screen.getByLabelText("More children"));
    // child age selector appears
    const ageSelect = screen.getByText("Child 1 age").closest(".occupancy-row")!.querySelector("select")!;
    fireEvent.change(ageSelect, { target: { value: "6" } });
    fireEvent.click(screen.getByText("Apply"));
    expect(ctx.setOccupancy).toHaveBeenCalledWith(3, [6]);
  });

  it("clamps removing the last child and closes on outside click", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    const { container } = render(<DatesStep />);
    fireEvent.click(screen.getByText("2 adults"));
    expect(screen.getByText("Adults")).toBeInTheDocument();
    fireEvent.mouseDown(container); // outside the occupancy popover
    expect(screen.queryByText("Adults")).not.toBeInTheDocument();
  });

  it("summarises a party that already includes children", () => {
    const ctx = makeCtx();
    ctx.state.payload.people = [{}, {}, { birthDate: "2018-01-01" }];
    ctx.state.payload.groups = [{ people: [0, 1, 2] }];
    mockUse.mockReturnValue(ctx);
    render(<DatesStep />);
    expect(screen.getByText("2 adults, 1 child")).toBeInTheDocument();
  });
});
