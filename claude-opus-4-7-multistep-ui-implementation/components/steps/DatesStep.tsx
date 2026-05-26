"use client";

import { useBooking } from "@/lib/booking/context";
import { Calendar } from "./dates/Calendar";
import { AirportDropdown } from "./dates/AirportDropdown";
import { NightsChips } from "./dates/NightsChips";
import { OccupancyField } from "./dates/OccupancyField";
import { PackageGroupCards } from "./dates/PackageGroupCards";
import { StepFooter } from "./StepFooter";

export function DatesStep() {
  const { state, actions } = useBooking();
  const { calendarLoading, stayValid, receiptLoading } = state;
  const filtersDim = calendarLoading ? "is-loading-dim" : "";

  return (
    <div className="step-panel relative">
      <div className="step-header">
        <h1>When would you like to travel?</h1>
        <p>Choose your party, departure airport and dates.</p>
      </div>

      <div className={`step-section ${filtersDim}`}>
        <div className="step-section__title">Travellers</div>
        <OccupancyField />
      </div>

      {state.calendar && state.calendar.airports.length > 0 && (
        <div className={`step-section ${filtersDim}`}>
          <div className="step-section__title">Departure airport</div>
          <AirportDropdown />
        </div>
      )}

      {state.calendar && state.calendar.packageGroups.length > 1 && (
        <div className={`step-section ${filtersDim}`}>
          <div className="step-section__title">Package</div>
          <PackageGroupCards />
        </div>
      )}

      <div className={`step-section ${filtersDim}`}>
        <div className="step-section__title">Length of stay</div>
        <NightsChips />
      </div>

      <div className="step-section">
        <div className="step-section__title">Select dates</div>
        <Calendar />
      </div>

      <StepFooter
        onContinue={actions.next}
        continueDisabled={!stayValid || receiptLoading || calendarLoading}
      />
    </div>
  );
}
