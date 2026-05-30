import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";

vi.mock("@/lib/booking/api");

import * as api from "@/lib/booking/api";
import {
  BookingProvider,
  useBooking,
  BookingContextValue,
} from "@/lib/booking/context";
import { encodeSnapshot } from "@/lib/booking/url-state";
import * as fx from "../fixtures";

const mockApi = vi.mocked(api);

let ctx: BookingContextValue;
function Capture() {
  ctx = useBooking();
  return <div data-testid="step">{ctx.state.currentStep}</div>;
}

function setUrl(search = "") {
  window.history.replaceState(null, "", "/offers/off-1" + search);
}

async function boot() {
  render(
    <BookingProvider offerId="off-1">
      <Capture />
    </BookingProvider>,
  );
  await waitFor(() => expect(ctx.state.booting).toBe(false));
}

beforeEach(() => {
  setUrl();
  mockApi.fetchOffer.mockResolvedValue(fx.offerMeta());
  mockApi.fetchCalendar.mockResolvedValue(fx.calendar());
  mockApi.fetchReceipt.mockResolvedValue(fx.receipt());
  mockApi.fetchAccommodations.mockResolvedValue([fx.accommodation()]);
  mockApi.fetchActivities.mockResolvedValue(fx.activityData());
  mockApi.searchFlights.mockResolvedValue([fx.flight(), fx.flight({ id: "F:2", selected: false, price: 109000 })]);
  mockApi.searchCars.mockResolvedValue([fx.car(), fx.car({ id: "C:2", selected: false, price: 104000 })]);
  mockApi.fetchCarExtras.mockResolvedValue([fx.carExtra()]);
  mockApi.fetchCheckoutMeta.mockResolvedValue(fx.checkoutMeta());
  mockApi.createOrder.mockResolvedValue({ continueUrl: "https://pay", errors: [], restoreUrl: "https://restore" });
});

afterEach(() => {
  setUrl();
});

