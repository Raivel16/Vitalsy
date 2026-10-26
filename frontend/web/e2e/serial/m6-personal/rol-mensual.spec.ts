import type { Page } from "@playwright/test";
import { expect, test } from "../../support/fixtures";
import { publishPlan } from "../../support/scenarios";
import { NURSES, UNIT, utc } from "./personas";

// Meses propios de este archivo: 2027-01 y 2027-02.
const MONTH = "2027-01";

async function openMonth(page: Page, yearMonth: string) {
  await page.goto("/personal");
  const month = page.getByLabel("Mes", { exact: true });
  for (let i = 0; i < 36 && (await month.inputValue()) !== yearMonth; i++) {
    await page.getByRole("button", { name: "Mes siguiente" }).click();
  }
  await expect(month).toHaveValue(yearMonth);
  // Esperar a que el mes termine de cargar antes de actuar.
  await expect(page.getByText("Cargando el rol del mes…")).toHaveCount(0);
}

async function pickPerson(page: Page, label: string, query: string, name: RegExp) {
  await page.getByRole("combobox", { name: label }).fill(query);
  await page.getByRole("option", { name }).first().click();
}

test.describe("rol mensual (RF-78)", () => {
  test("RF-78 · Personal · publicar sin turnos marcados se rechaza [E6-06]", async ({ asRole }) => {
    const page = await asRole("jefatura_enfermeria");
    await openMonth(page, "2027-02");
    // Un mes sin rol debe verse vacío (no con el rol del mes anterior).
    await expect(page.getByText("Aún no hay un rol publicado para febrero de 2027.")).toBeVisible();
    await page.getByRole("button", { name: "Publicar rol mensual oficial" }).click();
    // Según el estado del mes, primero se pide confirmar el reemplazo (guía E6-07).
    const message = page.getByText("Marque al menos un turno antes de publicar el rol.");
    const confirm = page.getByRole("button", { name: "Confirmar reemplazo" });
    await expect(message.or(confirm)).toBeVisible();
    if (await confirm.isVisible()) await confirm.click();
    await expect(message).toBeVisible();
  });

  test("RF-78 · Personal · la jefatura arma y publica el rol del mes [E6-05][E6-07]", async ({ asRole }) => {
    const page = await asRole("jefatura_enfermeria");
    await openMonth(page, MONTH);
    await pickPerson(page, "Colaborador", "Rosa", /Rosa Quispe/);
    await page.getByRole("button", { name: "Agregar al rol" }).click();
    const matrix = page.getByRole("table", { name: `Matriz de turnos ${MONTH}` });
    await expect(matrix.getByRole("rowheader", { name: /Rosa Quispe/ })).toBeVisible();
    // Una pulsación alterna L → D.
    for (const day of [4, 5, 6]) await matrix.getByRole("button", { name: new RegExp(`^Rosa Quispe[^,]*, día ${day}: `) }).click();
    await expect(matrix.getByRole("button", { name: /^Rosa Quispe[^,]*, día 4: D/ })).toBeVisible();
    await page.getByLabel("Servicio del rol").selectOption({ label: UNIT });
    await page.getByRole("button", { name: "Publicar rol mensual oficial" }).click();
    // Esperar a que aparezca el diálogo o el resultado antes de decidir (sin carrera).
    const confirm = page.getByRole("button", { name: "Confirmar reemplazo" });
    const published = page.getByText("Rol mensual de turnos publicado.");
    await expect(published.or(confirm)).toBeVisible();
    if (await confirm.isVisible()) await confirm.click();
    await expect(published).toBeVisible();
    await expect(page.getByText(/^Publicado el .+ por .+\.$/)).toBeVisible();
  });

  test("RF-78 · Personal · cambiar de mes rápido no muestra el rol de otro mes", async ({ asRole }) => {
    const page = await asRole("jefatura_enfermeria");
    // La respuesta del mes inicial llega tarde, como en una red lenta.
    await page.route(/\/api\/v1\/staff\/shift-plans\/\d{4}-\d{2}$/, async (route) => {
      if (route.request().url().endsWith(new Date().toISOString().slice(0, 7))) await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });
    const current = new Date().toISOString().slice(0, 7);
    const late = page.waitForResponse((r) => r.url().endsWith(`/staff/shift-plans/${current}`));
    await page.goto("/personal");
    const month = page.getByLabel("Mes", { exact: true });
    await expect(month).toBeVisible();
    for (let i = 0; i < 36 && (await month.inputValue()) !== "2027-02"; i++) await page.getByRole("button", { name: "Mes siguiente" }).click();
    await late; // la respuesta retrasada del mes inicial ya llegó
    await expect(page.getByText("Cargando el rol del mes…")).toHaveCount(0);
    await expect(page.getByText("Aún no hay un rol publicado para febrero de 2027.")).toBeVisible();
    await expect(page.getByText(/^Publicado el /)).toHaveCount(0);
  });

  test("RF-78 · Personal · publicar de nuevo reemplaza el mes completo", async ({ api, data }) => {
    const ctx = { api, data };
    await publishPlan(ctx, MONTH, [{ email: NURSES.rosa, startsAt: utc("2027-01-10", "07:00"), endsAt: utc("2027-01-10", "19:00"), unit: UNIT }]);
    await publishPlan(ctx, MONTH, [{ email: NURSES.lucia, startsAt: utc("2027-01-11", "19:00"), endsAt: utc("2027-01-12", "07:00"), unit: UNIT }]);
    const plan = JSON.stringify(await (await api("jefatura_enfermeria")).get(`/staff/shift-plans/${MONTH}`));
    expect(plan).toContain("Lucía Mendoza");
    expect(plan).not.toContain("Rosa Quispe");
  });

  test("RF-78 · Personal · el listado muestra los roles publicados y cualquier rol de personal lo consulta", async ({ api, data }) => {
    await publishPlan({ api, data }, MONTH, [{ email: NURSES.carmen, startsAt: utc("2027-01-15", "07:00"), endsAt: utc("2027-01-15", "19:00"), unit: UNIT }]);
    for (const role of ["jefatura_enfermeria", "enfermera_supervisora", "enfermera_piso", "recursos_humanos"] as const) {
      const list = JSON.stringify(await (await api(role)).get("/staff/shift-plans"));
      expect(list, role).toContain(MONTH);
    }
  });

  test("RF-78 · Personal · el buscador encuentra por nombre y por correo", async ({ asRole }) => {
    const page = await asRole("jefatura_enfermeria");
    await page.goto("/personal");
    const box = page.getByRole("combobox", { name: "Colaborador" });
    // Carmen no figura en el rol sembrado (Rosa, Lucía y Elena), así que el buscador la ofrece.
    await box.fill("Carmen");
    await expect(page.getByRole("option", { name: /Carmen Huamán/ })).toBeVisible();
    await box.fill("carmen.huaman@");
    await expect(page.getByRole("option", { name: /Carmen Huamán/ })).toBeVisible();
  });

  test("RF-78 · Personal · recursos humanos consulta pero no publica [N-11]", async ({ asRole, api }) => {
    const page = await asRole("recursos_humanos");
    await page.goto("/personal");
    await expect(page.getByRole("button", { name: "Publicar rol mensual oficial" })).toHaveCount(0);
    const res = await (await api("recursos_humanos")).raw("POST", "/staff/shift-plans", { yearMonth: MONTH, shifts: [] });
    expect(res.status()).toBe(403);
  });
});
