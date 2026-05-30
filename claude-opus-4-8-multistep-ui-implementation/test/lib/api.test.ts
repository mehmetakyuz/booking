import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the transport: every api function is exercised through gql().
vi.mock("@/lib/graphql/client", () => ({ gql: vi.fn() }));

import { gql } from "@/lib/graphql/client";
import {
  fetchOffer,
  fetchCalendar,
  fetchReceipt,
  fetchAccommodations,
  fetchActivities,
  searchFlights,
  searchCars,
  fetchCarExtras,
  fetchCheckoutMeta,
  createOrder,
  TaskGroupError,
} from "@/lib/booking/api";
import { BookingPayload } from "@/lib/booking/types";
import {
  START_TASK_GROUP,
  POLL_TASK_GROUP,
} from "@/lib/graphql/queries";

const gqlMock = vi.mocked(gql);

function payload(over: Partial<BookingPayload> = {}): BookingPayload {
  return {
    offerId: "off-1",
    sessionId: "se-1",
    people: [{}, {}],
    groups: [{ people: [0, 1] }],
    products: [{ id: "A:1" }, { id: "F:9" }, { id: "C:3" }, { id: "L:2" }],
    ...over,
  };
}

afterEach(() => vi.useRealTimers());

describe("simple query wrappers", () => {
  it("fetchOffer normalizes the offer", async () => {
    gqlMock.mockResolvedValueOnce({ offer: { id: 7, title: "T" } });
    const meta = await fetchOffer("off-1", "se-1");
    expect(meta.id).toBe("7");
    expect(gqlMock.mock.calls[0][1]).toEqual({ id: "off-1" });
  });

  it("fetchCalendar normalizes calendar data", async () => {
    gqlMock.mockResolvedValueOnce({ offer: { calendar: { minDate: "2026-01-01" } } });
    const cal = await fetchCalendar(payload(), 7, { dateFrom: "a" }, "se-1");
    expect(cal.minDate).toBe("2026-01-01");
  });

  it("fetchReceipt unwraps dynamicPackageReceipt", async () => {
    gqlMock.mockResolvedValueOnce({ dynamicPackageReceipt: { totalPrice: 500 } });
    expect((await fetchReceipt(payload(), "se-1")).totalPrice).toBe(500);
  });

  it("fetchReceipt defaults when receipt key is absent", async () => {
    gqlMock.mockResolvedValueOnce({});
    expect((await fetchReceipt(payload(), "se-1")).totalPrice).toBe(0);
  });

  it("fetchAccommodations strips its own family before querying", async () => {
    gqlMock.mockResolvedValueOnce({ dynamicPackage: { accomodations: [] } });
    await fetchAccommodations(payload(), "se-1");
    const vars = gqlMock.mock.calls[0][1] as { products: { id: string }[] };
    expect(vars.products.find((p) => p.id.startsWith("A:"))).toBeUndefined();
  });

  it("fetchActivities strips the leisure family", async () => {
    gqlMock.mockResolvedValueOnce({ dynamicPackage: { leisures: [] } });
    await fetchActivities(payload(), "se-1");
    const vars = gqlMock.mock.calls[0][1] as { products: { id: string }[] };
    expect(vars.products.find((p) => p.id.startsWith("L:"))).toBeUndefined();
  });

  it("fetchCarExtras passes the product-set id through", async () => {
    gqlMock.mockResolvedValueOnce({ carExtra: { extras: [] } });
    await fetchCarExtras("cps-1", "se-1");
    expect(gqlMock.mock.calls[0][1]).toEqual({ carProductSetId: "cps-1" });
  });

  it("fetchCheckoutMeta normalizes checkout metadata", async () => {
    gqlMock.mockResolvedValueOnce({ dynamicPackage: { maxNrOfInstalments: 3 } });
    expect((await fetchCheckoutMeta(payload(), "se-1")).maxNrOfInstalments).toBe(3);
  });
});

