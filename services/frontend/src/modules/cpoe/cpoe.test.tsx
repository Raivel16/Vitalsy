import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-CPOE-1",
  transferOrderNumber: null,
  patientName: "Paciente Hospitalizado Demo",
  documentType: "DNI",
  documentNumber: "99887766",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-CPOE-0001",
  recordId: "EXP-CPOE-0001",
  subprocess: "2.1",
  subprocessLabel: "Visita médica",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [],
};

describe("prescripción CPOE (RF-21)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico_tratante");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("registra medicamentos y actualiza el Kardex en pantalla", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/kardex") && (!init || !init.method || init.method === "GET")) {
          return jsonResponse(200, { medications: [], source: "cpoe" });
        }
        if (url.includes("/prescriptions") && init?.method === "POST") {
          return jsonResponse(201, {
            prescription: { id: 1, status: "activo", items: [{ drugName: "Paracetamol", dose: "1 g", route: "VO", frequency: "cada 8 horas" }] },
            kardex: { medications: ["Paracetamol 1 g cada 8 horas"], source: "cpoe" },
          });
        }
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");
    expect(await screen.findByRole("heading", { name: /prescripción electrónica/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^medicamento$/i), "Paracetamol");
    await user.type(screen.getByLabelText(/^dosis$/i), "1 g");
    await user.clear(screen.getByLabelText(/^vía$/i));
    await user.type(screen.getByLabelText(/^vía$/i), "VO");
    await user.type(screen.getByLabelText(/^frecuencia$/i), "cada 8 horas");
    await user.click(screen.getByRole("button", { name: /registrar cpoe/i }));

    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/kardex actualizado/i);
    expect(screen.getByRole("region", { name: /kardex electrónico/i })).toHaveTextContent(/paracetamol 1 g cada 8 horas/i);
  });
});
