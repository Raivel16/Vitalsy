import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // e2e/**/*.spec.ts son de Playwright; los e2e/**/*.test.ts (utilidades de la suite) sí corren aquí.
    exclude: ["node_modules/**", "dist/**", "e2e/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**"],
    },
  },
});
