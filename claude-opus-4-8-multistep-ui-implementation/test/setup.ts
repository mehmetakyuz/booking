import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees and reset mock state between tests.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom ships a throwing `window.scrollTo` stub; the context calls it on
// navigation, so replace it with a silent noop.
if (typeof window !== "undefined") {
  // @ts-expect-error - assigning a noop test stub
  window.scrollTo = () => {};
}
