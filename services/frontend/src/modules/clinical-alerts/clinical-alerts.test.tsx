import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-ALERT-0001",
  orderNumber: "OI-2026-ALERT-1",
  transferOrderNumber: null,
  patientName: "Paciente con Deterioro Demo",
  documentType: "DNI",
  documentNumber: "55443322",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "507", bed: "B", service: "Medicina" },
  wristbandCode: "BRZ-ALERT-0001",
  recordId: "EXP-ALERT-0001",
  subprocess: "3.1",
  subprocessLabel: "Alertas",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [],
};

const openAlert = {
  id: 7,
  encounterId: "ENC-ALERT-0001",
  patientName: "Paciente con Deterioro Demo",
  location: "Habitación 507, lecho B",
  source: "news2",
  severity: "alta",
  news2Total: 8,
  message: "NEWS2 8: se activa el proceso de gestión de alertas.",
  status: "abierta",
  assignedRole: "enfermera_piso",
  generatedAt: "2026-09-26T08:00:00+00:00",
  acknowledgeDueAt: "2026-09-26T08:05:00+00:00",
  medicalDueAt: null,
  closedAt: null,
};

function stubAlertApis(overrides?: {
  inbox?: unknown;
  timeline?: unknown;
  onCall?: (url: string, init?: RequestInit) => unknown;
}) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });

      const custom = overrides?.onCall?.(url, init);
      if (custom) return custom;

      if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
      if (url.includes("/clinical-alerts/inbox")) {
        return jsonResponse(200, overrides?.inbox ?? { alerts: [openAlert], pending: 1 });
      }
      if (url.includes("/timeline")) {
        return jsonResponse(200, overrides?.timeline ?? {
          alert: openAlert,
          events: [
            {
              id: 1,
              type: "generada",
              detail: "NEWS2 8: se activa el proceso de gestión de alertas.",
              role: null,
              userName: null,
              occurredAt: "2026-09-26T08:00:00+00:00",
            },
          ],
          escalations: [],
        });
      }
      if (url.includes("/acknowledge")) {
        return jsonResponse(200, { alert: { ...openAlert, status: "en_atencion" } });
      }
      if (url.includes("/medical-request")) {
        return jsonResponse(200, { alert: { ...openAlert, status: "medico_notificado", assignedRole: "medico_residente" } });
      }
      if (url.includes("/monitoring-schedule")) {
        return jsonResponse(200, {
          alert: { ...openAlert, status: "cerrada" },
          schedule: { nextDueAt: "2026-09-26T12:00:00+00:00", frequencyMinutes: 240 },
        });
      }
      if (url.includes("/observations")) {
        return jsonResponse(201, { alert: { ...openAlert, source: "observacion" } });
      }
      return jsonResponse(200, {});
    }),
  );

  return calls;
}

describe("bandeja de alertas clínicas (RF-34, RF-39)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("lista las alertas pendientes del perfil con su severidad y ubicación", async () => {
    stubAlertApis();
    renderApp("/alertas", { role: "enfermera_piso" });

    expect(await screen.findByText(/paciente con deterioro demo/i)).toBeInTheDocument();
    expect(screen.getByText(/habitación 507, lecho b/i)).toBeInTheDocument();
    expect(screen.getByText(/NEWS2 8/)).toBeInTheDocument();
  });

  it("confirma la recepción de la alerta y la retira de los pendientes", async () => {
    const calls = stubAlertApis();
    const user = userEvent.setup();
    renderApp("/alertas", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("button", { name: /confirmar recepción/i }));

    expect(await screen.findByRole("status", { name: /resultado/i })).toHaveTextContent(/confirmó la recepción/i);
    expect(calls.some((call) => call.url.includes("/clinical-alerts/7/acknowledge") && call.method === "POST")).toBe(true);
  });

  it("avisa cuando no hay alertas pendientes", async () => {
    stubAlertApis({ inbox: { alerts: [], pending: 0 } });
    renderApp("/alertas", { role: "enfermera_piso" });

    expect(await screen.findByText(/no tiene alertas pendientes/i)).toBeInTheDocument();
  });

  it("no deja entrar a un perfil ajeno al proceso de alertas", () => {
    stubAlertApis();
    renderApp("/alertas", { role: "admision" });

    expect(screen.getByRole("alert")).toHaveTextContent(/no está disponible para su perfil/i);
  });
});

