import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import { alertSiren } from "../../shared/audio/alertSiren";

const pendingAlert = {
  id: 7,
  encounterId: "ENC-SYNC-0001",
  patientName: "Paciente Sincronizado",
  location: "Habitación 301, lecho A",
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
  icuTransfer: null,
};

const inFollowUp = {
  ...pendingAlert,
  status: "en_atencion",
  acknowledgeDueAt: null,
  followUpDueAt: "2026-09-26T08:18:00+00:00",
  needsSiren: false,
};

/** Estado del servidor, compartido con «la otra ventana» que lo cambia durante la prueba. */
function stubServer(initial: unknown[], acknowledgeStatus = 200) {
  const server: { alerts: unknown[]; timelineAlert: unknown } = { alerts: initial, timelineAlert: initial[0] ?? pendingAlert };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: server.alerts, pending: 0 });
      if (url.includes("/timeline")) return jsonResponse(200, { alert: server.timelineAlert, events: [], escalations: [] });
      if (url.includes("/acknowledge")) return jsonResponse(acknowledgeStatus, { message: "La alerta ya está en atención." });
      return jsonResponse(200, {});
    }),
  );
  return server;
}

function inboxChangedElsewhere(server: ReturnType<typeof stubServer>, alert: unknown) {
  server.alerts = [alert];
  server.timelineAlert = alert;
  fireEvent(document, new Event("visibilitychange"));
}

describe("sincronización de alertas sin recargar la página (RF-53)", () => {
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

  it("muestra en la bandeja abierta una alerta que llega después de cargarla", async () => {
    const server = stubServer([]);
    renderApp("/alertas", { role: "enfermera_piso" });
    expect(await screen.findByText(/no tiene alertas pendientes/i)).toBeInTheDocument();

    inboxChangedElsewhere(server, pendingAlert);

    expect(await screen.findByRole("heading", { name: /paciente sincronizado/i })).toBeInTheDocument();
    expect(screen.queryByText(/no tiene alertas pendientes/i)).not.toBeInTheDocument();
  });

  it("actualiza el evento abierto cuando otra ventana confirma la lectura", async () => {
    const server = stubServer([pendingAlert]);
    renderApp("/alertas/7", { role: "enfermera_piso" });
    expect(await screen.findByRole("button", { name: /confirmar recepción/i })).toBeInTheDocument();

    inboxChangedElsewhere(server, inFollowUp);

    await waitFor(() => expect(screen.queryByRole("button", { name: /confirmar recepción/i })).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: /recalcular news2/i })).toBeInTheDocument();
  });

  it("retira el aviso y calla la sirena si otra ventana ya confirmó la lectura", async () => {
    const server = stubServer([pendingAlert]);
    renderApp("/", { role: "enfermera_piso" });
    expect(await screen.findByRole("button", { name: /confirmar lectura/i })).toBeInTheDocument();

    inboxChangedElsewhere(server, inFollowUp);

    await waitFor(() => expect(screen.queryByRole("region", { name: /avisos de alertas/i })).not.toBeInTheDocument());
    expect(alertSiren.stop).toHaveBeenCalled();
  });

  it("retira el aviso sin mostrar error si confirma cuando otra ventana se adelantó", async () => {
    const server = stubServer([pendingAlert], 422);
    const user = userEvent.setup();
    renderApp("/", { role: "enfermera_piso" });
    const confirm = await screen.findByRole("button", { name: /confirmar lectura/i });

    server.alerts = [inFollowUp];
    await user.click(confirm);

    await waitFor(() => expect(screen.queryByRole("region", { name: /avisos de alertas/i })).not.toBeInTheDocument());
    expect(screen.queryByText(/no se pudo confirmar la lectura/i)).not.toBeInTheDocument();
  });

  it("conserva el aviso con ir al evento en la ventana donde se confirmó", async () => {
    const server = stubServer([pendingAlert]);
    const user = userEvent.setup();
    renderApp("/", { role: "enfermera_piso" });
    const confirm = await screen.findByRole("button", { name: /confirmar lectura/i });

    server.alerts = [inFollowUp];
    await user.click(confirm);
    fireEvent(document, new Event("visibilitychange"));

    expect(await screen.findByRole("link", { name: /ir al evento/i })).toHaveAttribute("href", "/alertas/7");
  });

  it("vuelve a pedir confirmación si la sirena reaparece tras confirmar aquí", async () => {
    const server = stubServer([pendingAlert]);
    const user = userEvent.setup();
    renderApp("/", { role: "enfermera_piso" });
    const confirm = await screen.findByRole("button", { name: /confirmar lectura/i });

    server.alerts = [inFollowUp];
    await user.click(confirm);
    await screen.findByRole("link", { name: /ir al evento/i });

    inboxChangedElsewhere(server, { ...inFollowUp, needsSiren: true });

    expect(await screen.findByRole("button", { name: /confirmar lectura/i })).toBeInTheDocument();
  });
});
