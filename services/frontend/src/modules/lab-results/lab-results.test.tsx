import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-LAB-1",
  transferOrderNumber: "OT-2026-LAB-1",
  patientName: "Paciente Hospitalizado Demo",
  documentType: "DNI",
  documentNumber: "99887766",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-LAB-0001",
  recordId: "EXP-LAB-0001",
  subprocess: "2.1",
  subprocessLabel: "Visita médica",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [],
};

describe("integración de laboratorio LIS (RF-21)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico_residente");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("integra resultados del LIS y los muestra en el chart", async () => {
    const user = userEvent.setup();
    const empty = jsonResponse(200, { results: [] });
    const synced = jsonResponse(200, {
      integrated: 2,
      results: [
        {
          id: 1,
          externalId: "LIS-OBS-1001",
          summary: "Hemoglobina 11.2 g/dL",
          resultedAt: "2026-09-21T08:15:00+00:00",
          payload: { resourceType: "fhir.Observation" },
        },
        {
          id: 2,
          externalId: "LIS-OBS-1002",
          summary: "Creatinina 0.9 mg/dL",
          resultedAt: "2026-09-21T08:20:00+00:00",
          payload: { resourceType: "fhir.Observation" },
        },
      ],
    });
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/hospital-admission/encounters/")) {
        return jsonResponse(200, { encounter });
      }
      if (url.includes("/lab-results/sync") && init?.method === "POST") {
        return synced;
      }
      if (url.includes("/lab-results")) {
        return empty;
      }
      return jsonResponse(404, { message: "No se encontró lo solicitado." });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/atencion/laboratorio?ingreso=ENC-HOSP-0001");

    expect(await screen.findByRole("heading", { name: /resultados de laboratorio/i })).toBeInTheDocument();
    expect(await screen.findByText(/aún no hay resultados integrados/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /integrar desde lis/i }));

    expect(await screen.findByText(/hemoglobina 11\.2 g\/dl/i)).toBeInTheDocument();
    expect(screen.getByText(/creatinina 0\.9 mg\/dl/i)).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /resultado de integración/i })).toHaveTextContent(/2 resultados integrados/i);

    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes("/lab-results/sync") && init?.method === "POST")).toBe(true);
  });
});
