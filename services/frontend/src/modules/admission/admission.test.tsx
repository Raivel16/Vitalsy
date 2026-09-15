import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const anaEncounter = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: null,
  patientName: "Ana María Quispe Rojas",
  documentType: "DNI",
  documentNumber: "45678912",
  originService: "Emergencia adultos",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  location: { room: null, bed: null, service: null },
  wristbandCode: null,
  recordId: null,
  subprocess: "1.1",
  subprocessLabel: "Verificación y registro administrativo",
  currentStep: "orden",
  currentStepLabel: "Consultar orden de internamiento",
  nextRole: "admision",
  statusLabel: "Orden por consultar",
  deliverables: [],
  progress: [],
};

const approvedOrder = {
  order: {
    orderNumber: "OI-2026-0001",
    originService: "Emergencia adultos",
    requestingPhysician: "Dra. Lucía Herrera",
    reason: "Neumonía adquirida en la comunidad",
    patient: {
      fullName: "Ana María Quispe Rojas",
      documentType: "DNI",
      documentNumber: "45678912",
      birthDate: "1978-04-12",
      sex: "Femenino",
    },
    coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  },
};

describe("admisión administrativa", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra la orden del paciente y un error accesible si no existe", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { encounter: anaEncounter }))
      .mockResolvedValueOnce(jsonResponse(200, approvedOrder))
      .mockResolvedValueOnce(jsonResponse(404, { message: "No se encontró la orden." }));
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/admision/orden?ingreso=ENC-0001");

    expect(await screen.findByDisplayValue("OI-2026-0001")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /consultar orden/i }));

    expect(await screen.findByRole("heading", { name: /ana maría quispe rojas/i })).toBeInTheDocument();
    expect(screen.queryByText(/simulad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/RF-\d+/)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/número de orden/i));
    await user.type(screen.getByLabelText(/número de orden/i), "OI-0000");
    await user.click(screen.getByRole("button", { name: /consultar orden/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se encontró la orden/i);
  });

  it("traduce un fallo de conexión a un mensaje en español", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter: anaEncounter }))
        .mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );
    renderApp("/admision/orden?ingreso=ENC-0001");

    await screen.findByDisplayValue("OI-2026-0001");
    await user.click(screen.getByRole("button", { name: /consultar orden/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no hay conexión con el servidor/i);
    expect(screen.queryByText(/failed to fetch/i)).not.toBeInTheDocument();
  });

  it("no envía la filiación si faltan datos y asocia el error al campo", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {
      encounter: { ...anaEncounter, currentStep: "filiacion", patientName: "", documentNumber: "" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/admision/filiacion?ingreso=ENC-0001");

    await screen.findByLabelText(/nombre completo/i);
    await user.clear(screen.getByLabelText(/nombre completo/i));
    await user.clear(screen.getByLabelText(/número de documento/i));
    await user.click(screen.getByRole("button", { name: /validar filiación/i }));

    const name = screen.getByLabelText(/nombre completo/i);
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/el nombre completo es obligatorio/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/filiation/"))).toBe(false);
  });

  it("muestra cobertura aprobada, pendiente o rechazada con texto y valida el teléfono", async () => {
    const user = userEvent.setup();
    const coverage = { ...anaEncounter, currentStep: "cobertura" };
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter: coverage }))
        .mockResolvedValueOnce(jsonResponse(200, { encounter: coverage }))
        .mockResolvedValueOnce(jsonResponse(201, {
          referral: { destination: "trabajo_social", status: "derivado", relativeName: "Rosa Quispe" },
        }))
        .mockResolvedValueOnce(jsonResponse(200, {
          encounter: { ...coverage, currentStep: "derivacion", nextRole: null, statusLabel: "En trámite de cobertura" },
        })),
    );
    renderApp("/admision/cobertura?ingreso=ENC-0001");

    expect(await screen.findByRole("status", { name: /cobertura aprobada/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/estado de cobertura/i), "pendiente");
    expect(screen.getByRole("status", { name: /cobertura pendiente/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/estado de cobertura/i), "rechazada");
    expect(screen.getByRole("status", { name: /cobertura rechazada/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /derivar trámite/i }));
    await user.type(await screen.findByLabelText(/nombre del familiar/i), "Rosa Quispe");
    await user.type(screen.getByLabelText(/teléfono del familiar/i), "abc");
    expect(screen.getByLabelText(/teléfono del familiar/i)).toHaveValue("");
    await user.click(screen.getByRole("button", { name: /registrar derivación/i }));
    expect(screen.getByText(/teléfono del familiar es obligatorio/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/teléfono del familiar/i), "999111222");
    await user.click(screen.getByRole("button", { name: /registrar derivación/i }));

    expect(await screen.findByText(/derivación registrada a trabajo social/i)).toBeInTheDocument();
  });

  it("genera el brazalete, abre el expediente y exige la aceptación del consentimiento", async () => {
    const user = userEvent.setup();
    const atWristband = { ...anaEncounter, currentStep: "brazalete", coverage: { ...anaEncounter.coverage, status: "aprobada" } };
    const atRecord = { ...atWristband, currentStep: "expediente", wristbandCode: "BRZ-0001-ANA" };
    const atConsent = { ...atRecord, currentStep: "consentimiento", recordId: "EXP-0001" };
    const atTransfer = {
      ...atConsent,
      currentStep: "traslado",
      nextRole: "celador" as const,
      statusLabel: "Listo para traslado",
      deliverables: [{ id: "consentimiento", label: "Consentimiento informado", done: true }],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, { encounter: atWristband }))
        .mockResolvedValueOnce(jsonResponse(201, { wristband: { code: "BRZ-0001-ANA", recordId: null } }))
        .mockResolvedValueOnce(jsonResponse(200, { encounter: atRecord }))
        .mockResolvedValueOnce(jsonResponse(201, { record: { recordId: "EXP-0001", status: "abierto" } }))
        .mockResolvedValueOnce(jsonResponse(200, { encounter: atConsent }))
        .mockResolvedValueOnce(jsonResponse(201, { consent: { status: "firmado", signerName: "Rosa Quispe" } }))
        .mockResolvedValueOnce(jsonResponse(200, { encounter: atTransfer })),
    );

    renderApp("/admision/brazalete?ingreso=ENC-0001");
    await user.click(await screen.findByRole("button", { name: /emitir brazalete/i }));
    expect(await screen.findByText("BRZ-0001-ANA")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /imprimir código de barras/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continuar al siguiente paso/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /continuar al siguiente paso/i }));
    expect(await screen.findByRole("button", { name: /aperturar expediente/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /aperturar expediente/i }));
    expect(await screen.findByText(/expediente abierto/i)).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /continuar al siguiente paso/i }));

    expect(await screen.findByRole("button", { name: /registrar consentimiento/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));
    expect(screen.getByLabelText(/acepto el consentimiento informado/i)).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText(/nombre de quien firma/i), "Rosa Quispe");
    await user.click(screen.getByLabelText(/acepto el consentimiento informado/i));
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));
    expect(await screen.findByText(/consentimiento firmado/i)).toBeInTheDocument();
  });
});
