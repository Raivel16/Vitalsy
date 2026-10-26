import { request } from "@playwright/test";
import { ROLES, type Role } from "../../src/app/roles";
import { E2E_BASE_URL } from "../support/env";
import { expect, test } from "../support/fixtures";

const FORBIDDEN = "No tiene permiso para esta acción.";

// [id, rol, método, ruta] de la guía §2.2 (parte b). {enc} se reemplaza por un ingreso sembrado.
const CASES: [string, Role, string, string][] = [
  ["N-11", "recursos_humanos", "POST", "/staff/shift-plans"],
  ["N-12", "jefatura_enfermeria", "POST", "/staff/absences"],
  ["N-14", "equipo_respuesta_rapida", "POST", "/inpatient-care/encounters/{enc}/vital-signs"],
  ["N-15", "enfermera_piso", "POST", "/discharge/encounters/{enc}/exit-pass"],
  ["N-16", "altas_caja", "POST", "/discharge/encounters/{enc}/exit"],
  ["N-17", "administrador_accesos", "GET", "/hospital-admission/encounters"],
  ["N-17", "administrador_accesos", "GET", "/clinical-alerts/inbox"],
];

test.describe("permisos por API", () => {
  for (const [id, role, method, path] of CASES) {
    test(`RF-99 · Permisos · ${role} recibe 403 en ${method} ${path} [${id}]`, async ({ api }) => {
      const res = await (await api(role)).raw(method, path.replace("{enc}", "ENC-0001"), {});
      expect(res.status()).toBe(403);
      expect((await res.json()).message).toBe(FORBIDDEN);
    });
  }

  test("RF-104 · Permisos · solo administrador_accesos lista usuarios [N-13]", async ({ api }) => {
    const statuses: Record<string, number> = {};
    for (const role of ROLES) statuses[role] = (await (await api(role)).raw("GET", "/users")).status();
    const expected = Object.fromEntries(ROLES.map((r) => [r, r === "administrador_accesos" ? 200 : 403]));
    expect(statuses).toEqual(expected);
  });

  test("RF-99 · Permisos · sin sesión la API responde 401", async () => {
    const anon = await request.newContext({ baseURL: E2E_BASE_URL, extraHTTPHeaders: { Accept: "application/json" } });
    const res = await anon.get("/api/v1/hospital-admission/encounters");
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe("Debe iniciar sesión para continuar.");
    await anon.dispose();
  });

  test("RNF-07 · Permisos · el historial de alertas no se edita ni se borra (ningún rol) [N-17]", async ({ api }) => {
    for (const role of ["administrador_accesos", "enfermera_supervisora", "medico_tratante"] as Role[]) {
      for (const method of ["PUT", "PATCH", "DELETE"]) {
        const status = (await (await api(role)).raw(method, "/clinical-alerts/1", {})).status();
        expect([404, 405], `${role} ${method}`).toContain(status);
      }
    }
  });
});
