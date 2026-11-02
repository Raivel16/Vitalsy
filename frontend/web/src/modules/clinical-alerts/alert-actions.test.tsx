import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const baseAlert = {
  id: 9,
  encounterId: "ENC-ACT-0001",
  patientName: "Paciente Acciones",
  location: "Habitación 301, lecho A",
  source: "news2",
  severity: "alta",
  news2Total: 6,
  message: "NEWS2 6",
  status: "en_atencion",
  assignedRole: "enfermera_piso",
  generatedAt: "2026-09-26T08:00:00+00:00",
  acknowledgeDueAt: null,
  followUpDueAt: "2026-09-26T08:18:00+00:00",
  reassessedAt: null,
  medicalDueAt: null,
  closedAt: null,
  needsSiren: false,
  icuTransfer: null as unknown,
};

const encounter = {
  encounterId: "ENC-ACT-0001",
  patientName: "Paciente Acciones",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  statusLabel: "Hospitalizado",
  documentType: "DNI",
  documentNumber: "1",
  location: { room: "301", bed: "A", service: "Medicina" },
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  deliverables: [],
  progress: [],
};

function stubApi(alert: Record<string, unknown>, events: unknown[] = []) {
  const calls: Array<{ url: string; method: string; body: Record<string, unknown> | null }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : null });
      if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
      if (url.includes("/timeline")) return jsonResponse(200, { alert, events, escalations: [] });
      return jsonResponse(200, { medicalNotified: false });
    }),
  );
  return calls;
}

function posted(calls: ReturnType<typeof stubApi>, action: string) {
  return calls.find((call) => call.method === "POST" && call.url.endsWith(`/${action}`));
}

