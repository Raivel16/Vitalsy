import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

describe("Controles de constantes (RF-42)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("lista controles y registra la toma reprogramando el siguiente", async () => {
    const user = userEvent.setup();
    let completed = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/monitoring-controls/complete") && init?.method === "POST") {
          completed = true;
          return jsonResponse(200, {
            reading: { news2: { total: 0 } },
            alertActivated: false,
            nextControlAt: "2026-09-26T14:00:00+00:00",
          });
        }
        if (url.includes("/monitoring-controls")) {
          return jsonResponse(200, {
            controls: completed
              ? []
              : [
                  {
                    encounterId: "ENC-CTRL-0001",
                    patientName: "Paciente Controles Demo",
                    location: "Habitación 210, lecho A",
                    nextDueAt: "2026-09-26T11:30:00+00:00",
                    frequencyMinutes: 120,
                    overdue: true,
                    assignedNurseId: null,
                  },
                ],
          });
        }
        if (url.includes("/clinical-alerts/inbox")) {
          return jsonResponse(200, { alerts: [], pending: 0 });
        }
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/controles");
    expect(await screen.findByRole("heading", { name: /controles de constantes/i })).toBeInTheDocument();
    expect(screen.getByText(/paciente controles demo/i)).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /^vencido$/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /registrar control/i }));
    await user.type(screen.getByLabelText(/frecuencia respiratoria/i), "16");
    await user.type(screen.getByLabelText(/^saturación/i), "98");
    await user.type(screen.getByLabelText(/presión sistólica/i), "120");
    await user.type(screen.getByLabelText(/presión diastólica/i), "80");
    await user.type(screen.getByLabelText(/^pulso/i), "72");
    await user.type(screen.getByLabelText(/temperatura/i), "36.6");
    await user.click(screen.getByRole("button", { name: /confirmar control/i }));

    expect(await screen.findByRole("status", { name: /resultado del control/i })).toHaveTextContent(
      /próximo control/i,
    );
  });
});
