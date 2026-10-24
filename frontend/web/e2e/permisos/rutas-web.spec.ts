import { ROLES, type Role } from "../../src/app/roles";
import { expect, test } from "../support/fixtures";
import { forbiddenRoutes } from "./matriz";

const DENIED = "Esta vista no está disponible para su perfil";

// Casos explícitos de la guía §2.2 (además de la matriz completa).
const GUIDE: [string, Role, string[]][] = [
  ["N-01", "admision", ["/atencion/cpoe", "/atencion/emar", "/egreso", "/camas"]],
  ["N-02", "camillero", ["/pacientes/nuevo", "/admision/consentimiento"]],
  ["N-03", "auxiliar_enfermeria", ["/atencion/emar", "/atencion/cpoe"]],
  ["N-04", "medico_residente", ["/atencion/cpoe"]],
  ["N-05", "medico_tratante", ["/atencion/emar"]],
  ["N-06", "enfermera_piso", ["/camas", "/usuarios", "/atencion/cpoe"]],
  ["N-07", "enfermera_supervisora", ["/egreso"]],
  ["N-08", "trabajo_social", ["/pacientes/nuevo", "/atencion/chart"]],
  ["N-09", "gestion_camas", ["/pacientes", "/camas/limpieza"]],
  ["N-10", "servicios_generales", ["/camas", "/alertas"]],
  ["N-17", "administrador_accesos", ["/pacientes", "/alertas"]],
];

test.describe("permisos por pantalla", () => {
  for (const [id, role, paths] of GUIDE) {
    test(`RF-99 · Permisos · ${role} no abre ${paths.join(", ")} [${id}]`, async ({ asRole }) => {
      const page = await asRole(role);
      for (const path of paths) {
        await page.goto(path);
        await expect(page.getByText(DENIED).first(), path).toBeVisible();
      }
    });
  }

  for (const role of ROLES) {
    test(`RF-99 · Permisos · matriz completa de rutas prohibidas para ${role}`, async ({ asRole }) => {
      const page = await asRole(role);
      await page.goto("/");
      const leaked: string[] = [];
      const spaNavigate = (to: string) =>
        page.evaluate((target) => {
          window.history.pushState({}, "", target);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, to);
      for (const path of forbiddenRoutes(role)) {
        // Navegación dentro de la SPA (como un enlace): evita abortos por redirecciones del router.
        // Antes de cada ruta se vuelve a Inicio para que el aviso de la anterior no cuente.
        await spaNavigate("/");
        await expect(page.getByText(DENIED)).toHaveCount(0);
        await spaNavigate(path);
        try {
          await expect(page.getByText(DENIED).first()).toBeVisible({ timeout: 4000 });
        } catch {
          leaked.push(`${path} → ${new URL(page.url()).pathname}`);
        }
      }
      expect(leaked, `rutas que ${role} pudo abrir`).toEqual([]);
    });
  }
});