describe("acciones del evento de alerta", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("confirma la lectura de la alerta pendiente", async () => {
    const calls = stubApi({ ...baseAlert, status: "abierta", needsSiren: true });
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("button", { name: /confirmar recepción/i }));

    expect(posted(calls, "acknowledge")).toBeTruthy();
    expect(await screen.findByText(/confirmó la lectura/i)).toBeInTheDocument();
  });

  it("valida las constantes antes de recalcular NEWS2 y envía la nueva toma", async () => {
    const calls = stubApi(baseAlert);
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("button", { name: /recalcular news2/i }));
    expect(posted(calls, "reassessment")).toBeUndefined();

    await user.type(screen.getByLabelText(/frecuencia respiratoria/i), "18");
    await user.type(screen.getByLabelText(/saturación/i), "97");
    await user.type(screen.getByLabelText(/sistólica/i), "120");
    await user.type(screen.getByLabelText(/diastólica/i), "80");
    await user.type(screen.getByLabelText(/pulso/i), "76");
    await user.type(screen.getByLabelText(/temperatura/i), "36.6");
    await user.click(screen.getByRole("button", { name: /recalcular news2/i }));

    expect(posted(calls, "reassessment")?.body).toMatchObject({ respiratoryRate: 18, oxygenSaturation: 97, pulse: 76 });
    expect(await screen.findByText(/se recalculó el news2/i)).toBeInTheDocument();
  });

  it("mantiene el aviso de éxito aunque la alerta cambie de estado y el panel desaparezca", async () => {
    let current: Record<string, unknown> = baseAlert;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/timeline")) return jsonResponse(200, { alert: current, events: [], escalations: [] });
        if (init?.method === "POST") {
          current = { ...baseAlert, status: "medico_notificado", assignedRole: "medico_residente" };
          return jsonResponse(200, { medicalNotified: true });
        }
        return jsonResponse(200, {});
      }),
    );
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "enfermera_piso" });

    await user.type(await screen.findByLabelText(/frecuencia respiratoria/i), "24");
    await user.type(screen.getByLabelText(/saturación/i), "91");
    await user.type(screen.getByLabelText(/sistólica/i), "100");
    await user.type(screen.getByLabelText(/diastólica/i), "70");
    await user.type(screen.getByLabelText(/pulso/i), "110");
    await user.type(screen.getByLabelText(/temperatura/i), "38.4");
    await user.click(screen.getByRole("button", { name: /recalcular news2/i }));

    expect(await screen.findByText(/se notificó automáticamente al médico de guardia/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /recalcular news2/i })).not.toBeInTheDocument();
  });

  it("rechaza una frecuencia de control fuera de rango", async () => {
    const calls = stubApi({ ...baseAlert, reassessedAt: "2026-09-26T08:10:00+00:00", news2Total: 0 });
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "enfermera_piso" });

    const field = await screen.findByLabelText(/cada cuántos minutos/i);
    await user.clear(field);
    await user.type(field, "5");
    await user.click(screen.getByRole("button", { name: /programar control/i }));

    expect(await screen.findByText(/entre 15 y 1440 minutos/i)).toBeInTheDocument();
    expect(posted(calls, "monitoring-schedule")).toBeUndefined();
  });

  it("registra la atención médica con evaluación e indicaciones", async () => {
    const calls = stubApi({ ...baseAlert, status: "medico_en_atencion", assignedRole: "medico_residente" });
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "medico_residente" });

    await user.click(await screen.findByRole("button", { name: /registrar atención médica/i }));
    expect(await screen.findByText(/registre la evaluación y las indicaciones/i)).toBeInTheDocument();
    expect(posted(calls, "medical-assessment")).toBeUndefined();

    await user.type(screen.getByLabelText(/evaluación del paciente/i), "Paciente estable tras oxigenoterapia.");
    await user.type(screen.getByLabelText(/indicaciones médicas de urgencia/i), "Control en una hora y oxígeno.");
    await user.click(screen.getByRole("button", { name: /registrar atención médica/i }));

    expect(posted(calls, "medical-assessment")?.body).toMatchObject({
      assessment: "Paciente estable tras oxigenoterapia.",
      orders: "Control en una hora y oxígeno.",
    });
    expect(await screen.findByText(/se registró la atención médica/i)).toBeInTheDocument();
  });

  it("solicita el equipo de respuesta rápida con motivo", async () => {
    const calls = stubApi({ ...baseAlert, status: "medico_en_atencion", assignedRole: "medico_residente" });
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "medico_residente" });

    await user.click(await screen.findByRole("button", { name: /solicitar equipo de respuesta rápida/i }));
    expect(await screen.findByText(/indique por qué se requiere el equipo/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/motivo de la intervención especializada/i), "No responde al tratamiento.");
    await user.click(screen.getByRole("button", { name: /solicitar equipo de respuesta rápida/i }));

    expect(posted(calls, "rapid-response-request")?.body).toMatchObject({ reason: "No responde al tratamiento." });
    expect(await screen.findByText(/se solicitó la intervención del equipo/i)).toBeInTheDocument();
  });

  it("registra la evaluación del equipo y emite la orden de UCI", async () => {
    const calls = stubApi({ ...baseAlert, status: "err_solicitado", assignedRole: "equipo_respuesta_rapida" });
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "equipo_respuesta_rapida" });

    await user.click(await screen.findByRole("button", { name: /registrar evaluación del equipo/i }));
    expect(await screen.findByText(/registre la evaluación del equipo de respuesta rápida/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/evaluación del paciente/i), "Requiere soporte ventilatorio.");
    await user.click(screen.getByLabelText(/requiere traslado a cuidados intensivos/i));
    await user.click(screen.getByRole("button", { name: /registrar evaluación del equipo/i }));

    expect(posted(calls, "err-assessment")?.body).toMatchObject({
      assessment: "Requiere soporte ventilatorio.",
      transferToIcu: true,
    });
    expect(await screen.findByText(/se emitió la orden de uci/i)).toBeInTheDocument();
  });

  it("autoriza el traslado a UCI y muestra el ciclo", async () => {
    const calls = stubApi({
      ...baseAlert,
      status: "orden_uci",
      assignedRole: "medico_residente",
      icuTransfer: { ordered: true, orderedAt: "2026-09-26T09:00:00+00:00", doctorAuthorized: false, nurseAuthorized: false },
    });
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "medico_residente" });

    expect(await screen.findByText(/autorización médica: pendiente/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /autorizar traslado a uci/i }));

    expect(posted(calls, "icu-authorize")).toBeTruthy();
    expect(await screen.findByText(/autorización de traslado a uci registrada/i)).toBeInTheDocument();
  });

  it("registra el traslado efectivo a UCI", async () => {
    const calls = stubApi({
      ...baseAlert,
      status: "uci_autorizada",
      icuTransfer: { ordered: true, doctorAuthorized: true, nurseAuthorized: true },
    });
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("button", { name: /registrar traslado efectivo/i }));

    expect(posted(calls, "icu-transfer")?.body).toMatchObject({ service: "UCI", room: "UCI-1", bed: "A" });
    expect(await screen.findByText(/traslado efectivo a uci registrado/i)).toBeInTheDocument();
  });

  it("registra el retorno a sala general", async () => {
    const calls = stubApi({
      ...baseAlert,
      status: "en_uci",
      icuTransfer: { ordered: true, doctorAuthorized: true, nurseAuthorized: true },
    });
    const user = userEvent.setup();
    renderApp("/alertas/9", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("button", { name: /registrar retorno a sala/i }));

    expect(posted(calls, "icu-return")?.body).toMatchObject({ service: "Medicina", room: "507", bed: "B" });
    expect(await screen.findByText(/retorno a sala registrado/i)).toBeInTheDocument();
  });

  describe("según el origen de la alerta", () => {
    const doseAlert = {
      ...baseAlert,
      source: "emar",
      news2Total: null,
      message: "Dosis pendiente de Omeprazol. Administre en e-MAR.",
    };

    it("una dosis pendiente lleva al e-MAR y no pide constantes", async () => {
      stubApi(doseAlert);
      renderApp("/alertas/9", { role: "enfermera_piso" });

      expect(await screen.findByRole("link", { name: /administrar en e-mar/i })).toHaveAttribute(
        "href",
        "/atencion/emar?ingreso=ENC-ACT-0001",
      );
      expect(screen.queryByRole("button", { name: /recalcular news2/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /programar control/i })).not.toBeInTheDocument();
    });

    it("una dosis pendiente permite solicitar atención médica con motivo", async () => {
      const calls = stubApi(doseAlert);
      const user = userEvent.setup();
      renderApp("/alertas/9", { role: "enfermera_piso" });

      await user.type(await screen.findByLabelText(/motivo de la atención médica/i), "El paciente rechaza la dosis");
      await user.click(screen.getByRole("button", { name: /solicitar atención médica/i }));

      expect(posted(calls, "medical-request")?.body).toEqual({ reason: "El paciente rechaza la dosis" });
    });

    it("un control vencido conserva la toma de constantes y enlaza a Controles", async () => {
      stubApi({ ...doseAlert, source: "control", message: "Control de constantes vencido." });
      renderApp("/alertas/9", { role: "enfermera_piso" });

      expect(await screen.findByRole("button", { name: /recalcular news2/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /abrir controles/i })).toHaveAttribute("href", "/atencion/controles");
    });

    it.each([
      ["emar", /dosis pendiente/i],
      ["control", /control vencido/i],
      ["observacion", /deterioro observado/i],
    ])("la bandeja etiqueta el origen %s", async (source, label) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => jsonResponse(200, { alerts: [{ ...doseAlert, source, message: "Detalle" }], pending: 0 })),
      );
      renderApp("/alertas", { role: "enfermera_piso" });

      expect(await screen.findByText(label)).toBeInTheDocument();
    });
  });
});
