import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-IMG-1",
  transferOrderNumber: "OT-2026-IMG-1",
  patientName: "Paciente Hospitalizado Demo",
  documentType: "DNI",
  documentNumber: "99887766",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-IMG-0001",
  recordId: "EXP-IMG-0001",
  subprocess: "2.1",
  subprocessLabel: "Visita médica",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [],
};

describe("integración de imágenes PACS (RF-22)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico_tratante");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("integra informes del PACS y los muestra en el chart", async () => {
    const user = userEvent.setup();
    const empty = jsonResponse(200, { reports: [] });
    const synced = jsonResponse(200, {
      integrated: 2,
      reports: [
        {
          id: 1,
          externalId: "PACS-DR-2001",
          modality: "RX",
          summary: "Radiografía de tórax: sin consolidaciones",
          reportedAt: "2026-09-21T09:00:00+00:00",
          payload: { resourceType: "fhir.DiagnosticReport" },
        },
        {
          id: 2,
          externalId: "PACS-DR-2002",
          modality: "ECO",
          summary: "Ecografía abdominal: sin líquido libre",
          reportedAt: "2026-09-21T09:30:00+00:00",
          payload: { resourceType: "fhir.DiagnosticReport" },
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/imaging-reports/sync") && init?.method === "POST") return synced;
        if (url.includes("/imaging-reports")) return empty;
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/imagenes?ingreso=ENC-HOSP-0001");

    expect(await screen.findByRole("heading", { name: /informes de imágenes/i })).toBeInTheDocument();
    expect(await screen.findByText(/aún no hay informes integrados/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /integrar desde pacs/i }));

    expect(await screen.findByText(/radiografía de tórax: sin consolidaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/ecografía abdominal: sin líquido libre/i)).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /resultado de integración/i })).toHaveTextContent(/2 informes integrados/i);
  });
});
