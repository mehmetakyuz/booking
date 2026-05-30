import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("@/lib/booking/context", () => ({ useBooking: vi.fn() }));
import { useBooking } from "@/lib/booking/context";
import ActivitiesStep from "@/components/steps/ActivitiesStep";
import { makeCtx } from "../helpers";
import * as fx from "../fixtures";

const mockUse = vi.mocked(useBooking);
beforeEach(() => mockUse.mockReturnValue(makeCtx()));

describe("ActivitiesStep", () => {
  it("shows a loading state while activities load", () => {
    mockUse.mockReturnValue(makeCtx({ activitiesLoading: true }));
    render(<ActivitiesStep />);
    expect(screen.getByText(/Loading activities/)).toBeInTheDocument();
  });

  it("shows a loading state when activities are null", () => {
    mockUse.mockReturnValue(makeCtx({ activities: null }));
    render(<ActivitiesStep />);
    expect(screen.getByText(/Loading activities/)).toBeInTheDocument();
  });

  it("renders an optional excursion group with a No-thanks control", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    render(<ActivitiesStep />);
    expect(screen.getByText(/Optional excursion/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("City tour"));
    expect(ctx.selectActivityUnit).toHaveBeenCalledWith("L:g1", "L:1");
    fireEvent.click(screen.getByText("No thanks"));
    expect(ctx.removeActivity).toHaveBeenCalledWith("L:g1");
  });

  it("renders an included group with a choose-option hint and badges", () => {
    mockUse.mockReturnValue(
      makeCtx({
        activities: {
          baselinePrice: 100000,
          groups: [
            {
              id: "L:inc",
              price: 0,
              oldPrice: 0,
              selected: true,
              optional: false,
              date: "2026-06-11",
              units: [
                { id: "L:a", price: 0, selected: true, name: "Walking tour", images: [], duration: "PT2H", groupType: "GROUP_TOUR", description: "Nice walk" },
                { id: "L:b", price: 2000, selected: false, name: "Bike tour", images: [] },
              ],
            },
          ],
        },
      }),
    );
    render(<ActivitiesStep />);
    expect(screen.getByText("Choose your preferred option")).toBeInTheDocument();
    expect(screen.getByText("2 hours")).toBeInTheDocument();
    expect(screen.getByText("Group tour")).toBeInTheDocument();
  });

  it("opens and closes the details modal with a gallery", () => {
    mockUse.mockReturnValue(
      makeCtx({
        activities: {
          baselinePrice: 100000,
          groups: [
            {
              id: "L:g1",
              price: 0,
              oldPrice: 0,
              selected: false,
              optional: true,
              date: "2026-06-12",
              units: [
                { id: "L:1", price: 2000, selected: false, name: "City tour", images: ["a.jpg"], duration: "PT2H", groupType: "GROUP_TOUR", description: "See the city" },
              ],
            },
          ],
        },
      }),
    );
    render(<ActivitiesStep />);
    fireEvent.click(screen.getByText("View details"));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("See the city")).toBeInTheDocument();
    expect(dialog.getByAltText("City tour")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close"));
  });

  it("falls back to the unit image when there are no gallery images", () => {
    mockUse.mockReturnValue(
      makeCtx({
        activities: {
          baselinePrice: 100000,
          groups: [
            {
              id: "L:g1",
              price: 0,
              oldPrice: 0,
              selected: false,
              optional: true,
              units: [{ id: "L:1", price: 0, selected: false, name: "Solo", image: "solo.jpg", images: [] }],
            },
          ],
        },
      }),
    );
    render(<ActivitiesStep />);
    fireEvent.click(screen.getByText("View details"));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByAltText("Solo")).toBeInTheDocument();
  });
});
