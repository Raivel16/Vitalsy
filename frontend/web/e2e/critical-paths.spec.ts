import { expect, test } from "@playwright/test";

// RNF-18: recorridos críticos sin credenciales (login, guardas de ruta y sonda de salud).
test("la pantalla de inicio de sesión se renderiza", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
});

test("rutas protegidas redirigen al login sin sesión", async ({ page }) => {
  await page.goto("/atencion/chart");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("la API de salud responde", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
});
