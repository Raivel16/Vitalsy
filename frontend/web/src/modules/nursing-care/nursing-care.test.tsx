import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-CARE-1",
  transferOrderNumber: null,
  patientName: "Paciente Hospitalizado Demo",
  documentType: "DNI",
  documentNumber: "99887766",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-CARE-0001",
  recordId: "EXP-CARE-0001",
  subprocess: "2.3",
  subprocessLabel: "Cuidados",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [],
};

function stubCareApis() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
      if (url.includes("/nursing-evolution-notes") && init?.method === "POST") {
        return jsonResponse(201, {
          note: {
            id: 1,
            body: "Paciente estable en el turno.",
            authorName: "Enfermera Demo",
            authoredAt: "2026-09-21T10:00:00+00:00",
          },
        });
      }
      if (url.includes("/nursing-evolution-notes")) {
        return jsonResponse(200, { notes: [] });
      }
      if (url.includes("/care-activities") && init?.method === "POST") {
        return jsonResponse(201, {
          activity: {
            id: 1,
            activityLabel: "Higiene matutina",
            completedAt: "2026-09-21T10:00:00+00:00",
            completedByName: "Auxiliar Demo",
          },
        });
      }
      if (url.includes("/care-activities")) {
        return jsonResponse(200, {
          activities: [{
            id: 9,
            activityLabel: "Cambio de ropa / sábanas",
            completedAt: "2026-09-21T08:00:00+00:00",
            completedByName: "Auxiliar Demo",
          }],
        });
      }
      return jsonResponse(404, { message: "No se encontró lo solicitado." });
    }),
  );
}

describe("cuidados y evolución (RF-36–37)", () => {
  beforeEach(() => {
    // Los datos de prueba caen dentro del filtro por defecto de 30 días solo con una fecha fija.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("enfermera navega tabs y registra nota y cuidado con trazabilidad", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
    stubCareApis();

    renderApp("/atencion/cuidados?ingreso=ENC-HOSP-0001");
    expect(await screen.findByRole("tab", { name: /^notas$/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /^evolución de enfermería$/i })).toBeInTheDocument();

    await user.click(screen.getByLabelText(/nota de evolución/i));
    await user.paste("Paciente estable en el turno.");
    await user.click(screen.getByRole("button", { name: /registrar nota/i }));
    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/nota de enfermería registrada/i);

    await user.click(screen.getByRole("tab", { name: /^actividades$/i }));
    expect(screen.getByRole("heading", { name: /^cuidados directos$/i })).toBeInTheDocument();
    expect(screen.getByText(/auxiliar demo/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /marcar finalizado/i }));
    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/higiene matutina/i);
  });

  it("auxiliar puede registrar nota y cuidado directo", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("vitalsy-role", "auxiliar_enfermeria");
    stubCareApis();

    renderApp("/atencion/cuidados?ingreso=ENC-HOSP-0001");
    expect(await screen.findByRole("tab", { name: /^notas$/i })).toBeInTheDocument();

    await user.click(screen.getByLabelText(/nota de evolución/i));
    await user.paste("Apoyo en cuidados del turno.");
    await user.click(screen.getByRole("button", { name: /registrar nota/i }));
    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/nota de enfermería registrada/i);

    await user.click(screen.getByRole("tab", { name: /^actividades$/i }));
    await user.click(screen.getByRole("button", { name: /marcar finalizado/i }));
    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/higiene matutina/i);
  });
});
