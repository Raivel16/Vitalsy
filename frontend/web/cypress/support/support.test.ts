// RF-114: pruebas Vitest de la configuración de Cypress y de los comandos de `support/e2e.ts`
// con dobles de `Cypress` y `cy`; los escenarios *.cy.ts se ejecutan con Cypress contra la app real.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Fn = (...args: never[]) => unknown;
type Call = { name: string; args: unknown[] };

const { readFileSync } = vi.hoisted(() => ({ readFileSync: vi.fn() }));
vi.mock("node:fs", () => ({ readFileSync, default: { readFileSync } }));
vi.mock("cypress", () => ({ defineConfig: <T>(config: T) => config }));

/** Cadena mínima de Cypress: `then` entrega el valor y el resto de métodos encadena. */
function chain(value: unknown, calls: Call[]) {
  const self = {
    then: (callback: (input: unknown) => unknown) => callback(value),
    its: (key: string) => {
      calls.push({ name: "its", args: [key] });
      return self;
    },
    should: (...args: unknown[]) => {
      calls.push({ name: "should", args });
      return self;
    },
    closest: (selector: string) => {
      calls.push({ name: "closest", args: [selector] });
      return self;
    },
  };
  return self;
}

function fakeCypress(loginStatuses: number[], { cookie = { value: "token%3D" } as { value: string } | null, baseUrl = "http://localhost:8080" as string | null } = {}) {
  const calls: Call[] = [];
  const commands: Record<string, Fn> = {};
  const record = (name: string, value: unknown = undefined) => (...args: unknown[]) => {
    calls.push({ name, args });
    return chain(value, calls);
  };
  const cy = {
    request: (options: unknown) => {
      calls.push({ name: "request", args: [options] });
      const isLogin = typeof options === "object" && options !== null && (options as { url: string }).url === "/api/v1/auth/login";
      return chain(isLogin ? { status: loginStatuses.shift() ?? 200 } : { status: 200 }, calls);
    },
    env: record("env", { DEMO_PASSWORD: "clave-demo" }),
    getCookie: record("getCookie", cookie),
    wait: record("wait"),
    task: record("task", { ok: true }),
    get: record("get"),
    session: (id: string, setup: () => void, options: { validate: () => void }) => {
      calls.push({ name: "session", args: [id, options] });
      setup();
      options.validate();
    },
  };
  const Cypress = {
    Screenshot: { defaults: (options: unknown) => calls.push({ name: "screenshotDefaults", args: [options] }) },
    Commands: { add: (name: string, implementation: Fn) => (commands[name] = implementation) },
    config: (key: string) => (key === "baseUrl" ? baseUrl : undefined),
  };
  vi.stubGlobal("cy", cy);
  vi.stubGlobal("Cypress", Cypress);
  return { calls, commands };
}

const loginRequests = (calls: Call[]) =>
  calls.filter((call) => call.name === "request" && (call.args[0] as { url?: string }).url === "/api/v1/auth/login");

describe("comandos de soporte de Cypress", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it("registra los cinco comandos del módulo de alertas", async () => {
    const { commands } = fakeCypress([]);
    await import("./e2e");
    expect(Object.keys(commands).sort()).toEqual(["alertCard", "hospitalize", "loginAs", "raiseAlert", "vitalsyApi"]);
  });

  it("captura solo el área visible para no repetir el menú lateral", async () => {
    const { calls } = fakeCypress([]);
    await import("./e2e");
    expect(calls).toContainEqual({ name: "screenshotDefaults", args: [{ capture: "viewport" }] });
  });

  it("inicia sesión por API con XSRF y valida la sesión cacheada", async () => {
    const { calls, commands } = fakeCypress([200]);
    await import("./e2e");
    commands.loginAs("enfermera_piso" as never);

    const [login] = loginRequests(calls);
    const options = login.args[0] as { headers: Record<string, string>; body: { email: string; password: string } };
    expect(options.body).toEqual({ email: "enfermera_piso@vitalsy.local", password: "clave-demo" });
    expect(options.headers["X-XSRF-TOKEN"]).toBe("token=");
    expect(options.headers.Referer).toBe("http://localhost:8080/");
    expect(calls.find((call) => call.name === "session")?.args[1]).toMatchObject({ cacheAcrossSpecs: true });
    expect(calls).toContainEqual({ name: "request", args: ["/api/v1/auth/me"] });
    expect(calls).toContainEqual({ name: "should", args: ["eq", 200] });
  });

  it("espera y reintenta cuando el login responde 429", async () => {
    const { calls, commands } = fakeCypress([429, 200]);
    await import("./e2e");
    commands.loginAs("admision" as never);

    expect(loginRequests(calls)).toHaveLength(2);
    expect(calls).toContainEqual({ name: "wait", args: [61_000] });
  });

  it("envía cabeceras vacías si falta la cookie XSRF o la URL base", async () => {
    const { calls, commands } = fakeCypress([200], { cookie: null, baseUrl: null });
    await import("./e2e");
    commands.loginAs("camillero" as never);

    const headers = (loginRequests(calls)[0].args[0] as { headers: Record<string, string> }).headers;
    expect(headers).toMatchObject({ "X-XSRF-TOKEN": "", Origin: "", Referer: "/" });
  });

  it("no reintenta más de dos veces y falla con el estado recibido", async () => {
    const { commands } = fakeCypress([429, 429, 429]);
    await import("./e2e");
    expect(() => commands.loginAs("admision" as never)).toThrow("inicio de sesión de admision");
  });

  it("delegan en las tareas de Node y ubican la tarjeta de la alerta", async () => {
    const { calls, commands } = fakeCypress([]);
    await import("./e2e");
    commands.hospitalize();
    commands.raiseAlert("ENC-1" as never, "news2_alto" as never);
    commands.vitalsyApi("medico_residente" as never, "GET" as never, "/clinical-alerts/inbox" as never);
    commands.alertCard(42 as never);

    expect(calls.filter((call) => call.name === "task").map((call) => call.args.slice(0, 2))).toEqual([
      ["vitalsy:hospitalize", null],
      ["vitalsy:raiseAlert", { encounterId: "ENC-1", profile: "news2_alto" }],
      ["vitalsy:api", { role: "medico_residente", method: "GET", path: "/clinical-alerts/inbox", body: undefined }],
    ]);
    expect(calls).toContainEqual({ name: "get", args: ['.alert-card a[href="/alertas/42"]', { timeout: 30_000 }] });
    expect(calls).toContainEqual({ name: "closest", args: [".alert-card"] });
  });
});

