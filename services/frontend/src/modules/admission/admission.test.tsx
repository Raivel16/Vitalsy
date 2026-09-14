import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const approvedOrder = {
  simulated: true,
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

  it("muestra el estado vacío, luego la orden y un error accesible si no existe", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, approvedOrder))
      .mockResolvedValueOnce(jsonResponse(404, { simulated: true, message: "No se encontró la orden." }));
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/admision/orden");

    expect(screen.getByText(/ingrese el número de orden/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/número de orden/i), "OI-2026-0001");
    await user.click(screen.getByRole("button", { name: /consultar orden/i }));

    expect(await screen.findByText(/ana maría quispe rojas/i)).toBeInTheDocument();
    expect(screen.queryByText(/simulad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/RF-\d+/)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/número de orden/i));
    await user.type(screen.getByLabelText(/número de orden/i), "OI-0000");
    await user.click(screen.getByRole("button", { name: /consultar orden/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se encontró la orden/i);
  });

  it("no envía la filiación si faltan datos y asocia el error al campo", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/admision/filiacion");

    await user.click(screen.getByRole("button", { name: /validar filiación/i }));

    const name = screen.getByLabelText(/nombre completo/i);
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/el nombre completo es obligatorio/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("muestra cobertura aprobada, pendiente o rechazada con texto y permite derivar", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(201, {
          simulated: true,
          referral: { destination: "trabajo_social", status: "derivado" },
        }),
      ),
    );
    renderApp("/admision/cobertura");

    expect(screen.getByRole("status", { name: /cobertura aprobada/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/estado de cobertura/i), "pendiente");
    expect(screen.getByRole("status", { name: /cobertura pendiente/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/estado de cobertura/i), "rechazada");
    expect(screen.getByRole("status", { name: /cobertura rechazada/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /derivar trámite/i }));
    await user.type(screen.getByLabelText(/nombre del familiar/i), "Rosa Quispe");
    await user.type(screen.getByLabelText(/teléfono del familiar/i), "999111222");
    await user.click(screen.getByRole("button", { name: /registrar derivación/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/trabajo social/i);
  });

  it("genera el brazalete, abre el expediente y exige la aceptación del consentimiento", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(201, {
            simulated: true,
            wristband: { code: "BRZ-0001-ANA", recordId: "EXP-0001" },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(201, {
            simulated: true,
            record: { recordId: "EXP-0001", status: "abierto" },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(201, {
            simulated: true,
            consent: { status: "firmado", signerName: "Rosa Quispe" },
          }),
        ),
    );

    renderApp("/admision/brazalete");
    await user.click(screen.getByRole("button", { name: /emitir brazalete/i }));
    expect(await screen.findByText("BRZ-0001-ANA")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /código de barras/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /abrir expediente/i }));
    await user.click(screen.getByRole("button", { name: /aperturar expediente/i }));
    expect(await screen.findByText(/expediente abierto/i)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /registrar consentimiento/i }));
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));
    expect(screen.getByLabelText(/acepto el consentimiento informado/i)).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText(/nombre de quien firma/i), "Rosa Quispe");
    await user.click(screen.getByLabelText(/acepto el consentimiento informado/i));
    await user.click(screen.getByRole("button", { name: /registrar consentimiento/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/firmado/i);
  });
});

describe("carga de la orden", () => {
  it("anuncia el estado de carga", async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const user = userEvent.setup();
    renderApp("/admision/orden");
    await user.type(screen.getByLabelText(/número de orden/i), "OI-2026-0001");
    await user.click(screen.getByRole("button", { name: /consultar orden/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/cargando orden/i);
    resolveFetch(jsonResponse(200, approvedOrder));
    await waitFor(() => expect(screen.getByText(/ana maría quispe rojas/i)).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
