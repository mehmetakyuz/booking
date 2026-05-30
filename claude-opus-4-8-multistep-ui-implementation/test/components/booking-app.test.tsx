import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/booking/context", () => ({
  useBooking: vi.fn(),
  BookingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
import { useBooking } from "@/lib/booking/context";
import BookingApp from "@/components/BookingApp";
import { makeCtx } from "../helpers";

const mockUse = vi.mocked(useBooking);
beforeEach(() => mockUse.mockReturnValue(makeCtx()));

describe("BookingApp shell", () => {
  it("shows the boot screen while booting", () => {
    mockUse.mockReturnValue(makeCtx({ booting: true }));
    render(<BookingApp offerId="off-1" />);
    expect(screen.getByText(/Loading your getaway/)).toBeInTheDocument();
  });

  it("shows the boot error", () => {
    mockUse.mockReturnValue(makeCtx({ booting: false, bootError: "Offer unavailable" }));
    render(<BookingApp offerId="off-1" />);
    expect(screen.getByText("Offer unavailable")).toBeInTheDocument();
  });

  it("routes to each step by currentStep", () => {
    const cases: [string, RegExp][] = [
      ["dates", /When would you like to go/],
      ["rooms", /Choose your stay/],
      ["activities", /Make it unforgettable/],
      ["flights", /Choose your flights/],
      ["cars", /Add car hire/],
      ["checkout", /Confirm/],
    ];
    for (const [step, heading] of cases) {
      mockUse.mockReturnValue(makeCtx({ currentStep: step as never }));
      const { unmount } = render(<BookingApp offerId="off-1" />);
      expect(screen.getAllByText(heading).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("renders nothing for an unknown step", () => {
    mockUse.mockReturnValue(makeCtx({ currentStep: "mystery" as never }));
    const { container } = render(<BookingApp offerId="off-1" />);
    expect(container.querySelector(".layout-step")?.children.length).toBe(0);
  });

  it("opens the mobile summary drawer and shows the live total", () => {
    render(<BookingApp offerId="off-1" />);
    expect(screen.getByText("View summary")).toBeInTheDocument();
    fireEvent.click(screen.getByText("View summary"));
    expect(screen.getByRole("heading", { name: "Your booking" })).toBeInTheDocument();
  });

  it("omits the total on the mobile bar when there is no receipt", () => {
    mockUse.mockReturnValue(makeCtx({ receipt: null }));
    const { container } = render(<BookingApp offerId="off-1" />);
    expect(container.querySelector(".mobile-summary-bar strong")).toBeNull();
  });
});
