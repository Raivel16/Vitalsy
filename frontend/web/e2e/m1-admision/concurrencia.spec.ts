import { expect, test } from "../support/fixtures";
import { encounterBody } from "../support/scenarios";

// Dos mesas de admisión registran a la vez: cada ingreso debe recibir su propio ENC-….
test("RF-01 · Admisión · registros simultáneos reciben identificadores distintos", async ({ api, data }) => {
  const admision = await api("admision");
  const responses = await Promise.all(
    Array.from({ length: 4 }, () => admision.raw("POST", "/hospital-admission/encounters", encounterBody(data.patient(), data.orderNumber()))),
  );

  expect(responses.map((r) => r.status())).toEqual([201, 201, 201, 201]);
  const ids = await Promise.all(responses.map(async (r) => ((await r.json()) as { encounter: { encounterId: string } }).encounter.encounterId));
  expect(new Set(ids).size).toBe(4);
});
