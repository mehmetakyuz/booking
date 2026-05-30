import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("@/lib/booking/context", () => ({ useBooking: vi.fn() }));
import { useBooking } from "@/lib/booking/context";
import RoomsStep from "@/components/steps/RoomsStep";
import CarsStep from "@/components/steps/CarsStep";
import { makeCtx } from "../helpers";
import * as fx from "../fixtures";

const mockUse = vi.mocked(useBooking);
beforeEach(() => mockUse.mockReturnValue(makeCtx()));

describe("RoomsStep", () => {
  it("shows a loading state", () => {
    mockUse.mockReturnValue(makeCtx({ accommodationsLoading: true }));
    render(<RoomsStep />);
    expect(screen.getByText(/Finding hotels/)).toBeInTheDocument();
  });

  it("shows an empty state when no hotels are available", () => {
    mockUse.mockReturnValue(makeCtx({ accommodations: [] }));
    render(<RoomsStep />);
    expect(screen.getByText(/No hotels available/)).toBeInTheDocument();
  });

  it("renders hotels, rooms and boards and wires selection", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    render(<RoomsStep />);
    expect(screen.getByText("Hotel Roma")).toBeInTheDocument();
    expect(screen.getByText("Choose your room")).toBeInTheDocument();
    expect(screen.getByText("Choose your meal plan")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hotel Roma"));
    expect(ctx.selectHotel).toHaveBeenCalledWith("A:1");
    fireEvent.click(screen.getByText("Deluxe"));
    expect(ctx.selectRoom).toHaveBeenCalledWith("A:1", "U:2");
    fireEvent.click(screen.getByText("HB"));
    expect(ctx.selectBoard).toHaveBeenCalledWith("B:2");
  });

  it("derives the active selection from the A: board product id", () => {
    // Accommodation family products all carry the "A:" prefix, including board ids.
    const ctx = makeCtx({
      accommodations: [
        fx.accommodation({
          units: [
            {
              id: "A:u1",
              price: 0,
              selected: true,
              name: "Suite",
              images: [],
              facilities: [],
              boards: [
                { id: "A:b1", price: 0, selected: true, name: "BB" },
                { id: "A:b2", price: 5000, selected: false, name: "HB" },
              ],
            },
          ],
        }),
      ],
    });
    ctx.state.payload.products = [{ id: "A:b2" }];
    mockUse.mockReturnValue(ctx);
    const { container } = render(<RoomsStep />);
    expect(container.querySelector(".board-chip.is-selected")?.textContent).toContain("HB");
  });

  it("opens the hotel details modal with gallery, address and facilities", () => {
    render(<RoomsStep />);
    fireEvent.click(screen.getByText("View hotel details"));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Via Roma 1")).toBeInTheDocument();
    expect(dialog.getByText("A nice hotel")).toBeInTheDocument();
    expect(dialog.getByText("WiFi")).toBeInTheDocument();
  });

  it("falls back to the lead image when there are no preview images", () => {
    mockUse.mockReturnValue(
      makeCtx({
        accommodations: [
          fx.accommodation({ imagePreviews: [], image: "lead.jpg", facilities: [], address: undefined, description: undefined, units: [{ id: "U:1", price: 0, selected: true, name: "Room", images: [], facilities: [], boards: [{ id: "B:1", price: 0, selected: true, name: "BB" }] }] }),
        ],
      }),
    );
    render(<RoomsStep />);
    fireEvent.click(screen.getByText("View hotel details"));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByAltText("Hotel Roma")).toBeInTheDocument();
  });
});

describe("CarsStep", () => {
  it("shows a loading state", () => {
    mockUse.mockReturnValue(makeCtx({ carsStatus: "loading" }));
    render(<CarsStep />);
    expect(screen.getByText(/Searching available cars/)).toBeInTheDocument();
  });

  it("shows the no-results recovery on error", () => {
    const ctx = makeCtx({ carsStatus: "error", cars: [] });
    mockUse.mockReturnValue(ctx);
    render(<CarsStep />);
    fireEvent.click(screen.getByRole("button", { name: /Choose different dates/ }));
    expect(ctx.resetToDates).toHaveBeenCalled();
  });

  it("renders cars with badges and selects a car", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    render(<CarsStep />);
    expect(screen.getAllByText("VW Golf").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5 seats").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Manual").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("VW Golf")[1]);
    expect(ctx.selectCar).toHaveBeenCalledWith("C:2");
  });

  it("renders extras with documents and toggles them", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    render(<CarsStep />);
    expect(screen.getByText("GPS")).toBeInTheDocument();
    expect(screen.getByText("Equipment")).toBeInTheDocument();
    expect(screen.getByText("Key facts")).toBeInTheDocument();
    fireEvent.click(screen.getByText("GPS"));
    expect(ctx.toggleCarExtra).toHaveBeenCalledWith("CE:1");
  });

  it("shows the extras loading state", () => {
    mockUse.mockReturnValue(makeCtx({ carExtrasLoading: true }));
    render(<CarsStep />);
    expect(screen.getByText(/Loading extras/)).toBeInTheDocument();
  });

  it("shows the empty extras message", () => {
    mockUse.mockReturnValue(makeCtx({ carExtras: [] }));
    render(<CarsStep />);
    expect(screen.getByText(/No extras available/)).toBeInTheDocument();
  });

  it("renders an icon and 'Car hire' fallback when a car lacks a photo/model", () => {
    mockUse.mockReturnValue(
      makeCtx({
        cars: [fx.car({ id: "C:9", selected: true, vehicle: undefined, pickupLocation: undefined })],
      }),
    );
    const { container } = render(<CarsStep />);
    expect(screen.getByText("Car hire")).toBeInTheDocument();
    expect(container.querySelector(".option-card-media img")).toBeNull();
  });
});
