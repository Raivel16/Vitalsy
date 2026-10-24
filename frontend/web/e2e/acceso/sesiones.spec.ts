import { ROLES, ROLE_LABEL } from "../../src/app/roles";
import { expect, test } from "../support/fixtures";

test.describe("sesiones por rol", () => {
  for (const role of ROLES) {
    test(`RNF-08 · Acceso · la sesión cacheada de ${role} abre Inicio`, async ({ asRole }) => {
      const page = await asRole(role);
      await page.goto("/");
      await expect(page.getByText(`Su perfil es ${ROLE_LABEL[role]}`)).toBeVisible();
    });
  }

  test("RF-100 · Acceso · cerrar sesión con freshLogin no invalida la sesión cacheada del rol", async ({ freshLogin, api }) => {
    const page = await freshLogin("admision");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

    const me = await (await api("admision")).get<{ user: { role: string } }>("/auth/me");
    expect(me.user.role).toBe("admision");
  });
});
