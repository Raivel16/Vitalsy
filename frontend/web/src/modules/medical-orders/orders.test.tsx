import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const encounter = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: null,
  patientName: "Ana María Quispe Rojas",
  documentType: "DNI",
  documentNumber: "45678912",
  originService: "Emergencia",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS" },
  location: { room: "312", bed: "B", service: "Medicina" },
  wristbandCode: "BRZ-0001-ANA",
  recordId: "EXP-0001",
  subprocess: "1.3",
  subprocessLabel: "Valoración",
  currentStep: "indicaciones",
  currentStepLabel: "Indicaciones",
  nextRole: "medico_residente",
  statusLabel: "Indicaciones por firmar",
  deliverables: [],
  progress: [],
};

const emptyOrders = {
  status: "pendiente",
  statusLabel: "Pendiente de firma",
  items: [],
  chiefComplaint: "Disnea de dos días",
  allergies: ["Penicilina"],
  history: "HTA controlada",
  vitals: {
    summary: "FR 22, SpO2 94 %",
    news2Label: "5 puntos, riesgo medio",
  },
  reconciliation: {
    medications: [{ name: "Losartán", dose: "50 mg", route: "oral", frequency: "cada 24 horas" }],
    noHomeMedications: false,
    notes: "Toma matutina",
    alerts: ["Revisar presión arterial."],
  },
  risks: {
    fallRisk: "Riesgo alto de caídas, 45 puntos",
    pressureRisk: "Riesgo leve de úlceras, 18 puntos",
  },
};

describe("indicaciones médicas basales", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico_residente");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("permite registrar ítems y exige la confirmación para firmar", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/medical-orders/") && init?.method === "PUT") {
        const body = JSON.parse(String(init.body));
        return jsonResponse(200, { orders: { ...emptyOrders, items: body.items } });
      }
      if (url.includes("/sign") && init?.method === "POST") {
        return jsonResponse(201, { signature: { status: "firmado", physicianName: "Dr. Mateo Salas" } });
      }
      if (url.includes("/advance")) {
        return jsonResponse(200, {
          encounter: { ...encounter, currentStep: "cerrado", nextRole: null, statusLabel: "Ingreso cerrado" },
        });
      }
      if (url.includes("/medical-orders/")) {
        return jsonResponse(200, { orders: emptyOrders });
      }
      return jsonResponse(200, { encounter });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/medico/indicaciones?ingreso=ENC-0001");
    expect(await screen.findByRole("status", { name: /estado del documento/i })).toHaveTextContent(/pendiente de firma/i);
    expect(screen.getByText(/no hay prescripciones/i)).toBeInTheDocument();
    expect(screen.queryByText(/omeprazol/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cie-10/i)).not.toBeInTheDocument();
    expect(screen.getByText("Disnea de dos días")).toBeInTheDocument();
    expect(screen.getByText("Penicilina")).toBeInTheDocument();
    expect(screen.getByLabelText(/revisión de enfermería/i)).toHaveTextContent(/5 puntos, riesgo medio/i);
    expect(screen.getByLabelText(/revisión de enfermería/i)).toHaveTextContent(/losartán/i);
    expect(screen.getByText(/hta controlada/i)).toBeInTheDocument();
    expect(screen.getByText(/riesgo alto de caídas/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /firmar indicaciones/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /editar prescripciones/i }));
    await user.click(screen.getByLabelText(/indicación 1/i));
    await user.paste("Reposo relativo");
    await user.click(screen.getByLabelText(/^detalle$/i));
    await user.paste("Cabecera a 30 grados");
    await user.click(screen.getByRole("button", { name: /^listo$/i }));
    expect(await screen.findByText("Reposo relativo")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/nombre del médico/i));
    await user.click(screen.getByLabelText(/confirmo y firmo las indicaciones/i));
    await user.click(screen.getByRole("button", { name: /firmar indicaciones/i }));
    expect(screen.getByLabelText(/nombre del médico/i)).toHaveAttribute("aria-invalid", "true");

    await user.click(screen.getByLabelText(/nombre del médico/i));
    await user.paste("Dr. Mateo Salas");
    await user.click(screen.getByLabelText(/colegiatura/i));
    await user.paste("CMP 12345");
    await user.click(screen.getByRole("button", { name: /firmar indicaciones/i }));

    await waitFor(() => {
      expect(screen.getByRole("status", { name: /estado del documento/i })).toHaveTextContent(/firmado/i);
    });
    const signCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/sign"));
    expect(JSON.parse(String(signCall?.[1]?.body)).items[0]).toMatchObject({
      title: "Reposo relativo",
      detail: "Cabecera a 30 grados",
    });
  });

  it("permite al médico tratante abrir y firmar indicaciones", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("vitalsy-role", "medico_tratante");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/sign") && init?.method === "POST") {
          return jsonResponse(201, { signature: { status: "firmado", physicianName: "Dra. Tratante" } });
        }
        if (url.includes("/advance")) {
          return jsonResponse(200, {
            encounter: { ...encounter, currentStep: "cerrado", nextRole: null, statusLabel: "Ingreso cerrado" },
          });
        }
        if (url.includes("/medical-orders/") && !url.includes("/sign")) {
          return jsonResponse(200, {
            orders: { ...emptyOrders, items: [{ title: "Reposo relativo", detail: "", category: "" }] },
          });
        }
        return jsonResponse(200, { encounter });
      }),
    );

    renderApp("/medico/indicaciones?ingreso=ENC-0001");
    expect(await screen.findByRole("heading", { name: /indicaciones médicas basales/i })).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/nombre del médico/i));
    await user.click(screen.getByLabelText(/nombre del médico/i));
    await user.paste("Dra. Tratante");
    await user.click(screen.getByLabelText(/colegiatura/i));
    await user.paste("CMP 99887");
    await user.click(screen.getByLabelText(/confirmo y firmo las indicaciones/i));
    await user.click(screen.getByRole("button", { name: /firmar indicaciones/i }));
    expect(await screen.findByRole("status", { name: /estado del documento/i })).toHaveTextContent(/firmado/i);
  });
});
