import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-VIS-1",
  transferOrderNumber: "OT-2026-VIS-1",
  patientName: "Paciente Hospitalizado Demo",
  documentType: "DNI",
  documentNumber: "99887766",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-VIS-0001",
  recordId: "EXP-VIS-0001",
  subprocess: "2.1",
  subprocessLabel: "Visita médica",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [],
};

describe("visita médica consolidada (RF-19)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico_tratante");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("muestra laboratorio, imágenes y notas de enfermería del día en una sola pantalla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/clinical-visit")) {
          return jsonResponse(200, {
            day: "2026-09-21",
            labResults: [{ id: 1, externalId: "LIS-OBS-1001", summary: "Hemoglobina 11.2 g/dL", resultedAt: null }],
            imagingReports: [{ id: 1, externalId: "PACS-DR-2001", modality: "RX", summary: "Radiografía de tórax: sin consolidaciones", reportedAt: null }],
            nursingNotes: [{ id: 1, body: "Tolera medicación oral. Sin dolor.", authoredAt: null, authorName: "Enfermera de piso" }],
          });
        }
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/visita?ingreso=ENC-HOSP-0001");

    expect(await screen.findByRole("heading", { name: /visita médica/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /laboratorio/i })).toHaveTextContent(/hemoglobina 11\.2 g\/dl/i);
    expect(screen.getByRole("region", { name: /imágenes/i })).toHaveTextContent(/radiografía de tórax/i);
    expect(screen.getByRole("region", { name: /notas de enfermería/i })).toHaveTextContent(/tolera medicación oral/i);
  });
});
