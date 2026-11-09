import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ROLES, type Role } from "../../src/app/roles";
import { ApiSession } from "./api";
import { e2eEnv } from "./env";
import { sequentially } from "./sequence";

// RNF-18: una sesión por rol, creada una vez por corrida (el login real se prueba aparte).
const AUTH_DIR = fileURLToPath(new URL("../.auth/", import.meta.url));

export function roleEmail(role: Role): string {
  return `${role}@vitalsy.local`;
}

export function rolePassword(): string {
  return e2eEnv("DEMO_PASSWORD");
}

export function sessionFile(role: Role): string {
  return `${AUTH_DIR}${role}.json`;
}

export async function createRoleSessions(): Promise<void> {
  mkdirSync(AUTH_DIR, { recursive: true });
  const password = rolePassword();
  await sequentially(ROLES, async (role) => {
    const session = await ApiSession.login(roleEmail(role), password);
    await session.save(sessionFile(role));
    await session.dispose();
  });
}
