import { expect, test } from "../support/fixtures";
import { approveAssignments, hospitalize, registerAbsence, suggestAssignments } from "../support/scenarios";

test("registerAbsence de una enfermera con pacientes reasigna su carga", async ({ api, data }) => {
  const ctx = { api, data };
  const today = new Date().toISOString().slice(0, 10);
  const pacientes = [await hospitalize(ctx), await hospitalize(ctx), await hospitalize(ctx)];
  const nurses = ["rosa.quispe@vitalsy.local", "lucia.mendoza@vitalsy.local", "carmen.huaman@vitalsy.local"];
  const suggestion = await suggestAssignments(ctx, today, nurses);
  const mine = suggestion.assignments.filter((a) => pacientes.some((p) => p.encounterId === a.encounterId));
  expect(mine).toHaveLength(3);
  await approveAssignments(ctx, today, suggestion.assignments);
  const result = await registerAbsence(ctx, "rosa.quispe@vitalsy.local", today, "Descanso médico");
  expect(result).toHaveProperty("absence.id");
});