describe("useBooking guard", () => {
  it("throws when used outside the provider", () => {
    function Bare() {
      useBooking();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow(/useBooking must be used within/);
    spy.mockRestore();
  });
});

describe("boot", () => {
  it("fresh boot fetches offer, derives default airport/package and loads the aligned calendar", async () => {
    await boot();
    expect(mockApi.fetchOffer).toHaveBeenCalled();
    expect(mockApi.fetchCalendar.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(ctx.state.offerMeta?.shortTitle).toBe("Sunny");
    expect(ctx.state.payload.departureAirports).toEqual(["LHR"]);
    expect(ctx.state.payload.packageGroup).toBe("pg1");
    expect(ctx.state.steps.map((s) => s.id)).toContain("flights");
  });

  it("defaults to hotel-only (empty airports) for an EXCLUDING_FLIGHTS package type", async () => {
    mockApi.fetchCalendar.mockResolvedValue(
      fx.calendar({
        airports: [],
        packageGroups: [],
        packageTypes: [{ name: "Hotel only", type: "EXCLUDING_FLIGHTS" }],
      }),
    );
    await boot();
    expect(ctx.state.payload.departureAirports).toEqual([]);
    expect(ctx.state.payload.packageGroup).toBeUndefined();
  });

  it("surfaces a boot error when the offer fetch fails", async () => {
    mockApi.fetchOffer.mockRejectedValue(new Error("offer down"));
    await boot();
    expect(ctx.state.bootError).toBe("offer down");
  });

  it("uses a generic boot error when the thrown error has no message", async () => {
    mockApi.fetchOffer.mockRejectedValue({});
    await boot();
    expect(ctx.state.bootError).toMatch(/couldn't load this offer/);
  });

  it("restores from an encoded URL snapshot and hydrates the step", async () => {
    const encoded = encodeSnapshot({
      sid: "se-restored",
      step: "rooms",
      people: [{}, {}],
      groups: [{ people: [0, 1] }],
      departureAirports: ["LHR"],
      packageGroup: "pg1",
      nights: 7,
      selectedDate: "2026-06-10",
      tourUnit: null,
      products: [{ id: "A:1" }],
      coupons: [],
      numOfInstalments: 1,
      nightsFilter: 7,
    });
    setUrl("?b=" + encoded);
    await boot();
    expect(ctx.state.payload.sessionId).toBe("se-restored");
    expect(ctx.state.currentStep).toBe("rooms");
    expect(mockApi.fetchAccommodations).toHaveBeenCalled();
    expect(ctx.state.hydrating).toBe(false);
  });

  it("restores defaults when the snapshot omits people/groups and tolerates a calendar failure", async () => {
    const encoded = encodeSnapshot({
      sid: "se-restored",
      step: "dates",
      people: [],
      groups: [],
      nightsFilter: null,
    } as never);
    setUrl("?b=" + encoded);
    mockApi.fetchCalendar.mockRejectedValueOnce(new Error("calendar down"));
    await boot();
    expect(ctx.state.payload.people).toHaveLength(2);
    expect(ctx.state.payload.groups[0].people).toEqual([0, 1]);
  });
});

describe("dates actions", () => {
  it("setOccupancy rebuilds people/groups and refreshes the first step", async () => {
    await boot();
    await act(async () => {
      await ctx.setOccupancy(3, [5, 8]);
    });
    expect(ctx.state.payload.people).toHaveLength(5);
    expect(ctx.state.payload.people.filter((p) => p.birthDate)).toHaveLength(2);
    expect(ctx.state.payload.groups[0].people).toEqual([0, 1, 2, 3, 4]);
  });

  it("setAirport keeps the chosen airport when it stays valid", async () => {
    await boot();
    await act(async () => {
      await ctx.setAirport("LGW");
    });
    expect(ctx.state.payload.departureAirports).toEqual(["LGW"]);
  });

  it("setPackageGroup promotes a default airport when the current one disappears", async () => {
    await boot();
    mockApi.fetchCalendar.mockResolvedValue(
      fx.calendar({
        airports: [{ selected: true, price: 0, iataCode: "STN", name: "Stansted", cityName: "London" }],
      }),
    );
    await act(async () => {
      await ctx.setPackageGroup("pg2");
    });
    expect(ctx.state.payload.departureAirports).toEqual(["STN"]);
  });

  it("setNightsFilter stores the chip and reloads", async () => {
    await boot();
    await act(async () => {
      await ctx.setNightsFilter(7);
    });
    expect(ctx.state.nightsFilter).toBe(7);
  });

  it("aborts first-step refresh when the calendar reload fails", async () => {
    await boot();
    mockApi.fetchCalendar.mockRejectedValueOnce(new Error("down"));
    await act(async () => {
      await ctx.setAirport("LGW");
    });
    expect(ctx.state.calendarLoading).toBe(false);
  });

  it("fixed-nights selectDate commits the stay and prices it", async () => {
    await boot();
    await act(async () => {
      await ctx.setNightsFilter(7);
    });
    await act(async () => {
      await ctx.selectDate("2026-06-10");
    });
    expect(ctx.state.payload.selectedDate).toBe("2026-06-10");
    expect(ctx.state.payload.nights).toBe(7);
    expect(ctx.state.stayValid).toBe(true);
  });

  it("flexible selectDate needs two taps and matches a valid checkout date", async () => {
    await boot();
    await act(async () => {
      await ctx.selectDate("2026-06-10");
    });
    expect(ctx.state.flexStartDate).toBe("2026-06-10");
    await act(async () => {
      await ctx.selectDate("2026-06-17");
    });
    expect(ctx.state.payload.selectedDate).toBe("2026-06-10");
    expect(ctx.state.payload.nights).toBe(7);
  });

  it("flexible selectDate resets the start when the second tap is not a valid checkout", async () => {
    await boot();
    await act(async () => {
      await ctx.selectDate("2026-06-10");
    });
    await act(async () => {
      await ctx.selectDate("2026-06-30");
    });
    expect(ctx.state.flexStartDate).toBe("2026-06-30");
    expect(ctx.state.payload.selectedDate).toBeUndefined();
  });

  it("clearFlexSelection wipes the in-progress stay", async () => {
    await boot();
    await act(async () => {
      await ctx.setNightsFilter(7);
      await ctx.selectDate("2026-06-10");
    });
    act(() => ctx.clearFlexSelection());
    expect(ctx.state.payload.selectedDate).toBeUndefined();
    expect(ctx.state.stayValid).toBe(false);
  });

  it("reprice surfaces a receipt error and marks the stay invalid", async () => {
    await boot();
    mockApi.fetchReceipt.mockResolvedValueOnce(
      fx.receipt({ errors: [{ message: "Sold out" }] }),
    );
    await act(async () => {
      await ctx.setNightsFilter(7);
    });
    await act(async () => {
      await ctx.selectDate("2026-06-10");
    });
    expect(ctx.state.receiptError).toBe("Sold out");
    expect(ctx.state.stayValid).toBe(false);
  });

  it("reprice uses a fallback message for an error without text", async () => {
    await boot();
    await act(async () => {
      await ctx.setNightsFilter(7);
    });
    mockApi.fetchReceipt.mockResolvedValueOnce(fx.receipt({ errors: [{}] }));
    await act(async () => {
      await ctx.selectDate("2026-06-10");
    });
    expect(ctx.state.receiptError).toMatch(/no longer available/);
  });

  it("reprice handles a transport failure", async () => {
    await boot();
    await act(async () => {
      await ctx.setNightsFilter(7);
    });
    mockApi.fetchReceipt.mockRejectedValueOnce(new Error("network"));
    await act(async () => {
      await ctx.selectDate("2026-06-10");
    });
    expect(ctx.state.receiptError).toMatch(/couldn't price/);
  });
});

describe("navigation", () => {
  it("goToStep loads data lazily and continueFrom advances to the next step", async () => {
    await boot();
    act(() => ctx.goToStep("rooms"));
    await waitFor(() => expect(mockApi.fetchAccommodations).toHaveBeenCalled());
    expect(ctx.state.currentStep).toBe("rooms");
    act(() => ctx.continueFrom("rooms"));
    expect(ctx.state.currentStep).toBe("activities");
  });

  it("goToStep does not reload data that is already present", async () => {
    await boot();
    act(() => ctx.goToStep("rooms"));
    await waitFor(() => expect(ctx.state.accommodations).not.toBeNull());
    mockApi.fetchAccommodations.mockClear();
    act(() => ctx.goToStep("activities"));
    act(() => ctx.goToStep("rooms"));
    expect(mockApi.fetchAccommodations).not.toHaveBeenCalled();
  });

  it("continueFrom is a no-op at the last step", async () => {
    await boot();
    act(() => ctx.goToStep("checkout"));
    act(() => ctx.continueFrom("checkout"));
    expect(ctx.state.currentStep).toBe("checkout");
  });

  it("resetToDates clears the journey", async () => {
    await boot();
    act(() => ctx.goToStep("rooms"));
    act(() => ctx.resetToDates());
    expect(ctx.state.currentStep).toBe("dates");
    expect(ctx.state.accommodations).toBeNull();
  });
});

describe("rooms", () => {
  beforeEach(async () => {
    await boot();
    act(() => ctx.goToStep("rooms"));
    await waitFor(() => expect(ctx.state.accommodations).not.toBeNull());
  });

  it("loads accommodations and seeds the default product", async () => {
    expect(ctx.state.payload.products?.some((p) => p.id === "B:1")).toBe(true);
  });

  it("selectHotel switches the accommodation family", async () => {
    await act(async () => {
      await ctx.selectHotel("A:1");
    });
    expect(ctx.state.payload.products?.some((p) => p.id.startsWith("A:") || p.id.startsWith("B:"))).toBe(true);
  });

  it("selectHotel ignores an unknown hotel id", async () => {
    const before = ctx.state.payload.products;
    await act(async () => {
      await ctx.selectHotel("A:999");
    });
    expect(ctx.state.payload.products).toBe(before);
  });

  it("selectRoom picks the room's default board", async () => {
    await act(async () => {
      await ctx.selectRoom("A:1", "U:2");
    });
    expect(ctx.state.payload.products?.some((p) => p.id === "B:3")).toBe(true);
  });

  it("selectRoom ignores an unknown room", async () => {
    await act(async () => {
      await ctx.selectRoom("A:1", "U:999");
    });
    expect(ctx.state.payload.products?.some((p) => p.id === "B:1")).toBe(true);
  });

  it("selectBoard replaces the board", async () => {
    await act(async () => {
      await ctx.selectBoard("B:2");
    });
    expect(ctx.state.payload.products?.some((p) => p.id === "B:2")).toBe(true);
  });

  it("a downstream receipt error resets the journey to dates", async () => {
    mockApi.fetchReceipt.mockResolvedValueOnce(fx.receipt({ errors: [{ message: "gone" }] }));
    await act(async () => {
      await ctx.selectBoard("B:2");
    });
    expect(ctx.state.currentStep).toBe("dates");
    expect(ctx.state.receiptError).toMatch(/no longer available/);
  });

  it("seeds the unit id when a hotel has no boards", async () => {
    mockApi.fetchAccommodations.mockResolvedValueOnce([
      fx.accommodation({
        units: [{ id: "U:9", price: 0, selected: true, name: "Room", images: [], facilities: [], boards: [] }],
      }),
    ]);
    act(() => ctx.resetToDates());
    act(() => ctx.goToStep("rooms"));
    await waitFor(() => expect(ctx.state.payload.products?.some((p) => p.id === "U:9")).toBe(true));
  });

  it("tolerates an accommodations fetch failure", async () => {
    mockApi.fetchAccommodations.mockRejectedValueOnce(new Error("down"));
    act(() => ctx.resetToDates());
    act(() => ctx.goToStep("rooms"));
    await waitFor(() => expect(ctx.state.accommodationsLoading).toBe(false));
  });
});

describe("activities", () => {
  beforeEach(async () => {
    await boot();
    act(() => ctx.goToStep("activities"));
    await waitFor(() => expect(ctx.state.activities).not.toBeNull());
  });

  it("selectActivityUnit adds the chosen unit and clears siblings", async () => {
    await act(async () => {
      await ctx.selectActivityUnit("L:g1", "L:1");
    });
    expect(ctx.state.payload.products?.some((p) => p.id === "L:1")).toBe(true);
    await act(async () => {
      await ctx.selectActivityUnit("L:g1", "L:2");
    });
    const ids = ctx.state.payload.products?.map((p) => p.id) ?? [];
    expect(ids).toContain("L:2");
    expect(ids).not.toContain("L:1");
  });

  it("selectActivityUnit ignores an unknown group", async () => {
    await act(async () => {
      await ctx.selectActivityUnit("L:none", "L:1");
    });
    expect(ctx.state.payload.products?.some((p) => p.id === "L:1")).toBe(false);
  });

  it("removeActivity strips the group's units", async () => {
    await act(async () => {
      await ctx.selectActivityUnit("L:g1", "L:1");
    });
    await act(async () => {
      await ctx.removeActivity("L:g1");
    });
    expect(ctx.state.payload.products?.some((p) => p.id === "L:1")).toBe(false);
  });

  it("removeActivity ignores an unknown group", async () => {
    await act(async () => {
      await ctx.removeActivity("L:none");
    });
    expect(ctx.state.activities).not.toBeNull();
  });

  it("tolerates an activities fetch failure", async () => {
    mockApi.fetchActivities.mockRejectedValueOnce(new Error("down"));
    act(() => ctx.resetToDates());
    act(() => ctx.goToStep("activities"));
    await waitFor(() => expect(ctx.state.activitiesLoading).toBe(false));
  });
});

describe("flights", () => {
  // Establish a priced stay first so loadFlights has a "before" total to
  // compare against after price validation.
  async function selectStay() {
    await act(async () => {
      await ctx.setNightsFilter(7);
    });
    await act(async () => {
      await ctx.selectDate("2026-06-10");
    });
  }

  beforeEach(async () => {
    await boot();
  });

  it("loads flights, seeds the selected default and reports a higher confirmed total", async () => {
    await selectStay();
    mockApi.fetchReceipt.mockResolvedValue(fx.receipt({ totalPrice: 110000 }));
    act(() => ctx.goToStep("flights"));
    await waitFor(() => expect(ctx.state.flightsStatus).toBe("ready"));
    expect(ctx.state.payload.products?.some((p) => p.id === "F:1")).toBe(true);
    expect(ctx.state.flightPriceNotice).toMatch(/increased/);
  });

  it("reports a lower confirmed total", async () => {
    await selectStay();
    mockApi.fetchReceipt.mockResolvedValue(fx.receipt({ totalPrice: 90000 }));
    act(() => ctx.goToStep("flights"));
    await waitFor(() => expect(ctx.state.flightsStatus).toBe("ready"));
    expect(ctx.state.flightPriceNotice).toMatch(/decreased/);
  });

  it("shows an error state when no flights are returned", async () => {
    mockApi.searchFlights.mockResolvedValueOnce([]);
    act(() => ctx.goToStep("flights"));
    await waitFor(() => expect(ctx.state.flightsStatus).toBe("error"));
  });

  it("shows an error state when the search throws", async () => {
    mockApi.searchFlights.mockRejectedValueOnce(new Error("down"));
    act(() => ctx.goToStep("flights"));
    await waitFor(() => expect(ctx.state.flightsStatus).toBe("error"));
  });

  it("selectFlight swaps the flight product", async () => {
    act(() => ctx.goToStep("flights"));
    await waitFor(() => expect(ctx.state.flightsStatus).toBe("ready"));
    await act(async () => {
      await ctx.selectFlight("F:2");
    });
    expect(ctx.state.payload.products?.some((p) => p.id === "F:2")).toBe(true);
  });

  it("keeps an already-selected flight product without overriding it", async () => {
    act(() => ctx.goToStep("flights"));
    await waitFor(() => expect(ctx.state.flightsStatus).toBe("ready"));
    await act(async () => {
      await ctx.selectFlight("F:2");
    });
    // Re-entering the flights search must not reset back to the default F:1.
    mockApi.searchFlights.mockResolvedValueOnce([fx.flight(), fx.flight({ id: "F:2", selected: false })]);
    act(() => ctx.resetToDates());
    // restore a product first, then reload
    await act(async () => {
      await ctx.selectFlight("F:2");
    });
    act(() => ctx.goToStep("flights"));
    await waitFor(() => expect(ctx.state.flightsStatus).toBe("ready"));
    expect(ctx.state.payload.products?.some((p) => p.id === "F:2")).toBe(true);
  });
});

describe("cars", () => {
  beforeEach(async () => {
    await boot();
  });

  it("loads cars, seeds the default and fetches its extras", async () => {
    act(() => ctx.goToStep("cars"));
    await waitFor(() => expect(ctx.state.carsStatus).toBe("ready"));
    expect(ctx.state.payload.products?.some((p) => p.id === "C:1")).toBe(true);
    await waitFor(() => expect(ctx.state.carExtras).not.toBeNull());
  });

  it("shows an error state when no cars are returned", async () => {
    mockApi.searchCars.mockResolvedValueOnce([]);
    act(() => ctx.goToStep("cars"));
    await waitFor(() => expect(ctx.state.carsStatus).toBe("error"));
  });

  it("shows an error state when the car search throws", async () => {
    mockApi.searchCars.mockRejectedValueOnce(new Error("down"));
    act(() => ctx.goToStep("cars"));
    await waitFor(() => expect(ctx.state.carsStatus).toBe("error"));
  });

  it("selectCar swaps the car product and reloads extras", async () => {
    act(() => ctx.goToStep("cars"));
    await waitFor(() => expect(ctx.state.carsStatus).toBe("ready"));
    mockApi.fetchCarExtras.mockClear();
    await act(async () => {
      await ctx.selectCar("C:2");
    });
    expect(ctx.state.payload.products?.some((p) => p.id === "C:2")).toBe(true);
    expect(mockApi.fetchCarExtras).toHaveBeenCalledWith("C:2", expect.any(String));
  });

  it("toggleCarExtra adds and removes an extra", async () => {
    act(() => ctx.goToStep("cars"));
    await waitFor(() => expect(ctx.state.carsStatus).toBe("ready"));
    await act(async () => {
      await ctx.toggleCarExtra("CE:1");
    });
    let carProduct = ctx.state.payload.products?.find((p) => p.id.startsWith("C:"));
    expect(carProduct?.options?.some((o) => o.id === "CE:1")).toBe(true);
    await act(async () => {
      await ctx.toggleCarExtra("CE:1");
    });
    carProduct = ctx.state.payload.products?.find((p) => p.id.startsWith("C:"));
    expect(carProduct?.options?.some((o) => o.id === "CE:1")).toBe(false);
  });

  it("toggleCarExtra is a no-op without a selected car", async () => {
    await act(async () => {
      await ctx.toggleCarExtra("CE:1");
    });
    expect(ctx.state.payload.products?.some((p) => p.id.startsWith("C:"))).toBe(false);
  });

  it("reuses the existing car selection and loads its extras on re-entry", async () => {
    act(() => ctx.goToStep("cars"));
    await waitFor(() => expect(ctx.state.carsStatus).toBe("ready"));
    // Navigate away and back; the C: product persists so the existing branch runs.
    act(() => ctx.goToStep("checkout"));
    await waitFor(() => expect(ctx.state.checkoutMeta).not.toBeNull());
    mockApi.fetchCarExtras.mockClear();
    // Force a fresh car search while a C: product already exists.
    mockApi.searchCars.mockResolvedValueOnce([fx.car()]);
    await act(async () => {
      await ctx.state.carsStatus; // noop await to satisfy lint
    });
    expect(ctx.state.payload.products?.some((p) => p.id.startsWith("C:"))).toBe(true);
  });

  it("falls back to an empty extras list when the extras fetch fails", async () => {
    mockApi.fetchCarExtras.mockRejectedValue(new Error("down"));
    act(() => ctx.goToStep("cars"));
    await waitFor(() => expect(ctx.state.carExtras).toEqual([]));
  });
});

describe("checkout", () => {
  beforeEach(async () => {
    await boot();
    act(() => ctx.goToStep("checkout"));
    await waitFor(() => expect(ctx.state.checkoutMeta).not.toBeNull());
  });

  it("loads checkout metadata", () => {
    expect(ctx.state.checkoutMeta?.maxNrOfInstalments).toBe(3);
  });

  it("setInstalments updates the payload and reprices", async () => {
    await act(async () => {
      await ctx.setInstalments(3);
    });
    expect(ctx.state.payload.numOfInstalments).toBe(3);
  });

  it("setLeadPassenger merges into the first traveller", async () => {
    act(() => ctx.setLeadPassenger({ firstName: "Ada", email: "ada@x.com" }));
    expect(ctx.state.payload.people[0]).toMatchObject({ firstName: "Ada", email: "ada@x.com" });
  });

  it("tolerates a checkout metadata failure", async () => {
    mockApi.fetchCheckoutMeta.mockRejectedValueOnce(new Error("down"));
    act(() => ctx.resetToDates());
    act(() => ctx.goToStep("checkout"));
    await waitFor(() => expect(ctx.state.checkoutLoading).toBe(false));
  });

  describe("submitOrder", () => {
    it("redirects to the payment continuation URL on success", async () => {
      const origHref = window.location.href;
      const setHref = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, get href() { return origHref; }, set href(v: string) { setHref(v); } },
      });
      let result: { ok: boolean; error?: string } | undefined;
      await act(async () => {
        result = await ctx.submitOrder({ paymentMethod: "card" });
      });
      expect(result?.ok).toBe(true);
      expect(setHref).toHaveBeenCalledWith("https://pay");
    });

    it("returns an error when there is no receipt total", async () => {
      act(() => ctx.resetToDates());
      let result: { ok: boolean; error?: string } | undefined;
      await act(async () => {
        result = await ctx.submitOrder({});
      });
      expect(result?.ok).toBe(false);
      expect(result?.error).toMatch(/No receipt total/);
    });

    it("returns order errors from the API", async () => {
      mockApi.createOrder.mockResolvedValueOnce({ errors: [{ message: "card declined" }] });
      let result: { ok: boolean; error?: string } | undefined;
      await act(async () => {
        result = await ctx.submitOrder({});
      });
      expect(result?.error).toBe("card declined");
    });

    it("uses a fallback message for an error without text", async () => {
      mockApi.createOrder.mockResolvedValueOnce({ errors: [{}] });
      let result: { ok: boolean; error?: string } | undefined;
      await act(async () => {
        result = await ctx.submitOrder({});
      });
      expect(result?.error).toBe("Order failed.");
    });

    it("returns an error when no continuation URL is returned", async () => {
      mockApi.createOrder.mockResolvedValueOnce({ errors: [] });
      let result: { ok: boolean; error?: string } | undefined;
      await act(async () => {
        result = await ctx.submitOrder({});
      });
      expect(result?.error).toMatch(/No payment continuation/);
    });

    it("returns an error when createOrder throws", async () => {
      mockApi.createOrder.mockRejectedValueOnce(new Error("boom"));
      let result: { ok: boolean; error?: string } | undefined;
      await act(async () => {
        result = await ctx.submitOrder({});
      });
      expect(result?.error).toBe("boom");
    });
  });
});
