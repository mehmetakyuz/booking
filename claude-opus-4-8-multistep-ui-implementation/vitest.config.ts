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
        // The application logic and data layer are held at 100%. These are the
        // pure functions, normalizers, variable builders, async API orchestration
        // and transport where a coverage gap means an untested behaviour.
        "lib/**/*.{ts,tsx}": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // The React component/UI layer is exercised by render + interaction tests
        // and held to a high bar.
        "components/**/*.{ts,tsx}": {
          statements: 100,
          branches: 95,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
