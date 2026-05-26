"use client";

import { useState } from "react";
import { useBooking } from "@/lib/booking/context";
import { formatMoney } from "@/lib/booking/format";
import { Dropdown } from "@/components/ui/Dropdown";

export function AirportDropdown() {
  const { state, actions } = useBooking();
  const [open, setOpen] = useState(false);
  const airports = state.calendar?.airports ?? [];
  const selected = state.payload.departureAirports?.[0];
  const current = airports.find((a) => a.iataCode === selected);

  if (!airports.length) return null;

  return (
    <Dropdown
      label={current ? `${current.cityName} (${current.iataCode})` : "Select airport"}
      open={open}
      onOpenChange={setOpen}
    >
      {airports.map((a) => (
        <button
          key={a.iataCode}
          className={
            a.iataCode === selected
              ? "dropdown__option dropdown__option--selected"
              : "dropdown__option"
          }
          onClick={() => {
            actions.setAirport(a.iataCode);
            setOpen(false);
          }}
        >
          <span>
            {a.cityName} ({a.iataCode})
          </span>
          {a.price != null && (
            <span className="dropdown__option-price">
              from {formatMoney(a.price, state.offer.currency)}
            </span>
          )}
        </button>
      ))}
    </Dropdown>
  );
}
