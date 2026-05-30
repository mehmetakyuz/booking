// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { gql } from "@/lib/graphql/client";

describe("gql transport (server)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GRAPHQL_URL;
  });

  it("hits the configured upstream GRAPHQL_URL directly", async () => {
    process.env.GRAPHQL_URL = "https://api.example/graphql";
    const fetchFn = vi.fn(
      async () =>
        ({ status: 200, json: async () => ({ data: { ok: 1 } }) }) as unknown as Response,
    );
    vi.stubGlobal("fetch", fetchFn);
    await gql("q", {}, "se-1");
    expect(fetchFn.mock.calls[0][0]).toBe("https://api.example/graphql");
  });

  it("throws when GRAPHQL_URL is not configured", async () => {
    await expect(gql("q", {})).rejects.toThrow("GRAPHQL_URL is not configured");
  });
});