describe("searchFlights task-group orchestration", () => {
  it("runs both task groups then returns flights, stripping the F: family", async () => {
    gqlMock
      .mockResolvedValueOnce({ startTaskGroup: { taskGroupId: "g1" } })
      .mockResolvedValueOnce({ pollTaskGroup: { status: "FINISHED" } })
      .mockResolvedValueOnce({ startTaskGroup: { taskGroupId: "g2" } })
      .mockResolvedValueOnce({ pollTaskGroup: { status: "FINISHED" } })
      .mockResolvedValueOnce({ dynamicPackage: { flights: [{ id: "F:1" }] } });
    const flights = await searchFlights(payload(), "se-1");
    expect(flights[0].id).toBe("F:1");
    const flightsVars = gqlMock.mock.calls[4][1] as { products: { id: string }[] };
    expect(flightsVars.products.find((p) => p.id.startsWith("F:"))).toBeUndefined();
  });

  it("throws when the task group fails to start", async () => {
    gqlMock.mockResolvedValueOnce({ startTaskGroup: {} });
    await expect(searchFlights(payload(), "se-1")).rejects.toBeInstanceOf(TaskGroupError);
    await expect(searchFlights(payload(), "se-1")).rejects.toThrow("Failed to start FLIGHT_SEARCH");
  });

  it("throws when a task group reports FAILED", async () => {
    gqlMock
      .mockResolvedValueOnce({ startTaskGroup: { taskGroupId: "g1" } })
      .mockResolvedValueOnce({ pollTaskGroup: { status: "FAILED" } });
    await expect(searchFlights(payload(), "se-1")).rejects.toThrow("FLIGHT_SEARCH failed");
  });

  it("polls again after an interval while pending", async () => {
    vi.useFakeTimers();
    gqlMock
      .mockResolvedValueOnce({ startTaskGroup: { taskGroupId: "g1" } })
      .mockResolvedValueOnce({ pollTaskGroup: { status: "PENDING" } })
      .mockResolvedValueOnce({ pollTaskGroup: { status: "FINISHED" } })
      .mockResolvedValueOnce({ startTaskGroup: { taskGroupId: "g2" } })
      .mockResolvedValueOnce({ pollTaskGroup: { status: "FINISHED" } })
      .mockResolvedValueOnce({ dynamicPackage: { flights: [{ id: "F:1" }] } });
    const promise = searchFlights(payload(), "se-1");
    await vi.advanceTimersByTimeAsync(1500);
    await expect(promise).resolves.toHaveLength(1);
  });

  it("times out when the deadline passes while still pending", async () => {
    const nowSpy = vi.spyOn(Date, "now");
    // 1st call sets the deadline; subsequent calls are far in the future.
    nowSpy.mockReturnValueOnce(0).mockReturnValue(10_000_000);
    gqlMock
      .mockResolvedValueOnce({ startTaskGroup: { taskGroupId: "g1" } })
      .mockResolvedValueOnce({ pollTaskGroup: { status: "PENDING" } });
    await expect(searchFlights(payload(), "se-1")).rejects.toThrow("FLIGHT_SEARCH timed out");
    nowSpy.mockRestore();
  });
});

describe("searchCars", () => {
  it("runs the car task group and returns cars", async () => {
    gqlMock
      .mockResolvedValueOnce({ startTaskGroup: { taskGroupId: "g1" } })
      .mockResolvedValueOnce({ pollTaskGroup: { status: "FINISHED" } })
      .mockResolvedValueOnce({ dynamicPackage: { cars: [{ id: "C:1" }] } });
    const cars = await searchCars(payload(), "se-1");
    expect(cars[0].id).toBe("C:1");
  });
});

describe("createOrder", () => {
  it("returns continueUrl and restoreUrl on success and appends restore_url property", async () => {
    gqlMock.mockResolvedValueOnce({
      createOrder: {
        result: {
          paymentResult: { continueUrl: "https://pay" },
          order: { restoreUrl: "https://restore" },
          errors: [],
        },
      },
    });
    const res = await createOrder(
      payload({ selectedDate: "2026-01-10", nights: 7, departureAirports: ["LHR"], packageGroup: "pg1", tourUnit: 2 }),
      { paymentMethod: "m1", totalPrice: 1000, restoreUrl: "https://here" },
      "se-1",
    );
    expect(res.continueUrl).toBe("https://pay");
    expect(res.restoreUrl).toBe("https://restore");
    const vars = gqlMock.mock.calls[0][1] as { properties: { key: string; value: string }[] };
    expect(vars.properties).toContainEqual({ key: "restore_url", value: "https://here" });
  });

  it("returns errors and defaults when the result is empty", async () => {
    gqlMock.mockResolvedValueOnce({ createOrder: { result: { errors: [{ message: "bad" }] } } });
    const res = await createOrder(
      payload({ departureAirports: [], properties: [{ key: "x", value: "y" }] }),
      { totalPrice: 0, restoreUrl: "r" },
      "se-1",
    );
    expect(res.errors).toEqual([{ message: "bad" }]);
    expect(res.continueUrl).toBeUndefined();
    expect(res.restoreUrl).toBeUndefined();
  });

  it("defaults errors to an empty array when createOrder result is missing", async () => {
    gqlMock.mockResolvedValueOnce({});
    const res = await createOrder(payload(), { totalPrice: 0, restoreUrl: "r" }, "se-1");
    expect(res.errors).toEqual([]);
  });
});

describe("task group request shape", () => {
  it("sends the task key and polls by group id", async () => {
    gqlMock
      .mockResolvedValueOnce({ startTaskGroup: { taskGroupId: "g1" } })
      .mockResolvedValueOnce({ pollTaskGroup: { status: "FINISHED" } })
      .mockResolvedValueOnce({ dynamicPackage: { cars: [{ id: "C:1" }] } });
    await searchCars(payload(), "se-1");
    expect(gqlMock.mock.calls[0][0]).toBe(START_TASK_GROUP);
    const startVars = gqlMock.mock.calls[0][1] as { tasks: { key: string }[] };
    expect(startVars.tasks[0].key).toBe("CAR_SEARCH");
    expect(gqlMock.mock.calls[1][0]).toBe(POLL_TASK_GROUP);
    expect(gqlMock.mock.calls[1][1]).toEqual({ taskGroupId: "g1" });
  });
});
