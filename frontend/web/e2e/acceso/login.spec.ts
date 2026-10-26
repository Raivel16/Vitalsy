import type { Page } from "@playwright/test";
import { ApiSession } from "../support/api";
import { expect, test } from "../support/fixtures";
import { rolePassword } from "../support/sessions";

async function submitLogin(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function createUser(api: ApiSession, data: { int(a: number, b: number): number; seed: number }, role = "enfermera_piso") {
  const email = `usuario.e2e.${data.seed}.${data.int(1000, 9999)}@vitalsy.local`;
  const res = await api.post<{ user: { id: number }; temporaryPassword: string }>("/users", { name: "Usuario de prueba E2E", email, role });
  return { id: res.user.id, email, password: res.temporaryPassword };
}

test.describe("inicio de sesión", () => {
  test("RF-99 · Acceso · campos vacíos muestran errores sin llamar al servidor [E0-01]", async ({ page }) => {
    let loginCalls = 0;
    page.on("request", (r) => {
      if (r.url().includes("/auth/login")) loginCalls++;
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("El correo es obligatorio.")).toBeVisible();
    await expect(page.getByText("La contraseña es obligatoria.")).toBeVisible();
    expect(loginCalls).toBe(0);
  });

  test("RF-99 · Acceso · correo sin formato válido [E0-02]", async ({ page }) => {
    await page.goto("/");
    await page.locator("#email").fill("admision");
    await page.locator("#password").fill("x");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Ingrese un correo válido.")).toBeVisible();
  });

  test("RF-99 · Acceso · contraseña incorrecta [E0-03]", async ({ page }) => {
    await submitLogin(page, "admision@vitalsy.local", "incorrecta123");
    await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();
  });

  test("RF-99 · Acceso · mostrar y ocultar contraseña [E0-04]", async ({ page }) => {
    await page.goto("/");
    await page.locator("#password").fill("secreta");
    await expect(page.locator("#password")).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar contraseña" }).click();
    await expect(page.locator("#password")).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ocultar contraseña" }).click();
    await expect(page.locator("#password")).toHaveAttribute("type", "password");
  });

  test("RF-99 · Acceso · admisión entra a Inicio con su cola de trabajo [E0-05]", async ({ freshLogin }) => {
    const page = await freshLogin("admision");
    await expect(page.getByText("Abra el censo, continúe el paciente de su turno")).toBeVisible();
    await expect(page.getByText("Cola de trabajo")).toBeVisible();
    // La guía también lista las tarjetas de resumen, pero HomePage solo las muestra a roles
    // clínicos, de alertas y de control: discrepancia anotada para decidir guía vs. app.
  });

  test("RF-99 · Acceso · una enfermera de piso ve el resumen del turno en Inicio", async ({ freshLogin }) => {
    const page = await freshLogin("enfermera_piso");
    for (const card of ["Pacientes en turno", "Controles vencidos", "Alertas abiertas", "Dosis e-MAR vencidas"]) {
      await expect(page.getByText(card).first()).toBeVisible();
    }
  });

  test("RF-100 · Acceso · tras cerrar sesión, «atrás» no muestra datos clínicos [E0-06]", async ({ freshLogin }) => {
    const page = await freshLogin("admision");
    await page.goto("/pacientes");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByText("Su perfil es")).toHaveCount(0);
  });

  test("RF-102 · Acceso · una cuenta desactivada no entra [N-18]", async ({ page, api, data }) => {
    const admin = await api("administrador_accesos");
    const user = await createUser(admin, data);
    await admin.post(`/users/${user.id}/deactivate`);
    await submitLogin(page, user.email, user.password);
    await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();
  });

  test("RF-103 · Acceso · con contraseña temporal solo se ve el cambio de contraseña [N-19]", async ({ page, api, data }) => {
    const user = await createUser(await api("administrador_accesos"), data);

    const session = await ApiSession.login(user.email, user.password);
    const res = await session.raw("GET", "/hospital-admission/encounters");
    expect(res.status()).toBe(403);
    expect((await res.json()).message).toBe("Debe cambiar la contraseña temporal para continuar.");
    await session.dispose();

    await submitLogin(page, user.email, user.password);
    await expect(page.getByRole("heading", { name: "Cambie su contraseña" })).toBeVisible();
    await page.goto("/pacientes");
    await expect(page.getByRole("heading", { name: "Cambie su contraseña" })).toBeVisible();
  });

  test("RNF-08 · Acceso · las cuentas demo usan la contraseña del entorno E2E", async () => {
    expect(rolePassword().length).toBeGreaterThan(0);
  });
});
