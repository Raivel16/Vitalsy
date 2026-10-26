import { expect, test } from "../../support/fixtures";
import { advanceAdmission, advanceDischarge, census, hospitalize, registerEncounter, type Ctx } from "../../support/scenarios";

type Order = { id: number; status: string; bed?: { id: number; room: string; bedCode: string } } & Record<string, unknown>;

async function ordersOf(ctx: Ctx): Promise<Order[]> {
  return (await (await ctx.api("enfermera_supervisora")).get<{ orders: Order[] }>("/beds/cleaning-orders")).orders;
}

function bedIdOf(order: Order): number | undefined {
  return order.bed?.id ?? (order.bedId as number | undefined);
}

async function vacatedBed(ctx: Ctx) {
  const hosp = await hospitalize(ctx);
  await advanceDischarge(ctx, hosp, "salida");
  const order = (await ordersOf(ctx)).find((o) => bedIdOf(o) === hosp.bedId);
  return { hosp, order };
}

test.describe("limpieza terminal y habilitación (RF-74–77)", () => {
  test("RF-74 · Camas · el egreso genera la orden de limpieza y la cama queda en limpieza", async ({ api, data }) => {
    const ctx = { api, data };
    const { hosp, order } = await vacatedBed(ctx);
    expect(order, "orden de limpieza de la cama liberada").toBeDefined();
    const bed = (await census(ctx)).flatMap((w) => w.beds).find((b) => b.id === hosp.bedId);
    expect(bed?.status).toBe("cleaning");
  });

  test("RF-75 · Camas · desinfección, equipamiento y habilitación por pantalla [E5-05][E5-06][E5-07]", async ({ asRole, api, data }) => {
    test.slow();
    const ctx = { api, data };
    const { hosp } = await vacatedBed(ctx);
    const unit = new RegExp(`${hosp.room}.*${hosp.bed}|${hosp.room}-${hosp.bed}`);

    const cleaner = await asRole("servicios_generales");
    await cleaner.goto("/camas/limpieza");
    await cleaner.getByLabel("Buscar por habitación o cama").fill(String(hosp.room));
    const card = cleaner.locator("article, li").filter({ hasText: unit }).first();
    const disinfect = card.getByRole("button", { name: "Registrar desinfección terminada" });
    await expect(disinfect).toBeDisabled();
    for (const item of ["Limpieza de superficies duras", "Desinfección de porta-suero", "Cambio de colchón sanitario", "Ventilación de ambiente (30 min)"]) {
      await card.getByLabel(item).check();
    }
    await disinfect.click();
    await expect(cleaner.getByText(/^Desinfección registrada en .+\. Pasa a equipamiento\.$/)).toBeVisible();

    const aux = await asRole("auxiliar_enfermeria");
    await aux.goto("/camas/limpieza");
    await aux.getByLabel("Buscar por habitación o cama").fill(String(hosp.room));
    await aux.locator("article, li").filter({ hasText: unit }).first().getByRole("button", { name: "Marcar unidad equipada" }).click();
    await expect(aux.getByText(/^Unidad equipada: .+\. Pasa a validación de la supervisora\.$/)).toBeVisible();

    const sup = await asRole("enfermera_supervisora");
    await sup.goto("/camas/limpieza");
    await sup.getByLabel("Buscar por habitación o cama").fill(String(hosp.room));
    await sup.locator("article, li").filter({ hasText: unit }).first().getByRole("button", { name: "Habilitar cama en censo hospitalario" }).click();
    await expect(sup.getByText(/^Cama habilitada en el censo central: .+\.$/)).toBeVisible();
    const bed = (await census(ctx)).flatMap((w) => w.beds).find((b) => b.id === hosp.bedId);
    expect(bed?.status).toBe("available");
  });

  test("RF-76 · Camas · no se equipa sin desinfectar ni se habilita sin equipar [E5-08]", async ({ api, data }) => {
    const ctx = { api, data };
    const { hosp } = await vacatedBed(ctx);
    const equip = await (await api("auxiliar_enfermeria")).raw("POST", `/beds/${hosp.bedId}/equip`);
    expect(equip.status()).toBe(422);
    const release = await (await api("enfermera_supervisora")).raw("POST", `/beds/${hosp.bedId}/release`);
    expect(release.status()).toBe(422);
  });

  test("RF-75 · Camas · el checklist incompleto no registra la desinfección", async ({ api, data }) => {
    const ctx = { api, data };
    const { order } = await vacatedBed(ctx);
    const res = await (await api("servicios_generales")).raw("POST", `/beds/cleaning-orders/${order!.id}/complete`, {
      checklist: { superficies: true, portasuero: true, colchon: true },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).message).toBe("Complete todo el checklist antes de registrar la desinfección.");
  });

  test("RF-74 · Camas · sin cama del censo asignada no se firma el consentimiento [E5-09]", async ({ api, data }) => {
    const ctx = { api, data };
    const enc = await advanceAdmission(ctx, await registerEncounter(ctx), "consentimiento", { withoutBed: true });
    const res = await (await api("admision")).raw("POST", "/hospital-admission/informed-consents", {
      encounterId: enc.encounterId,
      signerName: enc.patient.fullName,
      accepted: true,
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).message).toBe("Asigne una cama en Gestión de camas antes de registrar el consentimiento.");
  });
});
