import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL } from "./e2e/support/env";

// RNF-18: suite E2E local contra el stack aislado `vitalsy-e2e`. `e2e/run.mjs` lanza
// dos fases (E2E_PHASE=parallel|serial) y une sus reportes; BASE_URL solo existe
// para que global-setup rechace apuntar a otro stack.
const phase = process.env.E2E_PHASE;
const serialOnly = ["**/serial/**"];

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: `e2e-results/artifacts/${phase ?? "manual"}`,
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: phase
    ? [["list"], ["blob", { outputDir: `e2e-results/blob-${phase}`, fileName: `${phase}.zip` }], ["./e2e/support/findings-reporter.ts"]]
    : [["list"], ["html", { outputFolder: "e2e-results/html", open: "never" }], ["./e2e/support/findings-reporter.ts"]],
  use: {
    baseURL: process.env.BASE_URL ?? E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "es-PE",
    timezoneId: "UTC",
  },
  projects: [
    { name: "parallel", testIgnore: serialOnly, fullyParallel: true, use: { ...devices["Desktop Chrome"] } },
    { name: "serial", testMatch: "**/serial/**/*.spec.ts", workers: 1, use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", testIgnore: serialOnly, fullyParallel: true, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testIgnore: serialOnly, fullyParallel: true, use: { ...devices["Desktop Safari"] } },
  ],
});
