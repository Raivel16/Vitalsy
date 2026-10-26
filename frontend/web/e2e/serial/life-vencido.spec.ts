import { expect, test } from "../support/fixtures";
import { advanceAdmission, lifeLinkCode, registerEncounter } from "../support/scenarios";

test("RF-94 · Admisión · un código Life vencido (30 min) no vincula [E1c-08]", async ({ api, data, clock }) => {
  const ctx = { api, data };
  const enc = await advanceAdmission(ctx, await registerEncounter(ctx), "consentimiento");
  const { code } = await lifeLinkCode(ctx);
  await clock.advance(31);
  const res = await (await api("admision")).raw("POST", "/hospital-admission/life-links", { encounterId: enc.encounterId, code });
  expect(res.ok()).toBe(false);
  expect(await res.text()).toContain("code_expired");
});
