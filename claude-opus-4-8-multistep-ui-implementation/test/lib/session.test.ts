import { afterEach, describe, expect, it, vi } from "vitest";
import { createSessionId } from "@/lib/booking/session";

describe("createSessionId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-1234" });
    expect(createSessionId()).toBe("se-uuid-1234");
  });

  it("falls back to a random string when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});
    const id = createSessionId();
    expect(id.startsWith("se-")).toBe(true);
    expect(id.length).toBeGreaterThan(3);
  });
});
