import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/booking/context", () => ({ useBooking: vi.fn() }));
import { useBooking } from "@/lib/booking/context";
import CheckoutStep from "@/components/steps/CheckoutStep";
import { makeCtx } from "../helpers";
import * as fx from "../fixtures";

const mockUse = vi.mocked(useBooking);
beforeEach(() => mockUse.mockReturnValue(makeCtx()));

describe("CheckoutStep", () => {
  it("shows a loading state", () => {
    mockUse.mockReturnValue(makeCtx({ checkoutLoading: true }));
    render(<CheckoutStep />);
    expect(screen.getByText(/Loading checkout/)).toBeInTheDocument();
  });

  it("renders the lead-passenger form and edits fields", () => {
    const ctx = makeCtx({
      checkoutMeta: fx.checkoutMeta({
        customerFields: ["title", "firstName", "email", "birthDate", "gender", "country", "nationality", "loyaltyId"],
        passportRequired: true,
      }),
    });
    mockUse.mockReturnValue(ctx);
    render(<CheckoutStep />);
    expect(screen.getByText("First name")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("Nationality")).toBeInTheDocument();
    expect(screen.getByText("Loyalty Id")).toBeInTheDocument();
    expect(screen.getByText(/Passport details will be required/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } });
    expect(ctx.setLeadPassenger).toHaveBeenCalledWith({ firstName: "Ada" });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "MR" } });
    expect(ctx.setLeadPassenger).toHaveBeenCalledWith({ title: "MR" });
  });

  it("renders the instalment plan and selects a schedule", () => {
    const ctx = makeCtx({
      receipt: fx.receipt({
        instalmentsPayments: [
          [{ amount: 100000, payBeforeDate: null, deferred: false, percentage: "100%" }],
          [
            { amount: 50000, payBeforeDate: null, deferred: false, percentage: "50%" },
            { amount: 50000, payBeforeDate: "2026-05-01", deferred: false, percentage: "50%" },
          ],
        ],
      }),
    });
    ctx.state.payload.numOfInstalments = 2;
    mockUse.mockReturnValue(ctx);
    render(<CheckoutStep />);
    expect(screen.getByText("Pay in full")).toBeInTheDocument();
    expect(screen.getByText("Due now")).toBeInTheDocument();
    expect(screen.getByText(/Due 1 May 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("3 instalments"));
    expect(ctx.setInstalments).toHaveBeenCalledWith(3);
  });

  it("hides the payment plan when only one instalment is allowed", () => {
    mockUse.mockReturnValue(makeCtx({ checkoutMeta: fx.checkoutMeta({ maxNrOfInstalments: 1 }) }));
    render(<CheckoutStep />);
    expect(screen.queryByText("Payment plan")).not.toBeInTheDocument();
  });

  it("defaults to the flagged payment method and lets the user switch", () => {
    render(<CheckoutStep />);
    const card = screen.getByRole("button", { name: /Card/ });
    expect(card.className).toContain("is-selected");
    fireEvent.click(screen.getByRole("button", { name: /PayPal/ }));
    expect(screen.getByRole("button", { name: /PayPal/ }).className).toContain("is-selected");
  });

  it("renders terms markdown and the EU directive", () => {
    render(<CheckoutStep />);
    expect(screen.getByRole("heading", { name: "Terms" })).toBeInTheDocument();
    expect(screen.getByText("EU directive")).toBeInTheDocument();
  });

  it("submits the order and shows an error when it fails", async () => {
    const ctx = makeCtx({}, { submitOrder: vi.fn().mockResolvedValue({ ok: false, error: "Card declined" }) });
    mockUse.mockReturnValue(ctx);
    render(<CheckoutStep />);
    fireEvent.click(screen.getByRole("button", { name: /Confirm and pay/ }));
    await waitFor(() => expect(screen.getByText("Card declined")).toBeInTheDocument());
  });

  it("shows a generic error when the failure has no message", async () => {
    const ctx = makeCtx({}, { submitOrder: vi.fn().mockResolvedValue({ ok: false }) });
    mockUse.mockReturnValue(ctx);
    render(<CheckoutStep />);
    fireEvent.click(screen.getByRole("button", { name: /Confirm and pay/ }));
    await waitFor(() => expect(screen.getByText("Something went wrong.")).toBeInTheDocument());
  });

  it("keeps the processing label on a successful submit", async () => {
    const ctx = makeCtx({}, { submitOrder: vi.fn().mockResolvedValue({ ok: true }) });
    mockUse.mockReturnValue(ctx);
    render(<CheckoutStep />);
    fireEvent.click(screen.getByRole("button", { name: /Confirm and pay/ }));
    await waitFor(() => expect(screen.getByText("Processing…")).toBeInTheDocument());
  });

  it("disables submit without a valid stay and shows a dash total", () => {
    mockUse.mockReturnValue(makeCtx({ stayValid: false, receipt: null }));
    render(<CheckoutStep />);
    expect(screen.getByRole("button", { name: /Confirm and pay/ })).toBeDisabled();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders without instalment schedule rows when none exist", () => {
    mockUse.mockReturnValue(
      makeCtx({ receipt: fx.receipt({ instalmentsPayments: [] }), checkoutMeta: fx.checkoutMeta({ maxNrOfInstalments: 3 }) }),
    );
    render(<CheckoutStep />);
    expect(screen.queryByText("Due now")).not.toBeInTheDocument();
  });
});
