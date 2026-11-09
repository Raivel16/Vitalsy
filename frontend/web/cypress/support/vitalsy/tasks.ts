// Tareas de Node que Cypress expone a los escenarios (`cy.task`): una sesión por rol, reutilizada en la corrida.
import { hospitalize, raiseAlert, type Hospitalized, type SessionFor } from "./scenarios";
import { VitalsySession, type FetchLike, type Wait } from "./session";
import type { VitalsProfile } from "./vitals";

export type TaskOptions = { baseUrl: string; password: string; fetcher?: FetchLike; wait?: Wait; seed?: () => number };

export type ApiCall = { role: string; method: string; path: string; body?: unknown };

export function roleEmail(role: string): string {
  return `${role}@vitalsy.local`;
}

/** Lee `CLAVE=valor` de un archivo .env (sin comillas ni comentarios). */
export function readEnvValue(content: string, key: string): string | undefined {
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match?.[1] === key) return match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return undefined;
}

export function createVitalsyTasks(options: TaskOptions) {
  const sessions = new Map<string, Promise<VitalsySession>>();
  const seed = options.seed ?? (() => Date.now());
  // Un solo paciente por corrida: cada ingreso ocupa una cama y el entorno de desarrollo no da de alta.
  let patient: Promise<Hospitalized> | null = null;

  const as: SessionFor = (role) => {
    let session = sessions.get(role);
    if (!session) {
      session = (async () => {
        const created = new VitalsySession(options.baseUrl, options.fetcher, options.wait);
        await created.login(roleEmail(role), options.password);
        return created;
      })();
      sessions.set(role, session);
      session.catch(() => sessions.delete(role));
    }
    return session;
  };

  return {
    "vitalsy:hospitalize": () => {
      patient ??= hospitalize(as, seed());
      patient.catch(() => {
        patient = null;
      });
      return patient;
    },
    "vitalsy:raiseAlert": ({ encounterId, profile }: { encounterId: string; profile: Exclude<VitalsProfile, "normal"> }) =>
      raiseAlert(as, encounterId, profile),
    "vitalsy:api": async ({ role, method, path, body }: ApiCall) => (await as(role)).raw(method, path, body),
  };
}
