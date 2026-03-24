"use client";

import { useState } from "react";
import { useBooking } from "./BookingContext";
import { TopRail } from "./TopRail";
import { Summary } from "./Summary";
import { StepDates } from "./steps/StepDates";
import { StepRooms } from "./steps/StepRooms";
import { StepActivities } from "./steps/StepActivities";
import { StepFlights } from "./steps/StepFlights";
import { StepCars } from "./steps/StepCars";
import { StepCheckout } from "./steps/StepCheckout";
import { formatPrice } from "@/lib/payload";
import { IconClose } from "./icons/Icons";

function StepBody() {
  const { state } = useBooking();
  const step = state.steps[state.currentStepIdx];
  if (!step) return null;
  switch (step.id) {
    case "dates": return <StepDates />;
    case "rooms": return <StepRooms />;
    case "activities": return <StepActivities />;
    case "flights": return <StepFlights />;
    case "cars": return <StepCars />;
    case "checkout": return <StepCheckout />;
    default: return null;
  }
}

export function BookingShell() {
  const { state } = useBooking();
  const [mobileSummary, setMobileSummary] = useState(false);

  return (
    <>
      <TopRail />
      <div className="booking-shell">
        <main className="booking-main">
          <StepBody />
        </main>
        <aside className="booking-aside">
          <Summary />
        </aside>
      </div>

      <div className="mobile-summary-bar">
        <div>
          <div className="mobile-summary-label">Total</div>
          <div className="mobile-summary-price">{state.receipt ? formatPrice(state.receipt.totalPrice) : "—"}</div>
        </div>
        <button type="button" className="link-button" onClick={() => setMobileSummary(true)}>View details</button>
      </div>

      {mobileSummary && (
        <div className="mobile-summary-drawer">
          <button type="button" className="modal-close" onClick={() => setMobileSummary(false)} aria-label="Close">
            <IconClose />
          </button>
          <Summary />
        </div>
      )}
    </>
  );
}
