import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

describe("traslado y recepción en piso", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "celador");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("muestra habitación y lecho, y rechaza un brazalete que no coincide", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, {
            simulated: true,
            transfer: {
              orderNumber: "OT-2026-0001",
              patientName: "Ana María Quispe Rojas",
              room: "312",
              bed: "B",
              service: "Medicina interna",
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(422, { simulated: true, message: "El código no corresponde al paciente." }),
        ),
    );

    renderApp("/traslado/orden");
    await user.click(screen.getByRole("button", { name: /consultar traslado/i }));
    expect(await screen.findByText(/habitación 312/i)).toBeInTheDocument();
    expect(screen.getByText(/lecho b/i)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /verificar identidad/i }));
    await user.type(screen.getByLabelText(/código del brazalete/i), "BRZ-MALO");
    await user.click(screen.getByRole("button", { name: /verificar brazalete/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no corresponde/i);
  });

  it("permite a enfermería confirmar recepción y notificar una reubicación", async () => {
    sessionStorage.setItem("vitalsy-role", "enfermeria");
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(201, { simulated: true, reception: { status: "ingresado" } }),
        )
        .mockResolvedValueOnce(
          jsonResponse(201, {
            simulated: true,
            relocation: { status: "notificada", room: "314", bed: "A" },
          }),
        ),
    );

    renderApp("/piso/recepcion");
    await user.click(screen.getByRole("button", { name: /confirmar recepción/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/ingresado/i);

    await user.click(screen.getByRole("link", { name: /registrar reubicación/i }));
    await user.type(screen.getByLabelText(/motivo de la discrepancia/i), "El lecho B está ocupado");
    await user.type(screen.getByLabelText(/habitación solicitada/i), "314");
    await user.type(screen.getByLabelText(/lecho solicitado/i), "A");
    await user.click(screen.getByRole("button", { name: /notificar reubicación/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/reubicación notificada/i);
  });
});
