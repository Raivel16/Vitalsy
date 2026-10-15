import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const nursing = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: "OT-2026-0001",
  patientName: "Ana María Quispe Rojas",
  documentType: "DNI",
  documentNumber: "45678912",
  originService: "Emergencia adultos",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  location: { room: "312", bed: "B", service: "Medicina interna" },
  wristbandCode: "BRZ-0001-ANA",
  recordId: "EXP-0001",
  subprocess: "1.3",
  subprocessLabel: "Valoración",
  currentStep: "valoracion",
  currentStepLabel: "Registrar valoración inicial",
  nextRole: "enfermera_piso",
  statusLabel: "Valoración por registrar",
  deliverables: [],
  progress: [
    { id: "recepcion", label: "Recepción", state: "done" },
    { id: "valoracion", label: "Valoración", state: "current" },
    { id: "constantes", label: "Constantes", state: "pending" },
  ],
};

describe("valoración inicial de enfermería", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("exige la anamnesis, guarda con el paciente y permite continuar", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/life-baseline")) return jsonResponse(200, { baseline: null });
      if (url.includes("/nursing-assessments") && init?.method === "POST") {
        return jsonResponse(201, { assessment: { status: "registrada" } });
      }
      if (url.includes("/advance")) {
        return jsonResponse(200, {
          encounter: { ...nursing, currentStep: "constantes", nextRole: "enfermera_piso", statusLabel: "Constantes por registrar" },
        });
      }
      return jsonResponse(200, { encounter: nursing });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/enfermeria/valoracion?ingreso=ENC-0001");

    await screen.findByText(/anamnesis/i);
    await user.click(screen.getByRole("button", { name: /guardar valoración/i }));
    expect(screen.getByLabelText(/motivo de consulta/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/antecedentes son obligatorios/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/motivo de consulta/i));
    await user.paste("Disnea de dos días");
    await user.click(screen.getByLabelText(/^antecedentes$/i));
    await user.paste("HTA controlada");
    await user.click(screen.getByLabelText(/alergia/i));
    await user.paste("Penicilina");
    await user.click(screen.getByRole("button", { name: /agregar alergia/i }));
    expect(screen.getByText("Penicilina")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /guardar valoración/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/valoración registrada/i);
    expect(screen.getByRole("link", { name: /continuar al siguiente paso/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /regresar al paso anterior/i })).toHaveAttribute("href", "/piso/recepcion?ingreso=ENC-0001");
    const saveCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/nursing-assessments"));
    expect(JSON.parse(String(saveCall?.[1]?.body))).toMatchObject({ encounterId: "ENC-0001" });
  });

  it("bloquea constantes imposibles y muestra NEWS2 con texto, no solo color", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter: { ...nursing, currentStep: "constantes" } }))
        .mockResolvedValue(jsonResponse(201, {
          news2: { total: 0, visualLabel: "Riesgo bajo", monitoring: "Mínimo cada 12 horas" },
        })),
    );
    renderApp("/enfermeria/constantes?ingreso=ENC-0001");

    await screen.findByLabelText(/frecuencia respiratoria/i);
    await user.type(screen.getByLabelText(/frecuencia respiratoria/i), "2");
    await user.click(screen.getByRole("button", { name: /registrar constantes/i }));
    expect(screen.getByText(/no es posible/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/frecuencia respiratoria/i));
    await user.type(screen.getByLabelText(/frecuencia respiratoria/i), "16");
    await user.type(screen.getByLabelText(/saturación/i), "98");
    await user.type(screen.getByLabelText(/presión sistólica/i), "120");
    await user.type(screen.getByLabelText(/presión diastólica/i), "80");
    await user.type(screen.getByLabelText(/pulso/i), "72");
    await user.type(screen.getByLabelText(/temperatura/i), "36.8");

    expect(screen.getByRole("status", { name: /resultado news2/i })).toHaveTextContent(/riesgo bajo/i);
    expect(screen.getByRole("status", { name: /resultado news2/i })).toHaveTextContent(/0 puntos/i);

    await user.clear(screen.getByLabelText(/frecuencia respiratoria/i));
    await user.type(screen.getByLabelText(/frecuencia respiratoria/i), "25");
    expect(screen.getByRole("alert")).toHaveTextContent(/revisión urgente/i);
  });

  it("avisa cuando las constantes activan una alerta clínica", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        if (String(input).includes("/vital-signs") && init?.method === "POST") {
          return jsonResponse(201, {
            news2: { total: 3, visualLabel: "Riesgo bajo-medio" },
            alertActivated: true,
            nextControlAt: null,
          });
        }
        return jsonResponse(200, { encounter: { ...nursing, currentStep: "kardex" } });
      }),
    );
    renderApp("/enfermeria/constantes?ingreso=ENC-0001");
    await user.type(await screen.findByLabelText(/frecuencia respiratoria/i), "25");
    await user.type(screen.getByLabelText(/saturación/i), "98");
    await user.type(screen.getByLabelText(/presión sistólica/i), "120");
    await user.type(screen.getByLabelText(/presión diastólica/i), "80");
    await user.type(screen.getByLabelText(/pulso/i), "72");
    await user.type(screen.getByLabelText(/temperatura/i), "36.8");
    await user.click(screen.getByRole("button", { name: /registrar constantes/i }));
    expect(await screen.findByRole("status", { name: /alerta clínica/i })).toHaveTextContent(/bandeja de alertas/i);
  });

  it("muestra las unidades junto a cada constante", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { encounter: { ...nursing, currentStep: "constantes" } })));
    renderApp("/enfermeria/constantes?ingreso=ENC-0001");
    await screen.findByLabelText(/frecuencia respiratoria/i);
    expect(screen.getByText("rpm")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(screen.getByText("mmHg")).toBeInTheDocument();
    expect(screen.getByText("lpm")).toBeInTheDocument();
    expect(screen.getByText("°C")).toBeInTheDocument();
  });

  it("separa los chips de alergia del campo de alta", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { encounter: nursing })));
    renderApp("/enfermeria/valoracion?ingreso=ENC-0001");
    await screen.findByText(/anamnesis/i);
    await user.click(screen.getByLabelText(/alergia/i));
    await user.paste("Penicilina");
    await user.click(screen.getByRole("button", { name: /agregar alergia/i }));
    const chips = screen.getByRole("list", { name: /alergias registradas/i });
    expect(chips).toHaveClass("allergy-chips");
    expect(chips.closest(".nursing-allergy-stack")).toBeTruthy();
    expect(chips.closest(".nursing-allergy-stack")?.querySelector(".nursing-inline-add")).toBeTruthy();
  });

  it("muestra el 422 de diastólica en español", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        if (String(input).includes("/vital-signs") && init?.method === "POST") {
          return jsonResponse(422, {
            errors: { diastolicBloodPressure: ["La presión diastólica es obligatoria."] },
          });
        }
        return jsonResponse(200, { encounter: { ...nursing, currentStep: "constantes" } });
      }),
    );
    renderApp("/enfermeria/constantes?ingreso=ENC-0001");
    await user.type(await screen.findByLabelText(/frecuencia respiratoria/i), "16");
    await user.type(screen.getByLabelText(/saturación/i), "98");
    await user.type(screen.getByLabelText(/presión sistólica/i), "120");
    await user.type(screen.getByLabelText(/presión diastólica/i), "80");
    await user.type(screen.getByLabelText(/pulso/i), "72");
    await user.type(screen.getByLabelText(/temperatura/i), "36.8");
    await user.click(screen.getByRole("button", { name: /registrar constantes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/presión diastólica es obligatoria/i);
  });
});