describe("registro de deterioro imprevisto (RF-35)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("exige describir el deterioro antes de enviarlo", async () => {
    const calls = stubAlertApis();
    const user = userEvent.setup();
    renderApp("/alertas/deterioro?ingreso=ENC-ALERT-0001", { role: "auxiliar_enfermeria" });

    await user.click(await screen.findByRole("button", { name: /registrar deterioro/i }));

    expect(await screen.findByText(/describa el deterioro observado/i)).toBeInTheDocument();
    expect(calls.some((call) => call.url.includes("/observations"))).toBe(false);
  });

  it("registra el deterioro observado y avisa que la enfermera fue notificada", async () => {
    const calls = stubAlertApis();
    const user = userEvent.setup();
    renderApp("/alertas/deterioro?ingreso=ENC-ALERT-0001", { role: "auxiliar_enfermeria" });

    await user.type(
      await screen.findByLabelText(/deterioro observado/i),
      "Paciente sudoroso y con dificultad para hablar.",
    );
    await user.click(screen.getByRole("button", { name: /registrar deterioro/i }));

    expect(await screen.findByRole("status", { name: /resultado/i })).toHaveTextContent(/enfermera de piso/i);
    const observation = calls.find((call) => call.url.includes("/observations"));
    expect(observation?.body).toMatchObject({ encounterId: "ENC-ALERT-0001" });
  });
});

describe("atención de la alerta (RF-36, RF-37, RF-38)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("muestra el historial del evento y las acciones de la enfermera", async () => {
    stubAlertApis();
    renderApp("/alertas/7", { role: "enfermera_piso" });

    expect(await screen.findByText(/paciente con deterioro demo/i)).toBeInTheDocument();
    const history = screen.getByRole("region", { name: /historial del evento/i });
    expect(within(history).getByText(/se activa el proceso de gestión de alertas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /programar control/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solicitar atención médica/i })).toBeInTheDocument();
  });

  it("programa una nueva frecuencia de control", async () => {
    const calls = stubAlertApis();
    const user = userEvent.setup();
    renderApp("/alertas/7", { role: "enfermera_piso" });

    await user.clear(await screen.findByLabelText(/cada cuántos minutos/i));
    await user.type(screen.getByLabelText(/cada cuántos minutos/i), "240");
    await user.click(screen.getByRole("button", { name: /programar control/i }));

    const scheduled = calls.find((call) => call.url.includes("/monitoring-schedule"));
    expect(scheduled?.body).toMatchObject({ frequencyMinutes: 240 });
  });

  it("exige el motivo antes de solicitar atención médica", async () => {
    const calls = stubAlertApis();
    const user = userEvent.setup();
    renderApp("/alertas/7", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("button", { name: /solicitar atención médica/i }));

    expect(await screen.findByText(/indique por qué el caso requiere atención médica/i)).toBeInTheDocument();
    expect(calls.some((call) => call.url.includes("/medical-request"))).toBe(false);
  });

  it("solicita atención médica con el motivo registrado", async () => {
    const calls = stubAlertApis();
    const user = userEvent.setup();
    renderApp("/alertas/7", { role: "enfermera_piso" });

    await user.type(
      await screen.findByLabelText(/motivo de la atención médica/i),
      "Persiste taquipnea y preocupación clínica.",
    );
    await user.click(screen.getByRole("button", { name: /solicitar atención médica/i }));

    const request = calls.find((call) => call.url.includes("/medical-request"));
    expect(request?.body).toMatchObject({ reason: "Persiste taquipnea y preocupación clínica." });
  });

  it("ofrece al médico registrar la evaluación de urgencia", async () => {
    stubAlertApis({
      timeline: {
        alert: { ...openAlert, status: "medico_notificado", assignedRole: "medico_residente" },
        events: [],
        escalations: [],
      },
    });
    renderApp("/alertas/7", { role: "medico_residente" });

    expect(await screen.findByRole("button", { name: /registrar atención médica/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solicitar equipo de respuesta rápida/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /programar control/i })).not.toBeInTheDocument();
  });

  it("ofrece al equipo de respuesta rápida la orden de traslado a UCI", async () => {
    stubAlertApis({
      timeline: {
        alert: { ...openAlert, status: "err_solicitado", assignedRole: "equipo_respuesta_rapida" },
        events: [],
        escalations: [],
      },
    });
    renderApp("/alertas/7", { role: "equipo_respuesta_rapida" });

    expect(await screen.findByLabelText(/requiere traslado a cuidados intensivos/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /registrar evaluación del equipo/i })).toBeInTheDocument();
  });
});
