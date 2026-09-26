import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-VS-1",
  transferOrderNumber: null,
  patientName: "Paciente Hospitalizado Demo",
  documentType: "DNI",
  documentNumber: "99887766",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-VS-0001",
  recordId: "EXP-VS-0001",
  subprocess: "2.2",
  subprocessLabel: "Monitoreo",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [{ id: "orden", label: "Orden", status: "done" }],
};

describe("monitoreo de constantes (RF-22–27)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("no precarga valores y registra constantes con gráfica", async () => {
    const user = userEvent.setup();
    let chartCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/vital-signs/chart")) {
          chartCalls += 1;
          if (chartCalls === 1) return jsonResponse(200, { series: [] });
          return jsonResponse(200, {
            series: [{ recordedAt: "2026-09-21T10:00:00+00:00", pulse: 72, respiratoryRate: 16, oxygenSaturation: 98, news2: 0 }],
          });
        }
        if (url.includes("/vital-signs") && init?.method === "POST") {
          return jsonResponse(201, {
            reading: { news2: { total: 0 } },
            alertActivated: false,
            nextControlAt: "2026-09-21T22:00:00+00:00",
          });
        }
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/constantes?ingreso=ENC-HOSP-0001");
    expect(await screen.findByRole("heading", { name: /monitoreo de constantes/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /avance del ingreso/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/frecuencia respiratoria/i)).toHaveValue("");

    await user.type(screen.getByLabelText(/frecuencia respiratoria/i), "16");
    await user.type(screen.getByLabelText(/^saturación$/i), "98");
    await user.type(screen.getByLabelText(/presión sistólica/i), "120");
    await user.type(screen.getByLabelText(/^pulso$/i), "72");
    await user.type(screen.getByLabelText(/^temperatura$/i), "36.8");
    await user.click(screen.getByRole("button", { name: /registrar constantes/i }));

    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/próximo control/i);
    expect(await screen.findByRole("img", { name: /gráfica evolutiva/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /gráfica evolutiva/i })).toHaveTextContent(/72/);
  });
});
