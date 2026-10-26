import { expect, test } from "../support/fixtures";

test("RNF-18 · Reloj · avanzar 10 min desplaza servidor y navegador", async ({ clock, asRole, api }) => {
  const page = await asRole("enfermera_piso");
  await page.goto("/");

  const before = Date.now();
  const at = await clock.advance(10);
  expect(at.getTime() - before).toBeGreaterThan(9.5 * 60_000);
  expect(at.getTime() - before).toBeLessThan(10.5 * 60_000);

  await (await api("enfermera_piso")).get("/auth/me");
  const browserNow = await page.evaluate(() => Date.now());
  expect(Math.abs(browserNow - at.getTime())).toBeLessThan(5_000);
});
