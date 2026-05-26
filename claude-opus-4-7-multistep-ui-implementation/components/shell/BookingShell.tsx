"use client";

import { useState } from "react";
import { useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";
import { Summary } from "@/components/summary/Summary";
import { StepSwitch } from "./StepSwitch";
import { TopRail } from "./TopRail";

export function BookingShell() {
  const { state } = useBooking();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const total = state.receipt?.totalPrice ?? null;

  return (
    <div className="page">
      <TopRail />
      <div className="layout">
        <main className="step-col">
          <StepSwitch />
        </main>
        <aside className="summary-col summary-col--drawer-only">
          <Summary />
        </aside>
      </div>

      {/* Mobile sticky bar with live total */}
      <div className="mobile-summary-bar" onClick={() => setDrawerOpen(true)}>
        <div>
          <div className="mobile-summary-bar__label">Booking total</div>
          <div className="mobile-summary-bar__price">
            {total != null ? formatMoney(total, state.offer.currency) : "—"}
          </div>
        </div>
        <button className="btn btn--secondary">View summary</button>
      </div>

      {drawerOpen && (
        <div className="drawer summary-col--drawer" onClick={() => setDrawerOpen(false)}>
          <div className="drawer__sheet" onClick={(e) => e.stopPropagation()}>
            <Summary onCloseDrawer={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
