import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-EVO-1",
  transferOrderNumber: "OT-2026-EVO-1",
  patientName: "Paciente Hospitalizado Demo",
  documentType: "DNI",
  documentNumber: "99887766",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-EVO-0001",
  recordId: "EXP-EVO-0001",
  subprocess: "2.1",
  subprocessLabel: "Visita médica",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [],
};

describe("nota de evolución médica (RF-24)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico_residente");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("exige el texto y registra la nota firmada", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/medical-evolution-notes") && init?.method === "POST") {
          return jsonResponse(201, {
            note: {
              id: 1,
              body: "Evolución favorable. Continuar plan actual.",
              signed: true,
              signedAt: "2026-09-21T12:00:00+00:00",
              authoredAt: "2026-09-21T12:00:00+00:00",
              authorName: "Médico residente",
            },
          });
        }
        if (url.includes("/medical-evolution-notes")) return jsonResponse(200, { notes: [] });
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/evolucion?ingreso=ENC-HOSP-0001");

    expect(await screen.findByRole("heading", { name: /evolución médica/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /registrar evolución/i }));
    expect(screen.getByLabelText(/nota de evolución/i)).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText(/nota de evolución/i), "Evolución favorable. Continuar plan actual.");
    await user.click(screen.getByLabelText(/firmar digitalmente la nota/i));
    await user.click(screen.getByRole("button", { name: /registrar evolución/i }));

    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/evolución registrada/i);
    expect(screen.getByText(/evolución favorable\. continuar plan actual\./i)).toBeInTheDocument();
  });

  it("permite al médico tratante abrir la pantalla de evolución", async () => {
    sessionStorage.setItem("vitalsy-role", "medico_tratante");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/medical-evolution-notes")) return jsonResponse(200, { notes: [] });
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/evolucion?ingreso=ENC-HOSP-0001");
    expect(await screen.findByRole("heading", { name: /evolución médica/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /registrar evolución/i })).toBeInTheDocument();
  });
});
