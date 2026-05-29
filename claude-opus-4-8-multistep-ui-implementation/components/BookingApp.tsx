"use client";

import { useState } from "react";
import { BookingProvider, useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";
import TopRail from "./TopRail";
import Summary from "./Summary";
import Modal from "./Modal";
import DatesStep from "./steps/DatesStep";
import RoomsStep from "./steps/RoomsStep";
import ActivitiesStep from "./steps/ActivitiesStep";
import FlightsStep from "./steps/FlightsStep";
import CarsStep from "./steps/CarsStep";
import CheckoutStep from "./steps/CheckoutStep";

function StepRouter() {
  const { state } = useBooking();
  switch (state.currentStep) {
    case "dates":
      return <DatesStep />;
    case "rooms":
      return <RoomsStep />;
    case "activities":
      return <ActivitiesStep />;
    case "flights":
      return <FlightsStep />;
    case "cars":
      return <CarsStep />;
    case "checkout":
      return <CheckoutStep />;
    default:
      return null;
  }
}

function Shell() {
  const { state } = useBooking();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { offerMeta, receipt } = state;
  const currency = offerMeta?.currency ?? "GBP";

  if (state.booting) {
    return (
      <div className="boot-screen">
        <span className="spinner spinner--lg" />
        <p>Loading your getaway…</p>
      </div>
    );
  }

  if (state.bootError) {
    return (
      <div className="boot-screen">
        <p className="boot-error">{state.bootError}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <TopRail />
      <main className="layout">
        <section className="layout-step">
          <StepRouter />
        </section>
        <aside className="layout-summary">
          <div className="layout-summary-sticky">
            <Summary />
          </div>
        </aside>
      </main>

      {/* Mobile sticky summary bar */}
      <button className="mobile-summary-bar" onClick={() => setDrawerOpen(true)}>
        <span>View summary</span>
        {receipt ? (
          <strong>{formatMoney(receipt.totalPrice, currency)}</strong>
        ) : null}
      </button>

      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Your booking">
        <Summary variant="drawer" />
      </Modal>
    </div>
  );
}

export default function BookingApp({ offerId }: { offerId: string }) {
  return (
    <BookingProvider offerId={offerId}>
      <Shell />
    </BookingProvider>
  );
}
