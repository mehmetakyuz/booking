import { afterEach, describe, expect, it, vi } from "vitest";
import { gql } from "@/lib/graphql/client";

function mockFetch(impl: () => Partial<Response> & { json?: () => unknown }) {
  const fn = vi.fn(async () => impl() as unknown as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("gql transport (browser)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts to the same-origin proxy and returns data", async () => {
    const fetchFn = mockFetch(() => ({
      status: 200,
      json: async () => ({ data: { ok: true } }),
    }));
    const data = await gql<{ ok: boolean }>("query", { a: 1 }, "se-1");
    expect(data).toEqual({ ok: true });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/api/graphql");
    expect((init as RequestInit).method).toBe("POST");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["x-tb-sessionid"]).toBe("se-1");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("omits the session header when no sessionId is given", async () => {
    const fetchFn = mockFetch(() => ({
      status: 200,
      json: async () => ({ data: { ok: 1 } }),
    }));
    await gql("query", {});
    const headers = (fetchFn.mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers["x-tb-sessionid"]).toBeUndefined();
  });

  it("throws an HTTP error when the body is not JSON", async () => {
    mockFetch(() => ({
      status: 502,
      json: async () => {
        throw new Error("bad json");
      },
    }));
    await expect(gql("q", {})).rejects.toThrow("GraphQL request failed (HTTP 502)");
  });

  it("throws the first GraphQL error message", async () => {
    mockFetch(() => ({
      status: 200,
      json: async () => ({ errors: [{ message: "boom" }] }),
    }));
    await expect(gql("q", {})).rejects.toThrow("boom");
  });

  it("throws a generic error when the error has no message", async () => {
    mockFetch(() => ({
      status: 200,
      json: async () => ({ errors: [{}] }),
    }));
    await expect(gql("q", {})).rejects.toThrow("GraphQL error");
  });

  it("throws when data is missing", async () => {
    mockFetch(() => ({
      status: 200,
      json: async () => ({}),
    }));
    await expect(gql("q", {})).rejects.toThrow("Missing GraphQL data payload");
  });
});
