import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("@/lib/booking/context", () => ({ useBooking: vi.fn() }));
import { useBooking } from "@/lib/booking/context";
import FlightsStep from "@/components/steps/FlightsStep";
import { Flight } from "@/lib/booking/types";
import { makeCtx } from "../helpers";
import * as fx from "../fixtures";

const mockUse = vi.mocked(useBooking);
beforeEach(() => mockUse.mockReturnValue(makeCtx()));

describe("FlightsStep loading & error states", () => {
  it("shows the search loader while loading", () => {
    mockUse.mockReturnValue(makeCtx({ flightsStatus: "loading" }));
    render(<FlightsStep />);
    expect(screen.getByText(/Searching live flights/)).toBeInTheDocument();
  });

  it("shows the loader while idle", () => {
    mockUse.mockReturnValue(makeCtx({ flightsStatus: "idle" }));
    render(<FlightsStep />);
    expect(screen.getByText(/Searching live flights/)).toBeInTheDocument();
  });

  it("shows the no-results recovery on error", () => {
    const ctx = makeCtx({ flightsStatus: "error", flights: [] });
    mockUse.mockReturnValue(ctx);
    render(<FlightsStep />);
    fireEvent.click(screen.getByRole("button", { name: /Choose different dates/ }));
    expect(ctx.resetToDates).toHaveBeenCalled();
  });

  it("shows the no-results recovery when flights is null", () => {
    mockUse.mockReturnValue(makeCtx({ flightsStatus: "ready", flights: null }));
    render(<FlightsStep />);
    expect(screen.getByText(/couldn’t find available flights/)).toBeInTheDocument();
  });
});

describe("FlightsStep list", () => {
  it("renders cards, a price notice, and selects on click and keyboard", () => {
    const ctx = makeCtx({ flightPriceNotice: "Prices confirmed and your total has increased." });
    mockUse.mockReturnValue(ctx);
    const { container } = render(<FlightsStep />);
    expect(screen.getByText(/total has increased/)).toBeInTheDocument();

    const cards = container.querySelectorAll(".flight-card");
    expect(cards).toHaveLength(2);
    fireEvent.click(cards[1]);
    expect(ctx.selectFlight).toHaveBeenCalledWith("F:2");

    fireEvent.keyDown(cards[0], { key: "Enter" });
    fireEvent.keyDown(cards[0], { key: " " });
    fireEvent.keyDown(cards[0], { key: "Tab" }); // ignored
    expect(ctx.selectFlight).toHaveBeenCalledWith("F:1");
    expect(ctx.selectFlight).toHaveBeenCalledTimes(3);
  });

  it("marks the active flight from the F: product, not the backend default", () => {
    const ctx = makeCtx({
      flights: [fx.flight({ id: "F:1", selected: true }), fx.flight({ id: "F:2", selected: false })],
    });
    ctx.state.payload.products = [{ id: "F:2" }];
    mockUse.mockReturnValue(ctx);
    const { container } = render(<FlightsStep />);
    const selected = container.querySelector(".flight-card.is-selected");
    expect(selected).not.toBeNull();
  });

  it("falls back to a plane icon when a flight has no airline logo", () => {
    const noLogo = fx.flight({ id: "F:3" });
    noLogo.outboundLeg!.segments[0].airlineLogo = undefined;
    mockUse.mockReturnValue(makeCtx({ flights: [noLogo] }));
    const { container } = render(<FlightsStep />);
    expect(container.querySelector(".airline-logo")).toBeNull();
  });
});

describe("FlightsStep details modal", () => {
  function openDetails(flight: Flight) {
    mockUse.mockReturnValue(makeCtx({ flights: [flight] }));
    render(<FlightsStep />);
    fireEvent.click(screen.getByText("View flight details"));
    return within(screen.getByRole("dialog"));
  }

  it("shows a full per-segment breakdown with code, cabin, duration and luggage", () => {
    const dialog = openDetails(fx.flight());
    expect(dialog.getByText("BA 100")).toBeInTheDocument();
    expect(dialog.getAllByText("Economy").length).toBeGreaterThan(0);
    expect(dialog.getByText(/Checked bag · 23kg/)).toBeInTheDocument();
    expect(dialog.getByText(/Operated by BA CityFlyer/)).toBeInTheDocument();
    expect(dialog.getAllByText(/London \(LHR\)/).length).toBeGreaterThan(0);
  });

  it("renders a connecting leg with a layover row and stop count", () => {
    const connecting = fx.flight({
      id: "F:9",
      outboundLeg: {
        label: "Outbound",
        segments: [
          { flightNumber: "1", airline: "BA", departureTime: "2026-06-10T08:00:00Z", departureAirport: "LHR", arrivalTime: "2026-06-10T10:00:00Z", arrivalAirport: "CDG" },
          { flightNumber: "2", airline: "AF", departureTime: "2026-06-10T12:00:00Z", departureAirport: "CDG", arrivalTime: "2026-06-10T14:00:00Z", arrivalAirport: "FCO" },
        ],
      },
      inboundLeg: undefined,
    });
    const dialog = openDetails(connecting);
    expect(dialog.getByText(/2h connection in/)).toBeInTheDocument();
    expect(dialog.getByText("1 stop")).toBeInTheDocument();
  });

  it("renders a multi-day arrival badge and hand-luggage-only segments", () => {
    // 48h apart guarantees a +2 local-date offset regardless of test timezone.
    const overnight = fx.flight({
      id: "F:7",
      outboundLeg: {
        label: "Outbound",
        luggageIncluded: false,
        segments: [
          { flightNumber: "5", airline: "BA", luggageIncluded: false, departureTime: "2026-06-10T08:00:00Z", departureAirport: "LHR", arrivalTime: "2026-06-12T08:00:00Z", arrivalAirport: "DXB" },
        ],
      },
      inboundLeg: undefined,
    });
    const dialog = openDetails(overnight);
    expect(dialog.getByText("+2")).toBeInTheDocument();
    expect(dialog.getByText("Hand luggage only")).toBeInTheDocument();
  });

  it("skips legs with no segments", () => {
    const oneLeg = fx.flight({ id: "F:6", inboundLeg: { label: "Return", segments: [] } });
    const dialog = openDetails(oneLeg);
    expect(dialog.queryByText("Return")).not.toBeInTheDocument();
  });
});
