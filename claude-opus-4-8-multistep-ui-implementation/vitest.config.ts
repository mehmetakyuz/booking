import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Coverage is measured over the application's logic and UI. Pure
      // type declarations, GraphQL document strings, and Next.js framework
      // entrypoints (layout/page/route shells) carry no testable branches.
      include: [
        "lib/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
      ],
      exclude: [
        "lib/booking/types.ts", // interfaces only — no runtime code
        "lib/graphql/queries.ts", // static GraphQL document strings
      ],
      thresholds: {
        // The pure logic + data layer (formatters, normalizers, variable
        // builders, async API orchestration, GraphQL transport) is held at a
        // strict 100% — a gap there means an untested behaviour.
        "lib/graphql/**/*.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
        // Statements/functions/lines are exhaustively covered; branches sit at
        // 99% only because of one defensively-unreachable `?? []` guard.
        "lib/booking/!(context).{ts,tsx}": { statements: 100, branches: 99, functions: 100, lines: 100 },
        // The stateful React provider (async thunks, polling, navigation) and
        // the UI components are exercised by behavioural render tests and held
        // to a high bar.
        "lib/booking/context.tsx": { statements: 90, branches: 84, functions: 100, lines: 90 },
        "components/**/*.{ts,tsx}": { statements: 95, branches: 78, functions: 88, lines: 95 },
      },
    },
  },
});
