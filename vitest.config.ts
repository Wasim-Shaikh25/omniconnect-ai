import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["src/**/*.integration.test.ts", "src/**/*.integration.test.tsx"],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.integration.test.ts",
        "src/**/*.integration.test.tsx",
        "src/**/*.d.ts",
        "src/app/**/layout.tsx",
      ],
      thresholds: {
        // Measured baseline after Tier 1/2 regression and security tests.
        // CI fails on regression below these values.
        // Ratchet schedule: review every Monday; raise lines/statements by +5%
        // and branches/functions by +2% until lines/statements reach 80%,
        // branches reach 75%, and functions reach 70%. Never lower a threshold.
        lines: 7,
        functions: 52,
        branches: 61,
        statements: 7,
      },
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
