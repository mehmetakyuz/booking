import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/booking/context", () => ({ useBooking: vi.fn() }));
import { useBooking } from "@/lib/booking/context";
import StepNav from "@/components/steps/StepNav";
import TopRail from "@/components/TopRail";
import { makeCtx } from "../helpers";

const mockUse = vi.mocked(useBooking);

beforeEach(() => mockUse.mockReturnValue(makeCtx()));

describe("StepNav", () => {
  it("hides Back on the first step and labels the next step", () => {
    const ctx = makeCtx({ currentStep: "dates" });
    mockUse.mockReturnValue(ctx);
    render(<StepNav stepId="dates" canContinue />);
    expect(screen.queryByText("Back")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Step 2\. Rooms/ }));
    expect(ctx.continueFrom).toHaveBeenCalledWith("dates");
  });

  it("shows Back on later steps and navigates to the previous step", () => {
    const ctx = makeCtx({ currentStep: "rooms" });
    mockUse.mockReturnValue(ctx);
    render(<StepNav stepId="rooms" canContinue />);
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(ctx.goToStep).toHaveBeenCalledWith("dates");
  });

  it("disables continue when the step is incomplete", () => {
    render(<StepNav stepId="dates" canContinue={false} />);
    expect(screen.getByRole("button", { name: /Step 2/ })).toBeDisabled();
  });

  it("uses a custom onContinue handler when provided", () => {
    const ctx = makeCtx();
    mockUse.mockReturnValue(ctx);
    const onContinue = vi.fn();
    render(<StepNav stepId="dates" canContinue onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button", { name: /Step 2/ }));
    expect(onContinue).toHaveBeenCalled();
    expect(ctx.continueFrom).not.toHaveBeenCalled();
  });

  it("renders no next button on the final step", () => {
    mockUse.mockReturnValue(makeCtx({ currentStep: "checkout" }));
    render(<StepNav stepId="checkout" canContinue />);
    expect(screen.queryByText(/Step/)).not.toBeInTheDocument();
  });
});

describe("TopRail", () => {
  it("marks current/complete/future steps and gates clicks by progress", () => {
    const ctx = makeCtx({ currentStep: "activities" });
    mockUse.mockReturnValue(ctx);
    const { container } = render(<TopRail />);
    expect(container.querySelector(".rail-step.is-current")?.textContent).toContain("Activities");
    expect(container.querySelectorAll(".rail-step.is-complete").length).toBeGreaterThan(0);

    // a completed step is clickable
    fireEvent.click(screen.getAllByRole("button", { name: /Dates/ })[0]);
    expect(ctx.goToStep).toHaveBeenCalledWith("dates");

    // a future step is disabled
    const future = container.querySelector(".rail-step.is-future") as HTMLButtonElement;
    expect(future).toBeDisabled();
  });

  it("toggles the mobile step menu and navigates from it", () => {
    const ctx = makeCtx({ currentStep: "rooms" });
    mockUse.mockReturnValue(ctx);
    const { container } = render(<TopRail />);
    fireEvent.click(screen.getByLabelText("Steps"));
    const mobileNav = container.querySelector(".top-rail-steps--mobile")!;
    expect(mobileNav).toBeInTheDocument();
    const datesBtn = Array.from(mobileNav.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Dates"),
    )!;
    fireEvent.click(datesBtn);
    expect(ctx.goToStep).toHaveBeenCalledWith("dates");
    // menu closed after navigating
    expect(container.querySelector(".top-rail-steps--mobile")).toBeNull();
  });

  it("does not navigate from a future step in the mobile menu", () => {
    const ctx = makeCtx({ currentStep: "dates" });
    mockUse.mockReturnValue(ctx);
    const { container } = render(<TopRail />);
    fireEvent.click(screen.getByLabelText("Steps"));
    const mobileNav = container.querySelector(".top-rail-steps--mobile")!;
    const future = Array.from(mobileNav.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Cars"),
    )!;
    fireEvent.click(future);
    expect(ctx.goToStep).not.toHaveBeenCalled();
  });
});
