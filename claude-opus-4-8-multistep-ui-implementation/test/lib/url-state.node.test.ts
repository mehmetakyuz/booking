// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  encodeSnapshot,
  decodeSnapshot,
  writeSnapshotToUrl,
  readSnapshotFromUrl,
  UrlSnapshot,
} from "@/lib/booking/url-state";

const snap: UrlSnapshot = {
  sid: "se-1",
  step: "dates",
  people: [{}],
  groups: [{ people: [0] }],
};

describe("url-state on the server (no window)", () => {
  it("encodes/decodes via Buffer when window is undefined", () => {
    expect(typeof window).toBe("undefined");
    const encoded = encodeSnapshot(snap);
    expect(decodeSnapshot(encoded)).toEqual(snap);
  });

  it("writeSnapshotToUrl is a no-op on the server", () => {
    expect(() => writeSnapshotToUrl(snap)).not.toThrow();
  });

  it("readSnapshotFromUrl returns null on the server", () => {
    expect(readSnapshotFromUrl()).toBeNull();
  });
});
