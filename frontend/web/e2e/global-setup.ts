import type { FullConfig } from "@playwright/test";
import { E2E_BASE_URL, ensureStack, resetData } from "./support/env";
import { createRoleSessions } from "./support/sessions";

// RNF-18: prepara el stack aislado y deja la base recién sembrada en cada corrida.
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (baseURL !== E2E_BASE_URL) {
    throw new Error(`Abortado: la suite E2E solo corre contra ${E2E_BASE_URL} (recibió ${baseURL}). No apunte al stack de desarrollo.`);
  }

  // Al correr playwright directamente (sin npm run e2e) también hay semilla.
  process.env.E2E_SEED ??= String(Math.floor(Math.random() * 2 ** 31));
  console.log(`Semilla E2E: ${process.env.E2E_SEED}`);

  await ensureStack();
  resetData();
  await createRoleSessions();
}
