import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/booking/context", () => ({ useBooking: vi.fn() }));
import { useBooking } from "@/lib/booking/context";
import Summary from "@/components/Summary";
import { ItineraryFull } from "@/components/Itinerary";
import { makeCtx } from "../helpers";
import * as fx from "../fixtures";

const mockUse = vi.mocked(useBooking);
beforeEach(() => mockUse.mockReturnValue(makeCtx()));

describe("ItineraryFull", () => {
  it("renders an empty-state message with no events", () => {
    render(<ItineraryFull events={[]} />);
    expect(screen.getByText(/No itinerary available/)).toBeInTheDocument();
  });

  it("renders specific titles and details for every component type", () => {
    render(
      <ItineraryFull
        events={[
          {
            date: "2026-06-10",
            label: "Day 1",
            components: [
              { type: "accommodation", accommodationName: "Hotel Roma", unitName: "Suite", boardName: "BB", checkinDate: "2026-06-10", checkoutDate: "2026-06-17" },
              { type: "flight", legLabel: "Outbound", segments: [{ airline: "BA" }] },
              { type: "car", carModel: "Golf", pickupLocation: "FCO" },
              { type: "activity", sublabel: "City tour" },
            ],
          },
          // an event with no date/label and components missing their specifics
          {
            components: [
              { type: "accommodation" },
              { type: "flight", sublabel: "Flight sub" },
              { type: "car" },
              { type: "activity" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText("Hotel Roma")).toBeInTheDocument();
    expect(screen.getByText(/Suite · BB · .*10 Jun.*→.*17 Jun/)).toBeInTheDocument();
    expect(screen.getByText("Outbound")).toBeInTheDocument();
    expect(screen.getByText("BA")).toBeInTheDocument();
    expect(screen.getByText("Golf")).toBeInTheDocument();
    expect(screen.getByText("City tour")).toBeInTheDocument();
    // fallback titles for the bare components
    expect(screen.getByText("Accommodation")).toBeInTheDocument();
    expect(screen.getByText("Flight")).toBeInTheDocument();
    expect(screen.getByText("Car hire")).toBeInTheDocument();
    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByText("Flight sub")).toBeInTheDocument();
  });

  it("uses label fallbacks and tolerates invalid/missing dates", () => {
    render(
      <ItineraryFull
        events={[
          {
            date: "not-a-date",
            components: [
              { type: "accommodation", label: "Stay" },
              { type: "flight", label: "Leg" },
              { type: "car", label: "Hire" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText("Stay")).toBeInTheDocument();
    expect(screen.getByText("Leg")).toBeInTheDocument();
    expect(screen.getByText("Hire")).toBeInTheDocument();
  });
});

describe("Summary", () => {
  it("renders nothing without offer meta", () => {
    mockUse.mockReturnValue(makeCtx({ offerMeta: undefined }));
    const { container } = render(<Summary />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders image, location, receipt lines, itinerary and total", () => {
    const { container } = render(<Summary />);
    expect(screen.getByText("Sunny")).toBeInTheDocument();
    expect(screen.getByText("Rome")).toBeInTheDocument();
    expect(screen.getByText("Package")).toBeInTheDocument();
    expect(screen.getByText("Your itinerary")).toBeInTheDocument();
    expect(container.querySelector(".receipt-total-amount")?.textContent).toBe("£1,000");
  });

  it("opens the included, excluded and info modals", () => {
    render(<Summary />);
    fireEvent.click(screen.getByText(/What’s included/));
    expect(screen.getByRole("heading", { name: "What's included" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close"));

    fireEvent.click(screen.getByText(/What’s excluded/));
    expect(screen.getByRole("heading", { name: "What's excluded" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close"));

    fireEvent.click(screen.getByText(/Trip information/));
    expect(screen.getByRole("heading", { name: "Trip information" })).toBeInTheDocument();
  });

  it("shows a receipt error banner", () => {
    mockUse.mockReturnValue(makeCtx({ receiptError: "Sold out" }));
    render(<Summary />);
    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });

  it("shows the loading overlay while repricing", () => {
    const { container } = render(<Summary />);
    mockUse.mockReturnValue(makeCtx({ receiptLoading: true }));
    const { container: c2 } = render(<Summary />);
    expect(c2.querySelector(".summary-receipt.is-loading")).not.toBeNull();
    expect(container.querySelector(".receipt-overlay")).toBeNull();
  });

  it("shows the empty pricing message when there is no receipt", () => {
    mockUse.mockReturnValue(makeCtx({ receipt: null }));
    render(<Summary />);
    expect(screen.getByText(/Choose your dates to see live pricing/)).toBeInTheDocument();
  });

  it("renders sibling text lines and hides itinerary when there are no events", () => {
    mockUse.mockReturnValue(
      makeCtx({
        receipt: fx.receipt({
          events: [],
          lines: [
            { kind: "amount", label: "Base", format: null, amount: 100000 },
            { kind: "text", label: "", format: null, text: "Includes taxes" },
          ],
        }),
      }),
    );
    render(<Summary />);
    expect(screen.getByText("Includes taxes")).toBeInTheDocument();
    expect(screen.queryByText("Your itinerary")).not.toBeInTheDocument();
  });

  it("omits optional chrome and uses the drawer variant", () => {
    mockUse.mockReturnValue(
      makeCtx({
        offerMeta: fx.offerMeta({ image: undefined, location: undefined, includedList: [], excludedList: [], informationList: [] }),
        receipt: fx.receipt({ startDate: undefined, endDate: undefined }),
      }),
    );
    const { container } = render(<Summary variant="drawer" />);
    expect(container.querySelector(".summary--drawer")).not.toBeNull();
    expect(container.querySelector(".summary-image")).toBeNull();
    expect(container.querySelector(".date-block")).toBeNull();
    expect(container.querySelector(".summary-itinerary--scroll")).toBeNull();
  });
});
