import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "cypress";
import { createVitalsyTasks, readEnvValue } from "./cypress/support/vitalsy/tasks";

// Pruebas automatizadas del módulo 3 (monitoreo y alertas) sobre la aplicación real levantada con
// `docker compose up` (Nginx en http://localhost:8080). La clave de las cuentas demo sale de
// CYPRESS_DEMO_PASSWORD o, si no está, de DEMO_PASSWORD en el `.env` de la raíz del repositorio.
const baseUrl = process.env.CYPRESS_BASE_URL ?? "http://localhost:8080";

function demoPassword(): string {
  if (process.env.CYPRESS_DEMO_PASSWORD) return process.env.CYPRESS_DEMO_PASSWORD;
  try {
    return readEnvValue(readFileSync(resolve(process.cwd(), "../../.env"), "utf8"), "DEMO_PASSWORD") ?? "";
  } catch {
    return "";
  }
}

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    viewportWidth: 1920,
    viewportHeight: 1080,
    defaultCommandTimeout: 10_000,
    video: true,
    screenshotOnRunFailure: true,
    reporter: "junit",
    reporterOptions: { mochaFile: "cypress/results/resultados-[hash].xml", toConsole: true },
    setupNodeEvents(on, config) {
      const password = demoPassword();
      config.env.DEMO_PASSWORD = password;
      on("task", createVitalsyTasks({ baseUrl, password }));
      return config;
    },
  },
});
