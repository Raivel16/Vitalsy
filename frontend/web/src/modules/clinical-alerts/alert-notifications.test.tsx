import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import { alertSiren } from "../../shared/audio/alertSiren";

const pendingAlert = {
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
  followUpDueAt: null,
  reassessedAt: null,
  medicalDueAt: null,
  closedAt: null,
  needsSiren: true,
};

const acknowledgedAlert = {
  ...pendingAlert,
  status: "en_atencion",
  acknowledgeDueAt: null,
  followUpDueAt: "2026-09-26T08:18:00+00:00",
  needsSiren: false,
};

function stubInbox(sequence: Array<{ alerts: unknown[]; pending: number }>) {
  let call = 0;
  const calls: string[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);

      if (url.includes("/clinical-alerts/inbox")) {
        const payload = sequence[Math.min(call, sequence.length - 1)];
        call += 1;
        return jsonResponse(200, payload);
      }
      if (url.includes("/acknowledge")) {
        return jsonResponse(200, { alert: acknowledgedAlert });
      }
      return jsonResponse(200, {});
    }),
  );

  return calls;
}

describe("campana y avisos de alertas al iniciar sesión (RF-53)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-alert-inbox", "1");
    alertSiren.stop();
    vi.spyOn(alertSiren, "start");
    vi.spyOn(alertSiren, "stop");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("muestra la campana con el número de alertas pendientes del perfil", async () => {
    stubInbox([{ alerts: [pendingAlert], pending: 1 }]);
    renderApp("/", { role: "enfermera_piso" });

    expect(await screen.findByRole("button", { name: /1 alerta urgente/i })).toBeInTheDocument();
  });

  it("emite el aviso emergente y la señal sonora cuando hay alertas sin atender", async () => {
    stubInbox([{ alerts: [pendingAlert], pending: 1 }]);
    renderApp("/", { role: "enfermera_piso" });

    const region = await screen.findByRole("region", { name: /avisos de alertas/i });
    expect(within(region).getByText(/paciente con deterioro demo/i)).toBeInTheDocument();
    await waitFor(() => expect(alertSiren.start).toHaveBeenCalled());
  });

  it("detiene el sonido al confirmar la lectura y ofrece ir al evento o cerrar", async () => {
    const calls = stubInbox([
      { alerts: [pendingAlert], pending: 1 },
      { alerts: [acknowledgedAlert], pending: 0 },
    ]);
    const user = userEvent.setup();
    renderApp("/", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("button", { name: /confirmar lectura/i }));

    expect(calls.some((call) => call === "POST /api/v1/clinical-alerts/7/acknowledge")).toBe(true);
    await waitFor(() => expect(alertSiren.stop).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("button", { name: /confirmar lectura/i })).not.toBeInTheDocument());
    expect(await screen.findByRole("link", { name: /ir al evento/i })).toHaveAttribute("href", "/alertas/7");
    expect(screen.getByRole("button", { name: /^cerrar$/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /1 alerta en seguimiento/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^cerrar$/i }));
    await waitFor(() => expect(screen.queryByRole("link", { name: /ir al evento/i })).not.toBeInTheDocument());
  });

  it("mantiene el aviso y la sirena si el acuse falla", async () => {
    let inboxCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/clinical-alerts/inbox")) {
          inboxCalls += 1;
          return jsonResponse(200, { alerts: [pendingAlert], pending: 1 });
        }
        if (url.includes("/acknowledge")) {
          return jsonResponse(500, { message: "Error interno" });
        }
        return jsonResponse(200, {});
      }),
    );
    const user = userEvent.setup();
    renderApp("/", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("button", { name: /confirmar lectura/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo confirmar la lectura/i);
    expect(screen.getByRole("button", { name: /confirmar lectura/i })).toBeInTheDocument();
    expect(inboxCalls).toBeGreaterThan(0);
  });

  it("vuelve a sonar cuando el seguimiento de 15 minutos vence sin atención", async () => {
    const overdueAlert = { ...acknowledgedAlert, needsSiren: true, followUpDueAt: "2026-09-26T08:00:00+00:00" };
    stubInbox([
      { alerts: [acknowledgedAlert], pending: 0 },
      { alerts: [overdueAlert], pending: 1 },
    ]);
    renderApp("/", { role: "enfermera_piso" });

    expect(await screen.findByRole("button", { name: /1 alerta en seguimiento/i })).toBeInTheDocument();
    expect(alertSiren.start).not.toHaveBeenCalled();

    // Segundo ciclo de polling (simulado forzando un remount con la secuencia).
    // El stub avanza en cada GET; disparamos visibility para forzar refresh.
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(alertSiren.start).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: /1 alerta urgente/i })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: /avisos de alertas/i })).toHaveTextContent(/paciente con deterioro demo/i);
  });

  it("abre el detalle de la alerta desde el panel de la campana", async () => {
    stubInbox([{ alerts: [pendingAlert], pending: 1 }]);
    const user = userEvent.setup();
    renderApp("/", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("button", { name: /1 alerta urgente/i }));
    const panel = screen.getByRole("region", { name: /alertas pendientes/i });
    expect(within(panel).getByRole("link", { name: /abrir el evento/i })).toHaveAttribute("href", "/alertas/7");
  });

  it("no consulta alertas ni suena para perfiles ajenos al proceso", async () => {
    const calls = stubInbox([{ alerts: [], pending: 0 }]);
    renderApp("/", { role: "admision" });

    await screen.findByRole("heading", { name: /admisión y recepción/i });
    expect(calls.some((call) => call.includes("/clinical-alerts/inbox"))).toBe(false);
    expect(screen.queryByRole("button", { name: /alerta (urgente|en seguimiento|pendiente)/i })).not.toBeInTheDocument();
    expect(alertSiren.start).not.toHaveBeenCalled();
  });

  it("no suena cuando el perfil no tiene alertas pendientes", async () => {
    stubInbox([{ alerts: [], pending: 0 }]);
    renderApp("/", { role: "enfermera_piso" });

    expect(await screen.findByRole("button", { name: /sin alertas pendientes/i })).toBeInTheDocument();
    expect(alertSiren.start).not.toHaveBeenCalled();
  });
});
