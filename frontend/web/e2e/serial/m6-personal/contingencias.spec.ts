import { expect, test } from "../../support/fixtures";
import { approveAssignments, coverageRequests, driveCoverage, hospitalize, memberId, publishPlan, registerAbsence, type Ctx } from "../../support/scenarios";
import { NURSES, UNIT, utc } from "./personas";

// Fechas propias de este archivo: 2027-04 (una por prueba para no chocar con duplicados).

async function assign(ctx: Ctx, date: string, plan: [string, number][]) {
  const rows = [];
  for (const [email, news2] of plan) {
    const hosp = await hospitalize(ctx);
    rows.push({ nurseUserId: await memberId(ctx, email), encounterId: hosp.encounterId, news2Weight: news2 });
  }
  await approveAssignments(ctx, date, rows);
  return rows;
}

test.describe("inasistencias y rebalanceo (RF-84/85)", () => {
  test("RF-84 · Personal · registrar inasistencia valida los campos [E6-10]", async ({ asRole }) => {
    const page = await asRole("enfermera_supervisora");
    await page.goto("/personal");
    await page.getByRole("button", { name: "Registrar inasistencia" }).click();
    await expect(page.getByText("Seleccione al colaborador.")).toBeVisible();
    await expect(page.getByText("Seleccione el motivo.")).toBeVisible();
  });

  test("RF-85 · Personal · la carga de la ausente se reparte entre las demás por NEWS2", async ({ api, data }) => {
    const ctx = { api, data };
    const date = "2027-04-05";
    const rows = await assign(ctx, date, [[NURSES.rosa, 3], [NURSES.rosa, 1], [NURSES.lucia, 0], [NURSES.carmen, 2]]);
    const result = await registerAbsence(ctx, NURSES.rosa, date, "Descanso médico");
    data.track("inasistencia", result);
    expect(result.unassigned).toBe(0);
    expect(result.coverage.required).toBe(false);
    expect(result.reassignments).toHaveLength(rows.filter((r) => r.nurseUserId === rows[0].nurseUserId).length);
  });

  test("RF-85 · Personal · un paciente crítico (NEWS2 ≥ 7) de la ausente pide retén", async ({ api, data }) => {
    const ctx = { api, data };
    const date = "2027-04-06";
    await assign(ctx, date, [[NURSES.rosa, 8], [NURSES.lucia, 1]]);
    const result = await registerAbsence(ctx, NURSES.rosa, date, "Descanso médico");
    expect(result.coverage.required).toBe(true);
    expect(result.coverage.requestId).not.toBeNull();
  });

  test("RF-85 · Personal · sin receptoras los pacientes quedan sin cubrir y se pide retén", async ({ api, data }) => {
    const ctx = { api, data };
    const date = "2027-04-07";
    await assign(ctx, date, [[NURSES.rosa, 1], [NURSES.rosa, 2]]);
    const result = await registerAbsence(ctx, NURSES.rosa, date, "Descanso médico");
    expect(result.unassigned).toBe(2);
    expect(result.coverage.required).toBe(true);
  });

  test("RF-84 · Personal · una inasistencia repetida el mismo día se rechaza", async ({ api, data }) => {
    const ctx = { api, data };
    const date = "2027-04-08";
    await assign(ctx, date, [[NURSES.carmen, 1], [NURSES.lucia, 1]]);
    await registerAbsence(ctx, NURSES.carmen, date, "Descanso médico");
    const res = await (await api("enfermera_supervisora")).raw("POST", "/staff/absences", {
      userId: await memberId(ctx, NURSES.carmen),
      shiftDate: date,
      reason: "Descanso médico",
    });
    expect((await res.json()).message).toBe("La inasistencia de esa persona ya fue registrada para el día indicado.");
  });
});

test.describe("cobertura extraordinaria (RF-86–88)", () => {
  test("RF-86 · Personal · jefatura aprueba, RR. HH. autoriza y la supervisora confirma el retén [E6-11][E6-12][E6-13]", async ({ api, asRole, data }) => {
    test.slow();
    const ctx = { api, data };
    const date = "2027-04-12";
    await publishPlan(ctx, "2027-04", [{ email: NURSES.mariela, startsAt: utc(date, "07:00"), endsAt: utc(date, "19:00"), unit: UNIT }]);
    await assign(ctx, date, [[NURSES.patricia, 8]]);
    const { coverage } = await registerAbsence(ctx, NURSES.patricia, date, "Descanso médico");
    const id = coverage.requestId!;

    // Hay solicitudes de otras pruebas: se actúa sobre la tarjeta de Patricia. Los botones se
    // llaman «Aprobar retén» y «Autorizar cobertura» (la guía usa otros nombres).
    const card = (page: import("@playwright/test").Page) => page.locator("li, article").filter({ hasText: "Patricia Salas" }).last();
    const boss = await asRole("jefatura_enfermeria");
    await boss.goto("/personal");
    await card(boss).getByRole("button", { name: "Aprobar retén" }).click();
    await expect(boss.getByText("Convocatoria de retén aprobada.")).toBeVisible();

    const hr = await asRole("recursos_humanos");
    await hr.goto("/personal");
    await card(hr).getByRole("button", { name: "Autorizar cobertura" }).click();
    await expect(hr.getByText("Cobertura extraordinaria autorizada.")).toBeVisible();

    const sup = await asRole("enfermera_supervisora");
    await sup.goto("/personal");
    await card(sup).getByRole("combobox", { name: "Retén que ingresa" }).fill("Elena");
    await sup.getByRole("option", { name: /Elena Vargas/ }).first().click();
    await card(sup).getByRole("button", { name: "Confirmar ingreso del retén" }).click();
    await expect(sup.getByText("Ingreso del retén confirmado.")).toBeVisible();

    const request = (await coverageRequests(ctx)).find((r) => r.id === id);
    expect(request?.status).toBe("confirmada");
    // Los retenes del mes solo los ven jefatura, supervisora y RR. HH.
    const forBoss = JSON.stringify(await (await api("jefatura_enfermeria")).get("/staff/shift-plans/2027-04"));
    const forNurse = await (await api("enfermera_piso")).get<{ retainers?: unknown[] }>("/staff/shift-plans/2027-04");
    expect(forBoss).toContain("Elena Vargas");
    expect(JSON.stringify(forNurse.retainers ?? [])).not.toContain("Elena Vargas");
  });

  test("RF-87 · Personal · cada transición de la cobertura exige el estado previo", async ({ api, data }) => {
    const ctx = { api, data };
    const date = "2027-04-13";
    await assign(ctx, date, [[NURSES.elena, 9]]);
    const { coverage } = await registerAbsence(ctx, NURSES.elena, date, "Descanso médico");
    const id = coverage.requestId!;
    const msg = async (role: Parameters<typeof api>[0], path: string, body?: unknown) =>
      (await (await (await api(role)).raw("POST", `/staff/coverage-requests/${id}/${path}`, body)).json()).message;

    expect(await msg("recursos_humanos", "authorize")).toBe("La jefatura debe aprobar la convocatoria antes que recursos humanos.");
    expect(await msg("enfermera_supervisora", "confirm", { userId: await memberId(ctx, NURSES.mariela) })).toBe(
      "Recursos humanos aún no autorizó la cobertura o el retén ya fue confirmado.",
    );
    await driveCoverage(ctx, id, "aprobada_jefatura");
    expect(await msg("jefatura_enfermeria", "approve")).toBe("Esta convocatoria ya fue gestionada por la jefatura.");
  });
});
