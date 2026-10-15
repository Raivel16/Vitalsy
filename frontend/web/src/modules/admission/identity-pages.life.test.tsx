import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const atConsent = {
  encounterId: "ENC-0001",
  orderNumber: "OI-2026-0001",
  transferOrderNumber: null,
  patientName: "Ana María Quispe Rojas",
  documentType: "DNI",
  documentNumber: "45678912",
  originService: "Emergencia adultos",
  coverage: { payer: "SIS", status: "aprobada", plan: "SIS Gratuito" },
  location: { room: null, bed: null, service: null },
  wristbandCode: "BRZ-0001-ANA",
  recordId: "EXP-0001",
  subprocess: "1.2",
  subprocessLabel: "Consentimiento",
  currentStep: "consentimiento",
  currentStepLabel: "Firmar consentimiento",
  nextRole: "admision",
  statusLabel: "Consentimiento por firmar",
  deliverables: [],
  progress: [],
};

function stubFetch(linkResponse: () => ReturnType<typeof jsonResponse>) {
  const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/informed-consents") && init?.method === "POST") {
      return jsonResponse(201, { consent: { status: "firmado", signerName: "Rosa Quispe" } });
    }
    if (url.includes("/life-links") && init?.method === "POST") return linkResponse();
    if (url.includes("/advance")) return jsonResponse(200, { encounter: { ...atConsent, currentStep: "traslado" } });
    return jsonResponse(200, { encounter: atConsent });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function fillConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/nombre de quien firma/i), "Rosa Quispe");
  await user.click(screen.getByLabelText(/acepto el consentimiento informado/i));
}

describe("consentimiento con Vitalsy Life (RF-06, RF-95)", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("vincula el código tras firmar y muestra la línea de base importada", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse(201, {
      link: {
        status: "importada",
        importedAt: "2026-10-11T10:00:00+00:00",
        baselineSummary: { metrics: [{ kind: "heart_rate", low: 58, high: 92, days: 14 }] },
      },
    }));
    renderApp("/admision/consentimiento?ingreso=ENC-0001");
    await fillConsent(user);
    await user.click(screen.getByLabelText(/el paciente es usuario de la app vitalsy life/i));
    await user.type(screen.getByLabelText(/código o qr/i), "vl-ab12-cd34");
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));

    expect(await screen.findByText(/línea de base importada/i)).toBeInTheDocument();
    expect(screen.getByText("58–92 lpm")).toBeInTheDocument();
    const linkCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/life-links"));
    expect(JSON.parse(String(linkCall?.[1]?.body))).toEqual({ encounterId: "ENC-0001", code: "VL-AB12-CD34" });
    const consentCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/informed-consents"));
    expect(JSON.parse(String(consentCall?.[1]?.body))).toMatchObject({ lifeUser: true });
    expect(screen.queryByText(/pendiente de backend/i)).not.toBeInTheDocument();
  });

  it("si el código ya fue usado muestra el mensaje y el ingreso sigue avanzando", async () => {
    const user = userEvent.setup();
    stubFetch(() => jsonResponse(422, { message: "Code consumed", code: "code_consumed" }));
    renderApp("/admision/consentimiento?ingreso=ENC-0001");
    await fillConsent(user);
    await user.click(screen.getByLabelText(/el paciente es usuario de la app vitalsy life/i));
    await user.type(screen.getByLabelText(/código o qr/i), "VL-AB12-CD34");
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));

    expect(await screen.findByText(/este código ya fue usado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar vinculación/i })).toBeInTheDocument();
    expect(screen.getByText(/consentimiento firmado/i)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /continuar al siguiente paso/i })).toBeInTheDocument();
  });

  it("bloquea el envío si marca Life y deja el código vacío", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse(201, {}));
    renderApp("/admision/consentimiento?ingreso=ENC-0001");
    await fillConsent(user);
    await user.click(screen.getByLabelText(/el paciente es usuario de la app vitalsy life/i));
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));

    expect(screen.getByText(/ingrese o escanee el código de vitalsy life, o desmarque la opción/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/informed-consents"))).toBe(false);
  });

  it("rechaza un código con formato inválido antes de enviar", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse(201, {}));
    renderApp("/admision/consentimiento?ingreso=ENC-0001");
    await fillConsent(user);
    await user.click(screen.getByLabelText(/el paciente es usuario de la app vitalsy life/i));
    await user.type(screen.getByLabelText(/código o qr/i), "ABC");
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));

    expect(screen.getByLabelText(/código o qr/i)).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/informed-consents"))).toBe(false);
  });

  async function failedLink(response: () => ReturnType<typeof jsonResponse>) {
    const user = userEvent.setup();
    stubFetch(response);
    renderApp("/admision/consentimiento?ingreso=ENC-0001");
    await fillConsent(user);
    await user.click(screen.getByLabelText(/el paciente es usuario de la app vitalsy life/i));
    await user.type(screen.getByLabelText(/código o qr/i), "VL-AB12-CD34");
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));
    return user;
  }

  it("traduce el 429 del límite de intentos y el ingreso continúa", async () => {
    await failedLink(() => jsonResponse(429, { message: "Too Many Attempts." }));
    expect(await screen.findByText(/demasiados intentos\. espere un minuto/i)).toBeInTheDocument();
    expect(screen.queryByText(/too many attempts/i)).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /continuar al siguiente paso/i })).toBeInTheDocument();
  });

  it("usa un mensaje genérico en español para un código de error no mapeado", async () => {
    await failedLink(() => jsonResponse(422, { message: "Something odd happened", code: "weird_code" }));
    expect(await screen.findByText(/no se pudo vincular vitalsy life\. intente de nuevo/i)).toBeInTheDocument();
    expect(screen.queryByText(/something odd/i)).not.toBeInTheDocument();
  });

  it("ante un fallo de conexión muestra el aviso y permite reintentar", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/informed-consents") && init?.method === "POST") {
        return jsonResponse(201, { consent: { status: "firmado" } });
      }
      if (url.includes("/life-links")) throw new TypeError("Failed to fetch");
      if (url.includes("/advance")) return jsonResponse(200, { encounter: { ...atConsent, currentStep: "traslado" } });
      return jsonResponse(200, { encounter: atConsent });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/admision/consentimiento?ingreso=ENC-0001");
    await fillConsent(user);
    await user.click(screen.getByLabelText(/el paciente es usuario de la app vitalsy life/i));
    await user.type(screen.getByLabelText(/código o qr/i), "VL-AB12-CD34");
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));
    expect(await screen.findByText(/no hay conexión con el servidor/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar vinculación/i })).toBeInTheDocument();
  });

  it("al reintentar revalida el código actual antes de enviar", async () => {
    const user = await failedLink(() => jsonResponse(422, { message: "x", code: "code_expired" }));
    await screen.findByRole("button", { name: /reintentar vinculación/i });
    const field = screen.getByLabelText(/código o qr/i);
    await user.clear(field);
    await user.type(field, "ABC");
    const fetchFn = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const before = fetchFn.mock.calls.length;
    await user.click(screen.getByRole("button", { name: /reintentar vinculación/i }));
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(fetchFn.mock.calls.length).toBe(before);
  });

  it("limpia el estado de vinculación al desmarcar la opción", async () => {
    const user = await failedLink(() => jsonResponse(422, { message: "x", code: "code_expired" }));
    expect(await screen.findByText(/el código venció/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/el paciente es usuario de la app vitalsy life/i));
    expect(screen.queryByText(/el código venció/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reintentar vinculación/i })).not.toBeInTheDocument();
  });
});
