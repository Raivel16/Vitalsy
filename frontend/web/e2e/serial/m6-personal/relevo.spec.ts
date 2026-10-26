import { expect, test } from "../../support/fixtures";
import { approveAssignments, hospitalize, memberId, publishPlan, recordVitals, type Ctx } from "../../support/scenarios";
import { NURSES, UNIT, utc } from "./personas";

// Mes propio de este archivo: 2027-03. Rosa (día) entrega a Lucía (noche) el 2027-03-10.
const DAY = "2027-03-10";

async function prepareRelief(ctx: Ctx, opts: { lucíaUnit?: string } = {}) {
  await publishPlan(ctx, "2027-03", [
    { email: NURSES.rosa, startsAt: utc(DAY, "07:00"), endsAt: utc(DAY, "19:00"), unit: UNIT },
    { email: NURSES.lucia, startsAt: utc(DAY, "19:00"), endsAt: utc("2027-03-11", "07:00"), unit: opts.lucíaUnit ?? UNIT },
  ]);
  const rosaId = await memberId(ctx, NURSES.rosa);
  const patients = [await hospitalize(ctx), await hospitalize(ctx)];
  await recordVitals(ctx, patients[0], ctx.data.vitals("news2_medio"));
  await approveAssignments(ctx, DAY, patients.map((p) => ({ nurseUserId: rosaId, encounterId: p.encounterId })));
  return { patients, rosaId };
}

test.describe("relevo de turno (RF-81–83)", () => {
  test("RF-83 · Personal · la entrante consolida y firma la recepción del turno [E6-01][E6-02][E6-03]", async ({ api, apiAs, asUser, data, clock }) => {
    const ctx = { api, data };
    const { patients, rosaId } = await prepareRelief(ctx);
    await clock.set(utc(DAY, "18:30"));

    const page = await asUser(NURSES.lucia);
    await page.goto("/personal");
    const candidate = page.getByRole("radio", { name: /Rosa Quispe/ });
    await expect(candidate).toBeVisible();
    await expect(page.getByText(new RegExp(`${UNIT} · termina .+ · 2 paciente\\(s\\)`))).toBeVisible();
    await candidate.check();
    await page.getByRole("button", { name: "Consolidar handover" }).click();
    for (const p of patients) await expect(page.getByText(p.patient.fullName).first()).toBeVisible();
    await expect(page.getByText(/NEWS2/).first()).toBeVisible();
    await page.getByRole("button", { name: "Firmar recepción de turno" }).click();
    await expect(page.getByText("Recepción de turno firmada.")).toBeVisible();

    const preview = await (await apiAs(NURSES.lucia)).get<{ handover: { patients: { encounterId: string }[] } }>(`/staff/handover?shiftDate=${DAY}`);
    expect(preview.handover.patients.map((p) => p.encounterId).sort()).toEqual(patients.map((p) => p.encounterId).sort());
    // La saliente ya no conserva pacientes ese día: quedaron con la entrante.
    const rosaLeft = await (await apiAs(NURSES.lucia)).get<{ handover: { patients: unknown[] } }>(`/staff/handover?shiftDate=${DAY}&fromUserId=${rosaId}`);
    expect(rosaLeft.handover.patients).toEqual([]);
  });

  test("RF-81 · Personal · la saliente no tiene candidatas para recibir [E6-04]", async ({ api, apiAs, data, clock }) => {
    await prepareRelief({ api, data });
    await clock.set(utc(DAY, "18:30"));
    const res = await (await apiAs(NURSES.rosa)).get<{ candidates: unknown[] }>(`/staff/handover/candidates?shiftDate=${DAY}`);
    expect(res.candidates).toEqual([]);
  });

  test("RF-81 · Personal · fuera de la ventana del cambio de turno no hay relevo", async ({ api, asUser, data, clock }) => {
    await prepareRelief({ api, data });
    await clock.set(utc(DAY, "21:30"));
    const page = await asUser(NURSES.lucia);
    await page.goto("/personal");
    await expect(page.getByText("No hay un relevo disponible ahora.")).toBeVisible();
  });

  test("RF-82 · Personal · no hay relevo entre servicios distintos", async ({ api, apiAs, data, clock }) => {
    const { rosaId } = await prepareRelief({ api, data }, { lucíaUnit: "Cirugía B" });
    await clock.set(utc(DAY, "18:30"));
    const res = await (await apiAs(NURSES.lucia)).raw("POST", "/staff/handover", { fromUserId: rosaId, shiftDate: DAY });
    expect(res.status()).toBe(422);
    expect((await res.json()).message).toBe("La entrega solo procede en el cambio de turno, entre turnos consecutivos del mismo servicio del rol publicado.");
  });
});
