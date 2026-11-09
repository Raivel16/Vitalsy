import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DOCKER_BIN = process.env.DOCKER_BIN ?? "docker";

// RNF-18: el stack E2E es un proyecto Compose propio; nunca el de desarrollo.
export const E2E_PROJECT = "vitalsy-e2e";
export const E2E_BASE_URL = "http://localhost:18080";

const ROOT_URL = new URL("../../../../", import.meta.url);
const REPO_ROOT = fileURLToPath(ROOT_URL);

export function repoPath(relative: string): string {
  return fileURLToPath(new URL(relative, ROOT_URL));
}

export function compose(args: string[]): string {
  return execFileSync(
    DOCKER_BIN,
    [
      "compose",
      "-p",
      E2E_PROJECT,
      "-f",
      repoPath("docker-compose.yml"),
      "-f",
      repoPath("docker-compose.e2e.yml"),
      "--env-file",
      repoPath(".env.e2e"),
      ...args,
    ],
    { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

export function artisan(...args: string[]): string {
  return compose(["exec", "-T", "backend", "php", "artisan", ...args]);
}

/** Lee una variable de `.env.e2e` (p. ej. DEMO_PASSWORD). */
export function e2eEnv(name: string): string {
  const line = readFileSync(repoPath(".env.e2e"), "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  const value = line?.slice(name.length + 1).trim().replace(/^"|"$/g, "");
  if (!value) throw new Error(`Defina ${name} en .env.e2e (vea .env.e2e.example).`);
  return value;
}

async function healthy(): Promise<boolean> {
  try {
    const res = await fetch(`${E2E_BASE_URL}/api/health`);
    return res.ok && (await res.json()).db === "ok";
  } catch {
    return false;
  }
}

async function waitUntilHealthy(deadline: number): Promise<boolean> {
  if (await healthy()) return true;
  if (Date.now() >= deadline) return false;
  await new Promise((r) => setTimeout(r, 3000));
  return waitUntilHealthy(deadline);
}

export async function ensureStack(): Promise<void> {
  if (await healthy()) return;
  compose(["up", "-d", "--build"]);
  const deadline = Date.now() + 5 * 60_000;
  if (await waitUntilHealthy(deadline)) return;
  throw new Error(`El stack ${E2E_PROJECT} no respondió /api/health en 5 minutos. Revise: docker compose -p ${E2E_PROJECT} logs backend`);
}

export function resetData(): void {
  const env = artisan("env");
  if (!env.includes("[e2e]")) {
    throw new Error(`Abortado: el backend del proyecto ${E2E_PROJECT} no está en APP_ENV=e2e (${env.trim()}).`);
  }
  artisan("migrate:fresh", "--seeder=E2ESeeder", "--force");
  artisan("e2e:clock", "reset");
}
