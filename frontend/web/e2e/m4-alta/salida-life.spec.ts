import { expect, test } from "../support/fixtures";
import { advanceDischarge, hospitalize, lifeLinkCode } from "../support/scenarios";

test.describe("caja, pase y salida", () => {
  test("RF-63 · Egreso · sin liquidación conforme no hay pase; luego sí [E4-09][E4-10]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    await advanceDischarge({ api, data }, hosp, "recepcion");
    const page = await asRole("altas_caja");
    await page.goto(`/egreso/${hosp.encounterId}`);
    const early = await (await api("altas_caja")).raw("POST", `/discharge/encounters/${hosp.encounterId}/exit-pass`);
    expect((await early.json()).message).toBe("La liquidación administrativa aún no está conforme.");

    await page.getByRole("button", { name: "Marcar liquidación conforme" }).click();
    await expect(page.getByText("Estado de cuenta verificado.")).toBeVisible();
    await page.getByRole("button", { name: "Emitir pase de salida" }).click();
    await expect(page.getByText("Pase de salida digital emitido.")).toBeVisible();
  });

  test("RF-65 · Egreso · el camillero ve la salida autorizada y la enfermera la registra [E4-11][E4-12]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    await advanceDischarge({ api, data }, hosp, "pase");
    const camillero = await asRole("camillero");
    await camillero.goto("/egreso");
    await expect(camillero.getByText(hosp.patient.fullName).first()).toBeVisible();

    const nurse = await asRole("enfermera_piso");
    await nurse.goto(`/egreso/${hosp.encounterId}`);
    await nurse.getByRole("button", { name: "Registrar salida efectiva" }).click();
    await expect(nurse.getByText("Salida efectiva registrada. La cama queda vacante.")).toBeVisible();

    const { encounters } = await (await api("enfermera_piso")).get<{ encounters: { encounterId: string }[] }>(
      `/hospital-admission/encounters?q=${hosp.patient.dni}`,
    );
    expect(encounters.map((e) => e.encounterId)).not.toContain(hosp.encounterId);
  });

  test("RF-66 · Egreso · no hay salida efectiva sin pase de salida [E4-13]", async ({ api, data }) => {
    const hosp = await hospitalize({ api, data });
    await advanceDischarge({ api, data }, hosp, "cuenta");
    const res = await (await api("enfermera_piso")).raw("POST", `/discharge/encounters/${hosp.encounterId}/exit`);
    expect((await res.json()).message).toBe("No hay un pase de salida emitido para este ingreso.");
  });
});

test.describe("seguimiento en Vitalsy Life al alta", () => {
  test("RF-96 · Egreso · «No es usuario» genera una invitación VLI válida 30 días [E4-07]", async ({ asRole, api, data }) => {
    const hosp = await hospitalize({ api, data });
    await advanceDischarge({ api, data }, hosp, "conciliacion");
    const page = await asRole("enfermera_piso");
    await page.goto(`/egreso/${hosp.encounterId}`);
    await page.getByLabel("Indicaciones de medicamentos").fill("Amoxicilina cada 8 horas por 7 días");
    await page.getByLabel("No es usuario: generar invitación").check();
    await page.getByRole("button", { name: "Generar informe" }).click();
    await expect(page.getByText("Informe digital de alta de enfermería generado.")).toBeVisible();
    await expect(page.getByText(/VLI-/).first()).toBeVisible();
    await expect(page.getByText("Código de invitación")).toBeVisible();
    await expect(page.getByText("Válido hasta")).toBeVisible();
  });

  test("RF-96 · Egreso · «Ya es usuario» sincroniza un plan VLA que solo reclama una cuenta [E4-14]", async ({ api, data }) => {
    const ctx = { api, data };
    const hosp = await hospitalize(ctx);
    const { lifePlan } = await advanceDischarge(ctx, hosp, "informe", { lifeMode: "usuario" });
    const code = JSON.stringify(lifePlan).match(/VLA-[A-Z0-9-]+/)?.[0];
    expect(code, "el plan devuelve un código VLA-…").toBeTruthy();

    const owner = await lifeLinkCode(ctx);
    const other = await lifeLinkCode(ctx);
    const claim = (token: string) =>
      fetch(`http://localhost:18080/api/v1/life/discharge-plans/${code}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    expect((await claim(owner.token)).status).toBe(200);
    const second = await claim(other.token);
    expect(second.status).toBe(409);
    expect(await second.text()).toContain("plan_claimed");
  });

  test("RF-96 · Egreso · «Rechaza» registra el alta sin código Life [E4-07]", async ({ api, data }) => {
    const hosp = await hospitalize({ api, data });
    const { lifePlan } = await advanceDischarge({ api, data }, hosp, "informe", { lifeMode: "rechaza" });
    expect(JSON.stringify(lifePlan)).not.toMatch(/VL[AI]-/);
  });
});
