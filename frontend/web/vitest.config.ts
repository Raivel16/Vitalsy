import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      // Sonar cuenta las pruebas como código: se miden igual que en el backend (RNF-90).
      // Vitest añade `test.include` y `setupFiles` a `coverage.exclude` al resolver la configuración.
      name: "medir-pruebas-en-cobertura",
      configureVitest({ vitest }) {
        vitest.config.coverage.exclude = [];
      },
    },
  ],
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
      // RF-114: la lógica de apoyo de Cypress se prueba aquí; los escenarios *.cy.ts corren en Cypress.
      include: ["src/**/*.{ts,tsx}", "cypress/support/vitalsy/**/*.ts"],
    },
  },
});
