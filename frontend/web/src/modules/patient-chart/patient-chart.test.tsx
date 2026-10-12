import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-CHART-1",
  transferOrderNumber: null,
  patientName: "Paciente Chart Demo",
  documentType: "DNI",
  documentNumber: "11223344",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-CHART-0001",
  recordId: "EXP-CHART-0001",
  subprocess: "2.1",
  subprocessLabel: "Atención",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [{ id: "orden", label: "Orden", status: "done" }],
};

describe("expediente clínico (RF-38)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico_tratante");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("navega por pestañas del expediente sin etiqueta de proceso 1", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/clinical-chart")) {
          return jsonResponse(200, {
            encounter: {
              patientName: "Paciente Chart Demo",
              documentType: "DNI",
              documentNumber: "11223344",
              recordId: "EXP-CHART-0001",
              wristbandCode: "BRZ-CHART-0001",
              room: "401",
              bed: "A",
              service: "Medicina",
              coveragePayer: "Essalud",
              coverageStatus: "aprobada",
              createdAt: "2026-09-20T08:00:00+00:00",
            },
            admission: {
              assessment: { chiefComplaint: "Disnea", allergies: ["Penicilina"], history: "HTA" },
              vitalsBasal: { summary: "FR 16, SpO2 98 %", news2Label: "0 puntos, riesgo bajo" },
              medicalOrders: {
                statusLabel: "Firmado",
                items: [{ title: "Reposo relativo", detail: "Cabecera a 30 grados", category: "Cuidados" }],
                signature: { physicianName: "Dr. Guardia" },
              },
            },
            activePrescription: {
              signedAt: "2026-09-21T10:00:00+00:00",
              items: [{ drugName: "Paracetamol", dose: "1 g", route: "VO", frequency: "cada 8 horas", drugBarcode: "DRUG-PARACETAMOL-1G" }],
            },
            vitalSigns: [{ recordedAt: "2026-09-21T09:00:00+00:00", pulse: 72, news2: 0, respiratoryRate: 16, oxygenSaturation: 98 }],
            labResults: [{ id: 1, summary: "Hemograma normal", resultedAt: "2026-09-21T08:30:00+00:00" }],
            imagingReports: [],
            medicalEvolutionNotes: [{ id: 1, body: "Evolución favorable.", authoredAt: "2026-09-21T11:00:00+00:00", authorName: "Dra. Demo" }],
            nursingEvolutionNotes: [],
            careActivities: [{
              id: 2,
              activityLabel: "Higiene matutina",
              completedAt: "2026-09-21T08:00:00+00:00",
              completedByName: "Auxiliar Demo",
            }],
            medicationAdministrations: [{
              id: 3,
              drugName: "Paracetamol",
              dose: "1 g",
              status: "administrada",
              scheduledAt: "2026-09-21T08:00:00+00:00",
              administeredAt: "2026-09-21T08:10:00+00:00",
            }],
          });
        }
        if (url.includes("/vital-signs/chart")) {
          return jsonResponse(200, {
            series: [{ recordedAt: "2026-09-21T09:00:00+00:00", pulse: 72, news2: 0, respiratoryRate: 16, oxygenSaturation: 98 }],
          });
        }
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/chart?ingreso=ENC-HOSP-0001");
    expect(await screen.findByRole("heading", { name: /^expediente clínico$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^admisión y recepción$/i })).toBeInTheDocument();
    expect(screen.queryByText(/proceso 1/i)).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^admisión$/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: /^admisión$/i })).toHaveTextContent(/disnea/i);
    expect(screen.getByRole("tabpanel", { name: /^admisión$/i })).toHaveTextContent(/reposo relativo/i);
    expect(screen.getByRole("tabpanel", { name: /^admisión$/i })).toHaveTextContent(/cabecera a 30 grados/i);

    await user.click(screen.getByRole("tab", { name: /^constantes$/i }));
    expect(await screen.findByRole("img", { name: /gráfica evolutiva de pulso/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /filtrar historial del expediente/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^tratamiento$/i }));
    expect(screen.getByRole("tabpanel", { name: /^tratamiento$/i })).toHaveTextContent(/paracetamol/i);

    await user.click(screen.getByRole("tab", { name: /^evoluciones$/i }));
    expect(screen.getByRole("tabpanel", { name: /^evoluciones$/i })).toHaveTextContent(/higiene matutina/i);
    expect(screen.getByRole("tabpanel", { name: /^evoluciones$/i })).toHaveTextContent(/auxiliar demo/i);

    expect(screen.queryByRole("navigation", { name: /avance del ingreso/i })).not.toBeInTheDocument();
  });

  it("muestra la línea de base de Vitalsy Life en la pestaña Admisión", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/clinical-chart")) {
          return jsonResponse(200, {
            encounter: {
              patientName: "Paciente Chart Demo", documentType: "DNI", documentNumber: "11223344",
              recordId: "EXP-CHART-0001", wristbandCode: "BRZ-CHART-0001", room: "401", bed: "A",
              service: "Medicina", coveragePayer: "Essalud", coverageStatus: "aprobada", createdAt: null,
            },
            admission: {},
            lifeBaseline: {
              importedAt: "2026-10-11T10:00:00+00:00",
              metrics: [{ kind: "resting_heart_rate", low: 55, high: 70, days: 14 }],
            },
            activePrescription: null,
            vitalSigns: [], labResults: [], imagingReports: [],
            medicalEvolutionNotes: [], nursingEvolutionNotes: [], careActivities: [], medicationAdministrations: [],
          });
        }
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );
    renderApp("/atencion/chart?ingreso=ENC-HOSP-0001");
    const panel = await screen.findByRole("tabpanel", { name: /^admisión$/i });
    expect(panel).toHaveTextContent(/línea de base vitalsy life/i);
    expect(panel).toHaveTextContent(/pulso en reposo/i);
    expect(panel).toHaveTextContent(/55–70 lpm/);
  });
});
