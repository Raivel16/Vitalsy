import { test as base, expect, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "@playwright/test";
import { ROLE_LABEL, type Role } from "../../src/app/roles";
import { ApiSession } from "./api";
import { DataGen, runSeed, testSeed } from "./data";
import { artisan } from "./env";
import { roleEmail, rolePassword, sessionFile } from "./sessions";

// RNF-18: fixtures comunes. Cada prueba tiene datos propios (semilla por título), sesiones
// cacheadas por rol, reloj E2E y un control automático de errores 5xx y de consola.

export type Clock = {
  advance(minutes: number): Promise<Date>;
  set(at: Date): Promise<Date>;
  reset(): Promise<void>;
};

type Fixtures = {
  data: DataGen;
  api: (role: Role) => Promise<ApiSession>;
  asRole: (role: Role) => Promise<Page>;
  freshLogin: (role: Role) => Promise<Page>;
  clock: Clock;
  allowErrors: (pattern: RegExp) => void;
  pages: Page[];
  errorWatch: void;
};

const RELOJ = /Reloj E2E: (\S+)/;

function parseClock(output: string): Date {
  const iso = RELOJ.exec(output)?.[1];
  if (!iso) throw new Error(`Salida inesperada de e2e:clock: ${output}`);
  return new Date(iso);
}

type Internal = { clockOffsetMs: { value: number | null }; allowedErrors: RegExp[] };
type Options = { quietAlerts: boolean };

// Las alertas que generan otras pruebas en paralelo aparecen como avisos emergentes para
// todos los roles de alertas y tapan los controles. Fuera de las pruebas de alertas
// (test.use({ quietAlerts: false })) se ocultan y se desactivan las animaciones.
const QUIET_CSS = ".toast-stack{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important}";

async function newRoleContext(browser: Browser, options: BrowserContextOptions, quiet: boolean): Promise<BrowserContext> {
  const context = await browser.newContext(options);
  if (quiet) {
    await context.addInitScript((css) => {
      const style = () => document.head.appendChild(Object.assign(document.createElement("style"), { textContent: css }));
      if (document.head) style();
      else document.addEventListener("DOMContentLoaded", style);
    }, QUIET_CSS);
  }
  return context;
}

export const test = base.extend<Fixtures & Internal & Options>({
  quietAlerts: [true, { option: true }],

  data: async ({}, use, testInfo) => {
    const gen = new DataGen(testSeed(runSeed(), testInfo.titlePath));
    await use(gen);
    await testInfo.attach("datos.json", {
      contentType: "application/json",
      body: JSON.stringify({ semillaCorrida: runSeed(), semillaPrueba: gen.seed, prueba: testInfo.titlePath, entidades: gen.tracked }, null, 2),
    });
  },

  api: async ({}, use) => {
    const opened = new Map<Role, ApiSession>();
    await use(async (role) => {
      let session = opened.get(role);
      if (!session) {
        session = await ApiSession.fromStorage(sessionFile(role));
        opened.set(role, session);
      }
      return session;
    });
    for (const session of opened.values()) await session.dispose();
  },

  pages: async ({ page }, use, testInfo) => {
    const pages: Page[] = [];
    await use(pages);
    const failed = testInfo.status !== testInfo.expectedStatus;
    for (const [i, p] of pages.entries()) {
      if (p === page || p.isClosed()) continue;
      if (failed) {
        const body = await p.screenshot({ fullPage: true }).catch(() => null);
        if (body) await testInfo.attach(`pantalla-${i + 1}.png`, { body, contentType: "image/png" });
      }
      // Los contextos de asRole/freshLogin son propios de la prueba: se cierran al terminar
      // (si no, se acumulan en el worker y las capturas de fallo mezclan pruebas).
      await p.context().close();
    }
  },

  clockOffsetMs: async ({}, use) => {
    await use({ value: null });
  },

  asRole: async ({ browser, pages, clockOffsetMs, quietAlerts }, use, testInfo) => {
    const { baseURL, locale, timezoneId } = testInfo.project.use;
    await use(async (role) => {
      const context = await newRoleContext(browser, { baseURL, locale, timezoneId, storageState: sessionFile(role) }, quietAlerts);
      const page = await context.newPage();
      if (clockOffsetMs.value !== null) await page.clock.setSystemTime(new Date(Date.now() + clockOffsetMs.value));
      pages.push(page);
      return page;
    });
  },

  freshLogin: async ({ browser, pages, quietAlerts }, use, testInfo) => {
    const { baseURL, locale, timezoneId } = testInfo.project.use;
    await use(async (role) => {
      const context = await newRoleContext(browser, { baseURL, locale, timezoneId }, quietAlerts);
      const page = await context.newPage();
      pages.push(page);
      await page.goto("/");
      await page.locator("#email").fill(roleEmail(role));
      await page.locator("#password").fill(rolePassword());
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page.getByText(`Su perfil es ${ROLE_LABEL[role]}`)).toBeVisible();
      return page;
    });
  },

  clock: async ({ pages, clockOffsetMs }, use) => {
    const sync = async (output: string) => {
      const at = parseClock(output);
      clockOffsetMs.value = at.getTime() - Date.now();
      for (const page of pages) await page.clock.setSystemTime(at);
      return at;
    };
    await use({
      advance: async (minutes) => sync(artisan("e2e:clock", "advance", `--minutes=${minutes}`)),
      set: async (at) => sync(artisan("e2e:clock", "set", `--at=${at.toISOString()}`)),
      reset: async () => {
        artisan("e2e:clock", "reset");
        clockOffsetMs.value = null;
      },
    });
    // Siempre, aunque la prueba falle: la siguiente no debe heredar una hora falsa.
    if (clockOffsetMs.value !== null) artisan("e2e:clock", "reset");
  },

  allowedErrors: async ({}, use) => {
    await use([]);
  },

  allowErrors: async ({ allowedErrors }, use) => {
    await use((pattern) => {
      allowedErrors.push(pattern);
    });
  },

  errorWatch: [
    async ({ page, pages, allowedErrors: allowed }, use, testInfo) => {
      const problems: string[] = [];
      const watch = (p: Page) => {
        p.on("response", (res) => {
          if (res.url().includes("/api/") && res.status() >= 500) problems.push(`HTTP ${res.status()} ${res.request().method()} ${res.url()}`);
        });
        p.on("console", (msg) => {
          if (msg.type() !== "error") return;
          const text = msg.text();
          // Los 4xx esperados (validaciones, 403 de permisos) también se registran como error de consola.
          if (/Failed to load resource: the server responded with a status of 4\d\d/.test(text)) return;
          problems.push(`consola: ${text}`);
        });
      };
      watch(page);
      const push = pages.push.bind(pages);
      pages.push = (...added: Page[]) => {
        added.forEach(watch);
        return push(...added);
      };
      await use();
      const unexpected = problems.filter((p) => !allowed.some((re) => re.test(p)));
      if (unexpected.length > 0 && testInfo.status === testInfo.expectedStatus) {
        throw new Error(`Errores del servidor o de consola durante la prueba:\n${unexpected.join("\n")}`);
      }
    },
    { auto: true },
  ],
});

export { expect };