describe("configuración de Cypress", () => {
  type Config = { env: Record<string, string> };
  type E2e = {
    baseUrl: string;
    viewportWidth: number;
    viewportHeight: number;
    retries: { runMode: number; openMode: number };
    requestTimeout: number;
    responseTimeout: number;
    setupNodeEvents: (on: (event: string, handler: unknown) => void, config: Config) => Config;
  };
  type Launch = { preferences: Record<string, unknown>; args: string[] };
  type BeforeLaunch = (browser: { name: string; family: string }, options: Launch) => Launch;

  async function load(env: Record<string, string | undefined>) {
    vi.resetModules();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value as string);
    const { default: config } = (await import("../../cypress.config")) as unknown as { default: { e2e: E2e } };
    const on = vi.fn();
    const resolved = config.e2e.setupNodeEvents(on, { env: {} });
    return { e2e: config.e2e, on, resolved };
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    readFileSync.mockReset();
  });

  it("usa CYPRESS_BASE_URL y CYPRESS_DEMO_PASSWORD y registra las tareas", async () => {
    const { e2e, on, resolved } = await load({ CYPRESS_BASE_URL: "http://otra:9000", CYPRESS_DEMO_PASSWORD: "de-entorno" });
    expect(e2e.baseUrl).toBe("http://otra:9000");
    expect(resolved.env.DEMO_PASSWORD).toBe("de-entorno");
    expect(on).toHaveBeenCalledWith("task", expect.objectContaining({ "vitalsy:hospitalize": expect.any(Function) }));
    expect(readFileSync).not.toHaveBeenCalled();
  });

  it("abre el navegador del tamaño de la vista para que las capturas no se recorten", async () => {
    const { e2e, on } = await load({ CYPRESS_DEMO_PASSWORD: "x" });
    const handler = on.mock.calls.find(([event]) => event === "before:browser:launch")?.[1] as BeforeLaunch;
    const launch = (name: string, family: string) => handler({ name, family }, { preferences: {}, args: [] });

    expect([e2e.viewportWidth, e2e.viewportHeight]).toEqual([1920, 1080]);
    expect(launch("electron", "chromium").preferences).toEqual({ width: 1920, height: 1080 });
    expect(launch("chrome", "chromium").args).toEqual(["--window-size=1920,1080", "--force-device-scale-factor=1"]);
    expect(launch("firefox", "firefox").args).toEqual(["--width=1920", "--height=1080"]);
    expect(launch("webkit", "webkit")).toEqual({ preferences: {}, args: [] });
  });

  it("tolera un servidor de desarrollo lento: espera las peticiones y reintenta una vez en la terminal", async () => {
    const { e2e } = await load({ CYPRESS_DEMO_PASSWORD: "x" });
    expect(e2e.retries).toEqual({ runMode: 1, openMode: 0 });
    expect(e2e.requestTimeout).toBeGreaterThanOrEqual(20_000);
    expect(e2e.responseTimeout).toBeGreaterThanOrEqual(60_000);
  });

  it("lee DEMO_PASSWORD del .env de la raíz si no hay variable", async () => {
    readFileSync.mockReturnValue("APP_KEY=x\nDEMO_PASSWORD=desde-archivo\n");
    const { e2e, resolved } = await load({ CYPRESS_BASE_URL: undefined, CYPRESS_DEMO_PASSWORD: "" });
    expect(e2e.baseUrl).toBe("http://localhost:8080");
    expect(resolved.env.DEMO_PASSWORD).toBe("desde-archivo");
  });

  it("deja la clave vacía si el .env no existe o no la define", async () => {
    readFileSync.mockImplementationOnce(() => {
      throw new Error("ENOENT");
    });
    expect((await load({ CYPRESS_DEMO_PASSWORD: "" })).resolved.env.DEMO_PASSWORD).toBe("");
    readFileSync.mockReturnValueOnce("APP_KEY=x\n");
    expect((await load({ CYPRESS_DEMO_PASSWORD: "" })).resolved.env.DEMO_PASSWORD).toBe("");
  });
});
