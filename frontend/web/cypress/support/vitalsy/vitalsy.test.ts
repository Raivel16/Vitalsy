import { describe, expect, it, vi } from "vitest";
import { BED_PROFILES, hospitalize, patientFor, raiseAlert, type SessionFor } from "./scenarios";
import { VitalsyApiError, VitalsySession, type FetchLike } from "./session";
import { createVitalsyTasks, readEnvValue, roleEmail } from "./tasks";
import { EXPECTED_NEWS2, severityFor, vitalsBody, vitalsFor } from "./vitals";

const BASE = "http://localhost:8080";

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };
type Reply = { status?: number; body?: unknown; cookies?: string[]; headers?: Record<string, string> };

function reply({ status = 200, body = {}, cookies = [], headers = {} }: Reply): Response {
  const h = new Headers(headers);
  for (const cookie of cookies) h.append("set-cookie", cookie);
  return new Response(body === null ? null : JSON.stringify(body), { status, headers: h });
}

function fakeServer(route: (call: Call) => Reply) {
  const calls: Call[] = [];
  const fetcher: FetchLike = async (url, init) => {
    const call = {
      url,
      method: String(init.method),
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return reply(route(call));
  };
  return { calls, fetcher };
}

describe("VitalsySession", () => {
  it("inicia sesión con la cookie de Sanctum y envía el XSRF en las llamadas siguientes", async () => {
    const { calls, fetcher } = fakeServer((call) =>
      call.url.endsWith("/sanctum/csrf-cookie")
        ? { cookies: ["XSRF-TOKEN=abc%3D; path=/", "vitalsy_session=s1; path=/; httponly"] }
        : { body: { ok: true } },
    );
    const session = new VitalsySession(`${BASE}/`, fetcher);

    await session.login("enfermera_piso@vitalsy.local", "secreta");
    const data = await session.request<{ ok: boolean }>("GET", "/clinical-alerts/inbox");

    expect(data).toEqual({ ok: true });
    expect(calls[1]).toMatchObject({ url: `${BASE}/api/v1/auth/login`, method: "POST", body: { email: "enfermera_piso@vitalsy.local", password: "secreta" } });
    expect(calls[1].headers).toMatchObject({
      "X-XSRF-TOKEN": "abc=",
      Cookie: "XSRF-TOKEN=abc%3D; vitalsy_session=s1",
      Origin: BASE,
      "Content-Type": "application/json",
    });
    expect(calls[2].headers["Content-Type"]).toBeUndefined();
  });

  it("devuelve la respuesta sin interpretar y lanza un error legible si no es 2xx", async () => {
    const { fetcher } = fakeServer(() => ({ status: 422, body: { message: "La alerta ya está en atención." } }));
    const session = new VitalsySession(BASE, fetcher);

    await expect(session.raw("POST", "/clinical-alerts/1/acknowledge")).resolves.toEqual({
      status: 422,
      body: { message: "La alerta ya está en atención." },
    });
    await expect(session.request("POST", "/clinical-alerts/1/acknowledge")).rejects.toThrow(
      "POST /clinical-alerts/1/acknowledge → 422: La alerta ya está en atención.",
    );
  });

  it("describe errores sin mensaje y respuestas vacías", async () => {
    const { fetcher } = fakeServer((call) => (call.url.includes("vacio") ? { status: 204, body: null } : { status: 500, body: ["x"] }));
    const session = new VitalsySession(BASE, fetcher);

    await expect(session.raw("GET", "/vacio")).resolves.toEqual({ status: 204, body: null });
    const error = await session.request("GET", "/falla").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(VitalsyApiError);
    expect((error as VitalsyApiError).status).toBe(500);
    expect((error as VitalsyApiError).message).toContain('["x"]');
  });

  it("espera y reintenta cuando el servidor limita los intentos (429)", async () => {
    let attempts = 0;
    const { fetcher } = fakeServer(() => {
      attempts += 1;
      if (attempts === 1) return { status: 429, headers: { "retry-after": "3" } };
      if (attempts === 2) return { status: 429 };
      return { body: { ok: true } };
    });
    const wait = vi.fn(async () => undefined);
    const session = new VitalsySession(BASE, fetcher, wait);

    await expect(session.request("POST", "/auth/login", {})).resolves.toEqual({ ok: true });
    expect(wait.mock.calls).toEqual([[3000], [60_000]]);
  });

  it("deja de reintentar tras dos esperas", async () => {
    const { fetcher } = fakeServer(() => ({ status: 429, headers: { "retry-after": "1" } }));
    const session = new VitalsySession(BASE, fetcher, async () => undefined);

    await expect(session.raw("GET", "/auth/me")).resolves.toMatchObject({ status: 429 });
  });
});

describe("constantes vitales de los escenarios", () => {
  it("define perfiles con el NEWS2 y la severidad esperados", () => {
    expect(vitalsFor("normal")).toMatchObject({ respiratoryRate: 16, oxygenSaturation: 98, pulse: 76 });
    expect(vitalsFor("news2_alto")).toMatchObject({ respiratoryRate: 26, oxygenSaturation: 90, pulse: 115 });
    expect(vitalsBody("news2_medio")).toMatchObject({ respiratoryRate: 22, spo2Scale: "scale1", consciousness: "alert", supplementalOxygen: false });
    expect(EXPECTED_NEWS2).toEqual({ normal: 0, news2_medio: 5, news2_alto: 8 });
    expect(severityFor(EXPECTED_NEWS2.news2_alto)).toBe("alta");
    expect(severityFor(EXPECTED_NEWS2.news2_medio)).toBe("media");
  });
});

const STEPS = [
  "orden", "filiacion", "cobertura", "brazalete", "expediente", "consentimiento", "traslado", "identidad",
  "recepcion", "valoracion", "constantes", "conciliacion", "escalas", "kardex", "indicaciones", "cerrado",
];

type Recorded = { role: string; method: string; path: string; body?: unknown };

/** Simula la API por rol: el ingreso avanza un paso en cada POST /advance. */
function fakeApi(options: { bedConflicts?: number; noBeds?: boolean; bedsFor?: string; alertActivated?: boolean; inbox?: unknown[]; stuckAt?: string } = {}) {
  const recorded: Recorded[] = [];
  let step = 0;
  let conflicts = options.bedConflicts ?? 0;
  const encounter = () => ({
    encounterId: "ENC-CY-1",
    currentStep: STEPS[step],
    wristbandCode: step >= 4 ? "BRZ-1" : null,
    transferOrderNumber: "OT-1",
    location: { room: step >= 9 ? "601" : null, bed: step >= 9 ? "A" : null },
  });
  const respond = (role: string, method: string, path: string, body?: unknown): unknown => {
    recorded.push({ role, method, path, body });
    if (path === "/hospital-admission/encounters") return { encounter: encounter() };
    if (path.endsWith("/advance")) {
      if (STEPS[step] !== options.stuckAt) step += 1;
      return { encounter: encounter() };
    }
    if (path === "/hospital-admission/wristbands") return { wristband: { code: "BRZ-1" } };
    if (path === "/beds/requests") {
      const profile = body as { specialty: string; gender: string };
      const fits = !options.noBeds && (!options.bedsFor || options.bedsFor === `${profile.specialty}/${profile.gender}`);
      return { request: { id: 9 }, suggestions: fits ? [{ id: 1, room: "601", bedCode: "A" }, { id: 2, room: "602", bedCode: "B" }] : [] };
    }
    if (path.endsWith("/assign") && conflicts > 0) {
      conflicts -= 1;
      throw new VitalsyApiError(method, path, 422, { message: "Cama ocupada" });
    }
    if (path.endsWith("/vital-signs")) return { alertActivated: options.alertActivated ?? true };
    if (path === "/clinical-alerts/inbox") return { alerts: options.inbox ?? [] };
    return {};
  };
  const as: SessionFor = async (role) =>
    ({ request: async (method: string, path: string, body?: unknown) => respond(role, method, path, body) }) as unknown as VitalsySession;
  return { as, recorded };
}

describe("preparación de escenarios por API", () => {
  it("genera pacientes únicos con nombre en letras y DNI de 8 dígitos", () => {
    const a = patientFor(1_731_000_000_123);
    const b = patientFor(1_731_000_000_124);
    expect(a.fullName).toMatch(/^[A-Za-z]+ [A-Za-z]+ [A-Za-z]+$/);
    expect(a.dni).toMatch(/^\d{8}$/);
    expect(a.dni).not.toBe(b.dni);
    expect(patientFor(-5).dni).toBe("10000005");
  });

  it("lleva el ingreso por los pasos del módulo 1 hasta hospitalizarlo con cama", async () => {
    const { as, recorded } = fakeApi({ bedConflicts: 1 });

    const result = await hospitalize(as, 42);

    expect(result).toEqual({ encounterId: "ENC-CY-1", patientName: patientFor(42).fullName, room: "601", bed: "A" });
    const advances = recorded.filter((call) => call.path.endsWith("/advance"));
    expect(advances.map((call) => (call.body as { step: string }).step)).toEqual(STEPS.slice(0, -1));
    expect(advances.find((call) => (call.body as { step: string }).step === "cobertura")?.body).toMatchObject({ coverageStatus: "aprobada" });
    expect(advances.find((call) => (call.body as { step: string }).step === "indicaciones")?.role).toBe("medico_residente");
    expect(recorded.filter((call) => call.path.endsWith("/assign")).map((call) => call.body)).toEqual([{ bedId: 1 }, { bedId: 2 }]);
    expect(recorded.find((call) => call.path === "/hospital-admission/wristbands/verify")?.body).toEqual({ code: "BRZ-1" });
  });

  it("prueba otros perfiles de cama cuando la habitación no admite el primero", async () => {
    const { as, recorded } = fakeApi({ bedsFor: "cirugia/female" });

    await expect(hospitalize(as, 7)).resolves.toMatchObject({ room: "601", bed: "A" });
    expect(recorded.filter((call) => call.path === "/beds/requests").map((call) => (call.body as { specialty: string; gender: string }).gender)).toEqual(["female", "male", "female"]);
  });

  it("informa cuando no quedan camas o el ingreso no avanza", async () => {
    const full = fakeApi({ noBeds: true });
    await expect(hospitalize(full.as, 1)).rejects.toThrow("No hay camas disponibles para ENC-CY-1");
    expect(full.recorded.filter((call) => call.path === "/beds/requests")).toHaveLength(BED_PROFILES.length);
    await expect(hospitalize(fakeApi({ stuckAt: "kardex" }).as, 1)).rejects.toThrow("quedó en el paso kardex");
  });

  it("propaga errores de cama distintos de un conflicto", async () => {
    const failing: SessionFor = async () =>
      ({
        request: async (method: string, path: string) => {
          if (path.endsWith("/assign")) throw new Error("caída de red");
          return fakeApi().as("x").then((s) => s.request(method, path));
        },
      }) as unknown as VitalsySession;
    const { as } = fakeApi();
    const mixed: SessionFor = async (role) => (role === "gestion_camas" ? failing(role) : as(role));

    await expect(hospitalize(mixed, 1)).rejects.toThrow("caída de red");
  });

  it("rechaza un paso de admisión desconocido", async () => {
    const odd: SessionFor = async () =>
      ({ request: async () => ({ encounter: { encounterId: "ENC-X", currentStep: "derivacion", wristbandCode: null, transferOrderNumber: null, location: { room: null, bed: null } } }) }) as unknown as VitalsySession;

    await expect(hospitalize(odd, 1)).rejects.toThrow("Paso de admisión sin preparación: derivacion");
  });

  it("registra constantes alteradas y devuelve la alerta más reciente del paciente", async () => {
    const inbox = [
      { id: 3, encounterId: "ENC-CY-1", severity: "alta", news2Total: 8, status: "abierta" },
      { id: 7, encounterId: "ENC-CY-1", severity: "alta", news2Total: 8, status: "abierta" },
      { id: 9, encounterId: "ENC-OTRO", severity: "media", news2Total: 5, status: "abierta" },
    ];
    const { as, recorded } = fakeApi({ inbox });

    await expect(raiseAlert(as, "ENC-CY-1", "news2_alto")).resolves.toMatchObject({ id: 7 });
    expect(recorded[0]).toMatchObject({ role: "enfermera_piso", path: "/inpatient-care/encounters/ENC-CY-1/vital-signs", body: vitalsBody("news2_alto") });
  });

  it("falla si las constantes no activan alerta o la alerta no llega a la bandeja", async () => {
    await expect(raiseAlert(fakeApi({ alertActivated: false }).as, "ENC-CY-1", "news2_medio")).rejects.toThrow("no activaron alerta");
    await expect(raiseAlert(fakeApi().as, "ENC-CY-1", "news2_medio")).rejects.toThrow("no llegó a la bandeja");
  });
});

describe("tareas de Cypress", () => {
  it("lee valores del .env con o sin comillas", () => {
    const env = "# comentario\nAPP_KEY=base64:x\r\nDEMO_PASSWORD=\"Clave 123\"\nOTRA='uno'";
    expect(readEnvValue(env, "DEMO_PASSWORD")).toBe("Clave 123");
    expect(readEnvValue(env, "OTRA")).toBe("uno");
    expect(readEnvValue(env, "FALTA")).toBeUndefined();
    expect(roleEmail("admision")).toBe("admision@vitalsy.local");
  });

  it("reutiliza una sesión por rol y expone la API sin interpretar", async () => {
    const { calls, fetcher } = fakeServer((call) => (call.url.endsWith("/reports") ? { status: 403, body: { message: "No autorizado" } } : { body: {} }));
    const tasks = createVitalsyTasks({ baseUrl: BASE, password: "secreta", fetcher });

    await expect(tasks["vitalsy:api"]({ role: "enfermera_piso", method: "GET", path: "/clinical-alerts/reports" })).resolves.toEqual({
      status: 403,
      body: { message: "No autorizado" },
    });
    await tasks["vitalsy:api"]({ role: "enfermera_piso", method: "GET", path: "/clinical-alerts/inbox" });

    expect(calls.filter((call) => call.url.endsWith("/auth/login"))).toHaveLength(1);
    expect(calls.find((call) => call.url.endsWith("/auth/login"))?.body).toEqual({ email: "enfermera_piso@vitalsy.local", password: "secreta" });
  });

  it("vuelve a iniciar sesión si el intento anterior falló", async () => {
    let logins = 0;
    const { fetcher } = fakeServer((call) => {
      if (!call.url.endsWith("/auth/login")) return { body: { alerts: [] } };
      logins += 1;
      return logins === 1 ? { status: 401, body: { message: "Credenciales inválidas" } } : { body: {} };
    });
    const tasks = createVitalsyTasks({ baseUrl: BASE, password: "secreta", fetcher, seed: () => 5 });

    await expect(tasks["vitalsy:raiseAlert"]({ encounterId: "ENC-1", profile: "news2_medio" })).rejects.toThrow("401");
    await expect(tasks["vitalsy:api"]({ role: "enfermera_piso", method: "GET", path: "/clinical-alerts/inbox" })).resolves.toMatchObject({ status: 200 });
    await expect(tasks["vitalsy:hospitalize"]()).rejects.toThrow();
    expect(logins).toBe(3);
  });
});
