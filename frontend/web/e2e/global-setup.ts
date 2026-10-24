import type { FullConfig } from "@playwright/test";
import { E2E_BASE_URL, ensureStack, resetData } from "./support/env";

// RNF-18: prepara el stack aislado y deja la base recién sembrada en cada corrida.
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (baseURL !== E2E_BASE_URL) {
    throw new Error(`Abortado: la suite E2E solo corre contra ${E2E_BASE_URL} (recibió ${baseURL}). No apunte al stack de desarrollo.`);
  }

  await ensureStack();
  resetData();
}
