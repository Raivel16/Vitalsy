import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "cypress";
import { createVitalsyTasks, readEnvValue } from "./cypress/support/vitalsy/tasks";

// Pruebas automatizadas del módulo 3 (monitoreo y alertas) sobre la aplicación real levantada con
// `docker compose up` (Nginx en http://localhost:8080). La clave de las cuentas demo sale de
// CYPRESS_DEMO_PASSWORD o, si no está, de DEMO_PASSWORD en el `.env` de la raíz del repositorio.
const baseUrl = process.env.CYPRESS_BASE_URL ?? "http://localhost:8080";
const WINDOW = { width: 1920, height: 1080 };

/** Sin interfaz el navegador abre a 1280×720 y recorta la vista de 1920 px: se abre del mismo tamaño. */
function sizeBrowserWindow(browser: Cypress.Browser, launchOptions: Cypress.BeforeBrowserLaunchOptions) {
  if (browser.name === "electron") {
    launchOptions.preferences.width = WINDOW.width;
    launchOptions.preferences.height = WINDOW.height;
  } else if (browser.family === "chromium") {
    launchOptions.args.push(`--window-size=${WINDOW.width},${WINDOW.height}`, "--force-device-scale-factor=1");
  } else if (browser.family === "firefox") {
    launchOptions.args.push(`--width=${WINDOW.width}`, `--height=${WINDOW.height}`);
  }
  return launchOptions;
}

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
    viewportWidth: WINDOW.width,
    viewportHeight: WINDOW.height,
    defaultCommandTimeout: 10_000,
    // El servidor de desarrollo compila módulos bajo demanda y la API corre con `php artisan serve`: la primera
    // carga de una ruta puede tardar más que los 5 s por defecto. Se reintenta una vez en la terminal (CI).
    requestTimeout: 20_000,
    responseTimeout: 60_000,
    retries: { runMode: 1, openMode: 0 },
    video: true,
    screenshotOnRunFailure: true,
    reporter: "junit",
    reporterOptions: { mochaFile: "cypress/results/resultados-[hash].xml", toConsole: true },
    setupNodeEvents(on, config) {
      const password = demoPassword();
      config.env.DEMO_PASSWORD = password;
      on("task", createVitalsyTasks({ baseUrl, password }));
      on("before:browser:launch", sizeBrowserWindow);
      return config;
    },
  },
});
